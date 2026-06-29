import { ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { assertCanAccessBuilding, assertCanAccessQuestionnaire, canAccessBuilding } from '../common/access-scope'
import { IdentityVaultService } from '../identity-vault/identity-vault.service'
import { MailQueueService } from '../mail/mail-queue.service'
import { PrismaService } from '../prisma/prisma.service'
import type { UpsertNotificationSubscriptionDto } from './dto/upsert-notification-subscription.dto'

type SubmissionNotificationInput = {
  submissionId: string
  invitationId: string
  publicCode: string
  questionnaireVersionId: string
  buildingId: string
  answerCount: number
  submittedAt: Date
}

type DigestRunOptions = {
  dryRun?: boolean
  now?: Date
}

type QueuedDigestMetadata = {
  subscriptionId?: string
  recipientUserId?: string
  channel?: string
  frequency?: string
  submittedAt?: string
}

const notificationEventPolicy: Record<string, string[]> = {
  submission_received: ['admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo'],
  difficult_question: ['admin', 'questionnaire_admin', 'analyst', 'dpo'],
  invitation_expired: ['admin', 'moderator', 'site_manager', 'dpo'],
  campaign_finished: ['admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo'],
  double_submission_attempt: ['admin', 'technical_admin', 'dpo'],
  judicial_access_executed: ['admin', 'dpo', 'judicial_officer', 'technical_admin'],
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly identityVaultService: IdentityVaultService,
    private readonly mailQueue: MailQueueService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const workerEnabled = this.config.get<string>('ENABLE_NOTIFICATION_DIGEST_WORKER', 'true') !== 'false'

    if (!workerEnabled) {
      return
    }

    const intervalMs = Math.max(Number(this.config.get<string>('NOTIFICATION_DIGEST_WORKER_INTERVAL_MS', String(60 * 60 * 1000))), 60_000)
    const timer = setInterval(() => {
      this.processDueDailyDigests().catch((error: unknown) => {
        this.logger.error('Échec du traitement des notifications quotidiennes', error instanceof Error ? error.stack : String(error))
      })
    }, intervalMs)

    timer.unref?.()
  }

  async list(user: AuthenticatedUser) {
    return this.prisma.notificationSubscription.findMany({
      where: { userId: user.id },
      orderBy: [{ eventType: 'asc' }, { createdAt: 'desc' }],
      include: {
        questionnaireVersion: {
          select: {
            id: true,
            versionLabel: true,
            questionnaire: {
              select: { id: true, title: true, code: true },
            },
          },
        },
      },
    })
  }

  async upsert(user: AuthenticatedUser, dto: UpsertNotificationSubscriptionDto, request: Request) {
    const normalizedDto = await this.normalizeAndAssertScope(user, dto)
    const existing = await this.prisma.notificationSubscription.findFirst({
      where: {
        userId: user.id,
        eventType: normalizedDto.eventType,
        questionnaireVersionId: normalizedDto.questionnaireVersionId ?? null,
        buildingId: normalizedDto.buildingId ?? null,
      },
    })

    const frequency = normalizedDto.frequency ?? 'immediate'
    const data = {
      channel: normalizedDto.channel ?? 'email',
      isEnabled: frequency === 'none' ? false : (normalizedDto.isEnabled ?? true),
      frequency,
      digestHour: normalizedDto.digestHour ?? 8,
    }

    const subscription = existing
      ? await this.prisma.notificationSubscription.update({
          where: { id: existing.id },
          data,
          include: {
            questionnaireVersion: {
              select: {
                id: true,
                versionLabel: true,
                questionnaire: { select: { id: true, title: true, code: true } },
              },
            },
          },
        })
      : await this.prisma.notificationSubscription.create({
          data: {
            userId: user.id,
            eventType: normalizedDto.eventType,
            questionnaireVersionId: normalizedDto.questionnaireVersionId,
            buildingId: normalizedDto.buildingId,
            ...data,
          },
          include: {
            questionnaireVersion: {
              select: {
                id: true,
                versionLabel: true,
                questionnaire: { select: { id: true, title: true, code: true } },
              },
            },
          },
        })

    await this.auditService.log({
      actor: user,
      action: existing ? 'notification_subscription.update' : 'notification_subscription.create',
      entityType: 'NotificationSubscription',
      entityId: subscription.id,
      request,
      metadata: {
        eventType: subscription.eventType,
        channel: subscription.channel,
        frequency: subscription.frequency,
        digestHour: subscription.digestHour,
        isEnabled: subscription.isEnabled,
        questionnaireVersionId: subscription.questionnaireVersionId,
        buildingId: subscription.buildingId,
        scopedByBackend: true,
      },
    })

    return subscription
  }

  async notifySubmissionReceived(input: SubmissionNotificationInput): Promise<void> {
    const subscriptions = await this.prisma.notificationSubscription.findMany({
      where: {
        isEnabled: true,
        eventType: 'submission_received',
        OR: [
          { questionnaireVersionId: null },
          { questionnaireVersionId: input.questionnaireVersionId },
        ],
        AND: [
          {
            OR: [
              { buildingId: null },
              { buildingId: input.buildingId },
            ],
          },
        ],
      },
      include: {
        user: true,
      },
    })

    const building = await this.prisma.building.findUnique({ where: { id: input.buildingId } })
    const now = new Date()

    for (const subscription of subscriptions) {
      if (!building || !canAccessBuilding(subscription.user as AuthenticatedUser, building)) {
        continue
      }

      const daily = subscription.frequency === 'daily'
      const emailChannel = subscription.channel === 'email' || subscription.channel === 'simulation'
      const auditAction = daily ? 'notification.digest_queued' : 'notification.submission_queued'
      const emailJobId = !daily && emailChannel
        ? this.mailQueue.enqueue({
            template: 'submission_notification',
            to: { email: subscription.user.email, name: subscription.user.displayName },
            subject: 'Nouvelle soumission questionnaire CHPM',
            text: [
              'Bonjour,',
              'Une nouvelle soumission pseudonymisée a été reçue.',
              `Code opérationnel : ${input.publicCode}.`,
              `Nombre de réponses : ${input.answerCount}.`,
              'Aucun email répondant n’est inclus dans cette notification.',
            ].join('\n'),
            metadata: {
              subscriptionId: subscription.id,
              recipientUserId: subscription.userId,
              publicCode: input.publicCode,
              submissionId: input.submissionId,
            },
          })
        : null

      await this.prisma.auditLog.create({
        data: {
          actorUserId: subscription.userId,
          action: auditAction,
          entityType: 'NotificationSubscription',
          entityId: subscription.id,
          publicCode: input.publicCode,
          metadata: {
            channel: subscription.channel,
            frequency: subscription.frequency,
            recipientRole: subscription.user.role,
            submissionId: input.submissionId,
            answerCount: input.answerCount,
            queuedEmail: Boolean(emailJobId),
            jobId: emailJobId,
            digestHour: subscription.digestHour,
          },
          occurredAt: now,
        },
      })

      await this.identityVaultService.recordDeliveryEvent({
        invitationId: input.invitationId,
        publicCode: input.publicCode,
        eventType: daily ? 'notification_digest_queued' : 'notification_submission_queued',
        metadata: {
          subscriptionId: subscription.id,
          recipientUserId: subscription.userId,
          channel: subscription.channel,
          frequency: subscription.frequency,
          submittedAt: input.submittedAt.toISOString(),
          queuedAt: now.toISOString(),
          jobId: emailJobId ?? undefined,
        },
      })

      if (!daily) {
        await this.prisma.notificationSubscription.update({
          where: { id: subscription.id },
          data: { lastDeliveredAt: now },
        })
      }
    }
  }

  async processDueDailyDigests(options: DigestRunOptions = {}) {
    const now = options.now ?? new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const dueSubscriptions = await this.prisma.notificationSubscription.findMany({
      where: {
        isEnabled: true,
        frequency: 'daily',
        digestHour: { lte: now.getHours() },
        OR: [
          { lastDeliveredAt: null },
          { lastDeliveredAt: { lt: startOfToday } },
        ],
      },
      include: { user: true },
      orderBy: [{ digestHour: 'asc' }, { createdAt: 'asc' }],
    })

    const delivered: Array<{ subscriptionId: string; recipientUserId: string; queuedEventCount: number; publicCodes: string[] }> = []

    for (const subscription of dueSubscriptions) {
      const since = subscription.lastDeliveredAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const queuedEvents = await this.identityVaultService.listDeliveryEventsForDigest(since, now)

      const matchingEvents = queuedEvents.filter((event: any) => {
        const metadata = event.metadata as QueuedDigestMetadata | null
        return metadata?.subscriptionId === subscription.id
      })

      if (!matchingEvents.length) {
        await this.prisma.notificationSubscription.update({
          where: { id: subscription.id },
          data: { lastDeliveredAt: now },
        })
        continue
      }

      const publicCodes: string[] = Array.from(new Set<string>(matchingEvents.map((event: any) => event.publicCode).filter((code: unknown): code is string => typeof code === 'string')))
      delivered.push({
        subscriptionId: subscription.id,
        recipientUserId: subscription.userId,
        queuedEventCount: matchingEvents.length,
        publicCodes,
      })

      if (options.dryRun) {
        continue
      }

      const emailJobId = subscription.channel === 'email' || subscription.channel === 'simulation'
        ? this.mailQueue.enqueue({
            template: 'daily_digest',
            to: { email: subscription.user.email, name: subscription.user.displayName },
            subject: 'Résumé quotidien CHPM — soumissions questionnaires',
            text: [
              'Bonjour,',
              `${matchingEvents.length} événement(s) questionnaire nécessitent votre attention.`,
              `Codes pseudonymisés : ${publicCodes.join(', ')}.`,
              'Aucun email répondant n’est inclus dans ce résumé.',
            ].join('\n'),
            metadata: {
              subscriptionId: subscription.id,
              recipientUserId: subscription.userId,
              queuedEventCount: matchingEvents.length,
              publicCodes: publicCodes.join(','),
            },
          })
        : null

      await this.prisma.auditLog.create({
        data: {
          actorUserId: subscription.userId,
          action: 'notification.digest_sent',
          entityType: 'NotificationSubscription',
          entityId: subscription.id,
          metadata: {
            channel: subscription.channel,
            frequency: subscription.frequency,
            recipientRole: subscription.user.role,
            queuedEmail: Boolean(emailJobId),
            jobId: emailJobId,
            queuedEventCount: matchingEvents.length,
            publicCodes,
            deliveredAt: now.toISOString(),
          },
          occurredAt: now,
        },
      })

      await this.prisma.notificationSubscription.update({
        where: { id: subscription.id },
        data: { lastDeliveredAt: now },
      })
    }

    return {
      processedAt: now.toISOString(),
      dueSubscriptionCount: dueSubscriptions.length,
      deliveredDigestCount: delivered.length,
      dryRun: options.dryRun ?? false,
      delivered,
    }
  }


  async notifySubmissionConfirmation(input: SubmissionNotificationInput): Promise<void> {
    const identity = await this.identityVaultService.loadOutboundEmailForInvitation(input.invitationId)
    if (!identity) {
      return
    }

    const jobId = this.mailQueue.enqueue({
      template: 'submission_confirmation',
      to: { email: identity.email },
      subject: 'Confirmation de réception de votre questionnaire',
      text: [
        'Bonjour,',
        'Votre questionnaire a bien été soumis et verrouillé.',
        `Code opérationnel : ${input.publicCode}.`,
        'Vous ne pouvez plus modifier vos réponses après cette confirmation.',
        'Les traitements statistiques utilisent ce code pseudonymisé, pas votre adresse email.',
      ].join('\n'),
      invitationId: input.invitationId,
      publicCode: input.publicCode,
      metadata: {
        submissionId: input.submissionId,
        questionnaireVersionId: input.questionnaireVersionId,
        submittedAt: input.submittedAt.toISOString(),
      },
    })

    await this.identityVaultService.recordDeliveryEvent({
      invitationId: input.invitationId,
      publicCode: input.publicCode,
      eventType: 'submission_confirmation_queued',
      metadata: { jobId },
    })
  }

  private async normalizeAndAssertScope(user: AuthenticatedUser, dto: UpsertNotificationSubscriptionDto): Promise<UpsertNotificationSubscriptionDto> {
    const allowedRoles = notificationEventPolicy[dto.eventType] ?? []
    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Ce rôle ne peut pas configurer ce type de notification')
    }

    const normalized: UpsertNotificationSubscriptionDto = { ...dto }

    if (normalized.channel === 'simulation' && this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('Le canal simulation est interdit en production')
    }

    if (user.role === 'moderator') {
      if (!user.buildingId) {
        throw new ForbiddenException('Le modérateur doit être rattaché à un bâtiment')
      }
      normalized.buildingId = user.buildingId
    }

    if (normalized.buildingId) {
      const building = await this.prisma.building.findUnique({ where: { id: normalized.buildingId } })
      if (!building) {
        throw new NotFoundException('Bâtiment introuvable')
      }
      assertCanAccessBuilding(user, building)
    }

    if (normalized.questionnaireVersionId) {
      const version = await this.prisma.questionnaireVersion.findUnique({
        where: { id: normalized.questionnaireVersionId },
        include: { questionnaire: true },
      })
      if (!version) {
        throw new NotFoundException('Version de questionnaire introuvable')
      }
      if (user.role === 'moderator' || user.role === 'site_manager') {
        if (version.status !== 'published') {
          throw new ForbiddenException('Seules les versions publiées peuvent être suivies par ce rôle')
        }
        if (user.organizationId && version.questionnaire.organizationId && user.organizationId !== version.questionnaire.organizationId) {
          throw new ForbiddenException('Version de questionnaire hors périmètre organisationnel')
        }
      } else {
        assertCanAccessQuestionnaire(user, version.questionnaire)
      }
    }

    return normalized
  }
}
