import { Injectable } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
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

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

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
    const existing = await this.prisma.notificationSubscription.findFirst({
      where: {
        userId: user.id,
        eventType: dto.eventType,
        questionnaireVersionId: dto.questionnaireVersionId ?? null,
        buildingId: dto.buildingId ?? null,
      },
    })

    const data = {
      channel: dto.channel ?? 'email',
      isEnabled: dto.isEnabled ?? true,
      frequency: dto.frequency ?? 'immediate',
      digestHour: dto.digestHour ?? 8,
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
            eventType: dto.eventType,
            questionnaireVersionId: dto.questionnaireVersionId,
            buildingId: dto.buildingId,
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

    const now = new Date()
    for (const subscription of subscriptions) {
      const auditAction = subscription.frequency === 'daily'
        ? 'notification.digest_queued'
        : 'notification.submission_sent'

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
            simulated: true,
            digestHour: subscription.digestHour,
          },
          occurredAt: now,
        },
      })

      await this.prisma.emailDeliveryEvent.create({
        data: {
          invitationId: input.invitationId,
          publicCode: input.publicCode,
          eventType: subscription.frequency === 'daily' ? 'notification_digest_queued' : 'notification_submission_simulated',
          metadata: {
            subscriptionId: subscription.id,
            recipientUserId: subscription.userId,
            channel: subscription.channel,
            frequency: subscription.frequency,
            submittedAt: input.submittedAt.toISOString(),
          },
          occurredAt: now,
        },
      })

      await this.prisma.notificationSubscription.update({
        where: { id: subscription.id },
        data: { lastDeliveredAt: now },
      })
    }
  }
}
