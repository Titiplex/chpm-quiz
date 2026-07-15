import { createHash, randomBytes } from 'node:crypto'

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { assertCanAccessBuilding, assertCanAccessVersion } from '../common/access-scope'
import { AccessTokenService } from '../security/access-token.service'
import { IdentityVaultService } from '../identity-vault/identity-vault.service'
import { MailQueueService } from '../mail/mail-queue.service'
import { PrismaService } from '../prisma/prisma.service'
import { SmsQueueService } from '../sms/sms-queue.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'
import { RegisterTerminalDeviceDto } from './dto/register-terminal-device.dto'
import { SubmitPaperResponsesDto } from './dto/submit-paper-responses.dto'

const activeInvitationStatuses = ['sent', 'opened', 'in_progress', 'draft'] as const
const validTerminalStatuses = ['active'] as const

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokenService: AccessTokenService,
    private readonly identityVaultService: IdentityVaultService,
    private readonly mailQueue: MailQueueService,
    private readonly smsQueue: SmsQueueService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async listForUser(user: AuthenticatedUser) {
    await this.expireOverdueInvitationsForScope(user)

    const invitations = await this.prisma.invitation.findMany({
      where: this.scopedWhere(user),
      orderBy: { createdAt: 'desc' },
      include: this.invitationInclude(),
      take: 200,
    })

    return invitations.map((invitation: any) => this.toInvitationDto(invitation))
  }

  async listTerminalDevices(user: AuthenticatedUser) {
    const terminalDevices = await this.prisma.terminalDevice.findMany({
      where: this.scopedWhere(user),
      orderBy: { label: 'asc' },
      include: {
        building: true,
        invitations: {
          where: {
            deliveryMode: 'onsite_terminal',
            status: { in: [...activeInvitationStatuses] },
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        },
      },
    })

    return terminalDevices.map((device: any) => this.toTerminalDeviceDto(device))
  }

  async registerTerminalDevice(user: AuthenticatedUser, dto: RegisterTerminalDeviceDto, request: Request) {
    await this.assertBuildingScope(user, dto.buildingId)

    const building = await this.prisma.building.findUnique({ where: { id: dto.buildingId } })
    if (!building) {
      throw new NotFoundException('Bâtiment introuvable')
    }

    assertCanAccessBuilding(user, building)

    const code = await this.generateUniqueTerminalCode()
    const { token, tokenHash } = this.accessTokenService.create(code)

    const terminalDevice = await this.prisma.terminalDevice.create({
      data: {
        organizationId: building.organizationId,
        siteId: building.siteId,
        buildingId: building.id,
        createdByUserId: user.id,
        code,
        label: dto.label.trim(),
        accessTokenHash: tokenHash,
        status: 'active',
      },
      include: {
        building: true,
        invitations: {
          where: {
            deliveryMode: 'onsite_terminal',
            status: { in: [...activeInvitationStatuses] },
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        },
      },
    })

    await this.auditService.log({
      actor: user,
      action: 'terminal_device.register',
      entityType: 'TerminalDevice',
      entityId: terminalDevice.id,
      request,
      metadata: { buildingId: building.id, code },
    })

    return {
      terminalDevice: this.toTerminalDeviceDto(terminalDevice),
      terminalAccessToken: token,
      terminalLaunchLink: this.terminalLink(token),
    }
  }

  async create(user: AuthenticatedUser, dto: CreateInvitationDto, request: Request) {
    await this.assertBuildingScope(user, dto.buildingId)

    const questionnaireVersion = await this.prisma.questionnaireVersion.findUnique({
      where: { id: dto.questionnaireVersionId },
      include: { questionnaire: true },
    })

    if (!questionnaireVersion || questionnaireVersion.status !== 'published') {
      throw new BadRequestException('Le questionnaire choisi n’est pas publié')
    }

    assertCanAccessVersion(user, questionnaireVersion)

    if (questionnaireVersion.openUntil && questionnaireVersion.openUntil < new Date()) {
      throw new BadRequestException('La période d’ouverture du questionnaire est terminée')
    }

    const building = await this.prisma.building.findUnique({ where: { id: dto.buildingId } })

    if (!building) {
      throw new NotFoundException('Bâtiment introuvable')
    }

    assertCanAccessBuilding(user, building)

    const deliveryMode = this.resolveDeliveryMode(dto.deliveryMode)
    const assistanceMode = dto.assistanceMode ?? 'none'
    const publicCode = await this.generateUniquePublicCode()
    const { token, tokenHash } = this.accessTokenService.create(publicCode)
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : this.defaultExpiry(deliveryMode)

    if (deliveryMode === 'onsite_terminal') {
      if (!dto.terminalDeviceId) {
        throw new BadRequestException('Un terminal hospitalier doit être sélectionné')
      }

      const terminalDevice = await this.prisma.terminalDevice.findFirst({
        where: {
          id: dto.terminalDeviceId,
          buildingId: dto.buildingId,
          status: { in: [...validTerminalStatuses] },
        },
        include: { building: true },
      })

      if (!terminalDevice) {
        throw new BadRequestException('Terminal introuvable, inactif ou hors du bâtiment sélectionné')
      }

      const invitation = await this.prisma.invitation.create({
        data: {
          questionnaireVersionId: dto.questionnaireVersionId,
          buildingId: dto.buildingId,
          siteId: building.siteId,
          createdByUserId: user.id,
          publicCode,
          tokenHash,
          status: 'sent',
          deliveryMode,
          terminalDeviceId: terminalDevice.id,
          terminalDispatchedAt: new Date(),
          assistanceMode,
          notifyModerator: dto.notifyModerator ?? false,
          notifyAdmins: dto.notifyAdmins ?? false,
          expiresAt,
          sentAt: new Date(),
        },
        include: this.invitationInclude(),
      })

      await this.identityVaultService.recordDeliveryEvent({
        invitationId: invitation.id,
        publicCode,
        eventType: 'terminal_invitation_assigned',
        metadata: {
          terminalDeviceId: terminalDevice.id,
          terminalCode: terminalDevice.code,
          note: 'Invitation attribuée à un terminal hospitalier enregistré',
        },
      })

      await this.auditService.log({
        actor: user,
        action: 'invitation.create.onsite_terminal',
        entityType: 'Invitation',
        entityId: invitation.id,
        publicCode,
        request,
        metadata: {
          questionnaireVersionId: dto.questionnaireVersionId,
          buildingId: dto.buildingId,
          terminalDeviceId: terminalDevice.id,
          assistanceMode,
        },
      })

      return {
        invitation: this.toInvitationDto(invitation),
        accessToken: null,
        devAccessLink: null,
        terminalDispatchLink: null,
      }
    }

    if (deliveryMode === 'paper_form' || deliveryMode === 'refusal_record') {
      const isRefusal = deliveryMode === 'refusal_record'
      const invitation = await this.prisma.invitation.create({
        data: {
          questionnaireVersionId: dto.questionnaireVersionId,
          buildingId: dto.buildingId,
          siteId: building.siteId,
          createdByUserId: user.id,
          publicCode,
          tokenHash,
          status: isRefusal ? 'cancelled' : 'sent',
          deliveryMode,
          assistanceMode,
          notifyModerator: dto.notifyModerator ?? false,
          notifyAdmins: dto.notifyAdmins ?? false,
          expiresAt,
          sentAt: isRefusal ? null : new Date(),
          cancelledAt: isRefusal ? new Date() : null,
        },
        include: this.invitationInclude(),
      })

      await this.identityVaultService.recordDeliveryEvent({
        invitationId: invitation.id,
        publicCode,
        eventType: isRefusal ? 'participation_refusal_recorded' : 'paper_form_recorded',
        metadata: {
          note: isRefusal
            ? 'Refus de répondre déclaré par le modérateur avant collecte de contact numérique'
            : 'Passation papier déclarée par le modérateur pour une personne sans contact numérique',
          questionnaireVersionId: dto.questionnaireVersionId,
          buildingId: dto.buildingId,
          refusalReason: isRefusal ? dto.refusalReason?.trim() || undefined : undefined,
        },
      })

      await this.auditService.log({
        actor: user,
        action: isRefusal ? 'participation.refusal.record' : 'invitation.create.paper_form',
        entityType: 'Invitation',
        entityId: invitation.id,
        publicCode,
        request,
        metadata: {
          questionnaireVersionId: dto.questionnaireVersionId,
          buildingId: dto.buildingId,
          deliveryMode,
          refusalReason: isRefusal ? dto.refusalReason?.trim() || undefined : undefined,
        },
      })

      return {
        invitation: this.toInvitationDto(invitation),
        accessToken: null,
        devAccessLink: null,
        terminalDispatchLink: null,
      }
    }

    const isSms = deliveryMode === 'sms' || deliveryMode === 'sms_simulation'
    const isEmail = deliveryMode === 'email' || deliveryMode === 'email_simulation'

    if (isEmail && !dto.email) {
      throw new BadRequestException('Une adresse email est requise pour ce mode d’envoi')
    }

    if (isSms && !dto.phone) {
      throw new BadRequestException('Un numéro de téléphone est requis pour ce mode d’envoi')
    }

    const duplicate = isSms
      ? await this.identityVaultService.hasExistingIdentityForPhone(dto.questionnaireVersionId, dto.phone!)
      : await this.identityVaultService.hasExistingIdentityForEmail(dto.questionnaireVersionId, dto.email!)

    if (duplicate) {
      throw new BadRequestException(isSms
        ? 'Une invitation active existe déjà pour ce téléphone et cette version'
        : 'Une invitation active existe déjà pour cet email et cette version')
    }

    const invitation = await this.prisma.invitation.create({
        data: {
          questionnaireVersionId: dto.questionnaireVersionId,
          buildingId: dto.buildingId,
          siteId: building.siteId,
          createdByUserId: user.id,
          publicCode,
          tokenHash,
          status: 'sent',
          deliveryMode,
          assistanceMode,
          notifyModerator: dto.notifyModerator ?? false,
          notifyAdmins: dto.notifyAdmins ?? false,
          expiresAt,
          sentAt: new Date(),
        },
      include: this.invitationInclude(),
    })

    try {
      if (isSms) {
        await this.identityVaultService.createPhoneIdentity({
          invitationId: invitation.id,
          publicCode,
          phone: dto.phone!,
          questionnaireVersionId: dto.questionnaireVersionId,
          buildingId: dto.buildingId,
          createdByUserId: user.id,
          request,
        })

        const smsJobId = this.smsQueue.enqueue(this.buildInvitationSms({
          invitation,
          recipientPhone: dto.phone!,
          token,
          template: 'invitation',
        }))

        await this.identityVaultService.recordDeliveryEvent({
          invitationId: invitation.id,
          publicCode,
          eventType: deliveryMode === 'sms' ? 'invitation_sms_queued' : 'dev_invitation_sms_queued',
          metadata: {
            note: deliveryMode === 'sms' ? 'Invitation transmise à la queue SMS' : 'Invitation SMS simulée en développement',
            jobId: smsJobId,
          },
        })
      } else {
        await this.identityVaultService.createEmailIdentity({
          invitationId: invitation.id,
          publicCode,
          email: dto.email!,
          questionnaireVersionId: dto.questionnaireVersionId,
          buildingId: dto.buildingId,
          createdByUserId: user.id,
          request,
        })

        const emailJobId = this.mailQueue.enqueue(this.buildInvitationMail({
          invitation,
          recipientEmail: dto.email!,
          token,
          template: 'invitation',
        }))

        await this.identityVaultService.recordDeliveryEvent({
          invitationId: invitation.id,
          publicCode,
          eventType: deliveryMode === 'email' ? 'invitation_email_queued' : 'dev_invitation_email_queued',
          metadata: {
            note: deliveryMode === 'email' ? 'Invitation transmise à la queue email' : 'Invitation email simulée en développement',
            jobId: emailJobId,
          },
        })
      }
    } catch (error) {
      await this.prisma.invitation.delete({ where: { id: invitation.id } }).catch(() => undefined)
      throw error
    }

    await this.auditService.log({
      actor: user,
      action: 'invitation.create',
      entityType: 'Invitation',
      entityId: invitation.id,
      publicCode,
      request,
      metadata: {
        questionnaireVersionId: dto.questionnaireVersionId,
        buildingId: dto.buildingId,
        deliveryMode,
        notifyModerator: dto.notifyModerator ?? false,
        notifyAdmins: dto.notifyAdmins ?? false,
      },
    })

    const hydratedInvitation = await this.prisma.invitation.findUnique({
      where: { id: invitation.id },
      include: this.invitationInclude(),
    })

    return {
      invitation: this.toInvitationDto(hydratedInvitation ?? invitation),
      accessToken: this.canExposeRespondentToken() ? token : null,
      devAccessLink: this.canExposeRespondentToken() ? this.respondentLink(token) : null,
      terminalDispatchLink: null,
    }
  }


  async submitPaperResponses(user: AuthenticatedUser, invitationId: string, dto: SubmitPaperResponsesDto, request: Request) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, ...this.scopedWhere(user) },
      include: this.paperEntryInvitationInclude(),
    })

    if (!invitation) {
      throw new NotFoundException('Invitation papier introuvable')
    }

    if (invitation.deliveryMode !== 'paper_form') {
      throw new BadRequestException('La saisie manuelle est réservée aux versions papier')
    }

    if (['submitted', 'cancelled', 'blocked', 'expired'].includes(invitation.status)) {
      throw new BadRequestException('Cette invitation papier ne peut plus être saisie')
    }

    if (invitation.responseSession?.submission) {
      throw new BadRequestException('Cette saisie papier est déjà verrouillée')
    }

    assertCanAccessBuilding(user, invitation.building)
    assertCanAccessVersion(user, invitation.questionnaireVersion)

    const questions = this.paperEntryQuestions(invitation.questionnaireVersion)
    const questionById = new Map(questions.map((question: any): [string, any] => [question.id, question]))
    const answerQuestionIds = new Set(dto.answers.map((answer) => answer.questionId))

    for (const answer of dto.answers) {
      const question = questionById.get(answer.questionId)
      if (!question) {
        throw new BadRequestException('Une réponse papier cible une question inconnue')
      }
      this.validatePaperAnswer(question, answer.value)
    }

    const missingRequired = questions.filter((question: any) =>
      question.isRequired && question.responseType !== 'information' && !answerQuestionIds.has(question.id),
    )

    if (missingRequired.length) {
      throw new BadRequestException(`Soumission papier impossible : ${missingRequired.length} question(s) obligatoire(s) sans réponse`)
    }

    const submittedAt = new Date()
    const pathQuestionIds = questions.map((question: any) => question.id)
    const pathFingerprint = this.paperPathFingerprint(invitation.publicCode, pathQuestionIds)
    const warnings: Array<{ questionId: string; reason: string | null }> = []

    const result = await this.prisma.$transaction(async (tx: any) => {
      const responseSession = invitation.responseSession ?? await tx.responseSession.create({
        data: {
          invitationId: invitation.id,
          publicCode: invitation.publicCode,
          questionnaireVersionId: invitation.questionnaireVersionId,
          buildingId: invitation.buildingId,
          assistanceMode: 'full_assisted_entry',
          assistedByUserId: user.id,
          assistanceDeclaredAt: submittedAt,
          randomizationSeed: randomBytes(16).toString('hex'),
          status: 'draft',
          currentPage: 1,
          pathFingerprint,
          startedAt: submittedAt,
          lastSeenAt: submittedAt,
        },
      })

      for (const answer of dto.answers) {
        const warning = this.detectPaperIdentifyingData(answer.value)
        const saved = await tx.answer.upsert({
          where: {
            responseSessionId_questionId: {
              responseSessionId: responseSession.id,
              questionId: answer.questionId,
            },
          },
          update: {
            value: answer.value as any,
            isDraft: false,
            identifiabilityWarning: Boolean(warning),
            warningReason: warning,
          },
          create: {
            responseSessionId: responseSession.id,
            questionId: answer.questionId,
            value: answer.value as any,
            isDraft: false,
            identifiabilityWarning: Boolean(warning),
            warningReason: warning,
          },
        })

        if (saved.identifiabilityWarning) {
          warnings.push({ questionId: saved.questionId, reason: saved.warningReason ?? null })
        }
      }

      await tx.responseSession.update({
        where: { id: responseSession.id },
        data: {
          assistanceMode: 'full_assisted_entry',
          assistedByUserId: user.id,
          assistanceDeclaredAt: submittedAt,
          status: 'locked',
          currentPage: Math.max(1, invitation.questionnaireVersion.groups.length),
          lastSeenAt: submittedAt,
          submittedAt,
          lockedAt: submittedAt,
          pathFingerprint,
        },
      })

      const answerCount = await tx.answer.count({ where: { responseSessionId: responseSession.id } })

      const submission = await tx.submission.create({
        data: {
          responseSessionId: responseSession.id,
          publicCode: invitation.publicCode,
          questionnaireVersionId: invitation.questionnaireVersionId,
          buildingId: invitation.buildingId,
          submittedAt,
          answerCount,
          pathFingerprint,
        },
      })

      const updatedInvitation = await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'submitted',
          startedAt: invitation.startedAt ?? submittedAt,
          submittedAt,
          assistanceMode: 'full_assisted_entry',
        },
        include: this.invitationInclude(),
      })

      return { submission, updatedInvitation }
    })

    await this.identityVaultService.recordDeliveryEvent({
      invitationId: invitation.id,
      publicCode: invitation.publicCode,
      eventType: 'paper_form_entered_by_moderator',
      metadata: {
        questionnaireVersionId: invitation.questionnaireVersionId,
        buildingId: invitation.buildingId,
        answerCount: result.submission.answerCount,
        moderatorNote: dto.moderatorNote?.trim() || undefined,
      },
    })

    await this.auditService.log({
      actor: user,
      action: 'response.paper_entry.submit',
      entityType: 'Submission',
      entityId: result.submission.id,
      publicCode: invitation.publicCode,
      request,
      metadata: {
        questionnaireVersionId: invitation.questionnaireVersionId,
        buildingId: invitation.buildingId,
        answerCount: result.submission.answerCount,
        pathFingerprint,
        moderatorNote: dto.moderatorNote?.trim() || undefined,
      },
    })

    return {
      invitation: this.toInvitationDto(result.updatedInvitation),
      submission: {
        id: result.submission.id,
        publicCode: result.submission.publicCode,
        submittedAt: result.submission.submittedAt,
        answerCount: result.submission.answerCount,
      },
      warnings,
    }
  }

  async resend(user: AuthenticatedUser, invitationId: string, request: Request) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        ...this.scopedWhere(user),
      },
      include: this.invitationInclude(),
    })

    if (!invitation) {
      throw new NotFoundException('Invitation introuvable dans votre périmètre')
    }

    if (invitation.status === 'submitted' || invitation.status === 'cancelled' || invitation.status === 'blocked') {
      throw new BadRequestException('Cette invitation ne peut pas être relancée')
    }

    if (invitation.deliveryMode === 'paper_form' || invitation.deliveryMode === 'refusal_record') {
      throw new BadRequestException('Les lignes papier et les refus ne peuvent pas être relancés')
    }

    const isTerminal = invitation.deliveryMode === 'onsite_terminal'
    const isSms = invitation.deliveryMode === 'sms' || invitation.deliveryMode === 'sms_simulation'
    const refreshedToken = isTerminal ? null : this.accessTokenService.create(invitation.publicCode)
    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        ...(refreshedToken ? { tokenHash: refreshedToken.tokenHash } : {}),
        terminalDispatchedAt: isTerminal ? new Date() : invitation.terminalDispatchedAt,
      },
      include: this.invitationInclude(),
    })

    let deliveryJobId: string | null = null
    if (!isTerminal && refreshedToken) {
      if (isSms) {
        const identity = await this.identityVaultService.loadOutboundPhoneForInvitation(invitation.id)
        if (!identity) {
          throw new BadRequestException('Relance impossible : identité téléphone introuvable ou supprimée')
        }
        deliveryJobId = this.smsQueue.enqueue(this.buildInvitationSms({
          invitation: updated,
          recipientPhone: identity.phone,
          token: refreshedToken.token,
          template: 'reminder',
        }))
      } else {
        const identity = await this.identityVaultService.loadOutboundEmailForInvitation(invitation.id)
        if (!identity) {
          throw new BadRequestException('Relance impossible : identité email introuvable ou supprimée')
        }
        deliveryJobId = this.mailQueue.enqueue(this.buildInvitationMail({
          invitation: updated,
          recipientEmail: identity.email,
          token: refreshedToken.token,
          template: 'reminder',
        }))
      }
    }

    await this.identityVaultService.recordDeliveryEvent({
      invitationId: invitation.id,
      publicCode: invitation.publicCode,
      eventType: isTerminal ? 'terminal_invitation_redispatched' : isSms ? 'invitation_sms_reminder_queued' : 'invitation_reminder_queued',
      metadata: {
        note: isTerminal ? 'Invitation réattribuée au terminal hospitalier' : isSms ? 'Relance SMS transmise à la queue' : 'Relance email transmise à la queue',
        terminalDeviceId: invitation.terminalDeviceId ?? undefined,
        jobId: deliveryJobId ?? undefined,
      },
    })

    await this.auditService.log({
      actor: user,
      action: isTerminal ? 'invitation.redispatch.onsite_terminal' : 'invitation.resend',
      entityType: 'Invitation',
      entityId: invitation.id,
      publicCode: invitation.publicCode,
      request,
    })

    return { invitation: this.toInvitationDto(updated) }
  }


  private paperEntryInvitationInclude() {
    return {
      building: true,
      terminalDevice: { include: { building: true } },
      responseSession: {
        include: {
          submission: true,
          answers: true,
        },
      },
      questionnaireVersion: {
        include: {
          questionnaire: true,
          groups: {
            where: { isArchived: false },
            orderBy: { displayOrder: 'asc' },
            include: {
              questions: {
                where: { isArchived: false },
                orderBy: { displayOrder: 'asc' },
                include: {
                  likertScale: true,
                  answerOptions: { orderBy: { displayOrder: 'asc' } },
                  popupDefinitions: true,
                },
              },
            },
          },
        },
      },
    }
  }

  private paperEntryQuestions(questionnaireVersion: any): any[] {
    return questionnaireVersion.groups.flatMap((group: any) => group.questions)
  }

  private validatePaperAnswer(question: any, value: unknown): void {
    const responseType = question.responseType

    if (responseType === 'information') {
      return
    }

    if (responseType === 'single_choice') {
      const validValues = new Set((question.answerOptions ?? []).map((option: any) => option.value))
      if (typeof value !== 'string' || !validValues.has(value)) {
        throw new BadRequestException(`Réponse invalide pour ${question.code}`)
      }
      return
    }

    if (responseType === 'multiple_choice') {
      const validValues = new Set((question.answerOptions ?? []).map((option: any) => option.value))
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !validValues.has(item))) {
        throw new BadRequestException(`Réponse invalide pour ${question.code}`)
      }
      return
    }

    if (responseType === 'likert') {
      const scale = question.likertScale
      const minValue = scale?.minValue ?? 1
      const maxValue = minValue + (scale?.points ?? 0) - 1
      if (value === 'not_applicable' && scale?.allowNotApplicable) {
        return
      }
      if (typeof value !== 'number' || value < minValue || value > maxValue) {
        throw new BadRequestException(`Réponse invalide pour ${question.code}`)
      }
      return
    }

    if (responseType === 'number') {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new BadRequestException(`Réponse numérique invalide pour ${question.code}`)
      }
      return
    }

    if (responseType === 'date') {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new BadRequestException(`Date invalide pour ${question.code}`)
      }
      return
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`Réponse texte invalide pour ${question.code}`)
    }
  }

  private detectPaperIdentifyingData(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null
    }

    const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    const phonePattern = /(?:\+?\d[\s.-]?){8,}/

    if (emailPattern.test(value)) {
      return 'La réponse libre semble contenir une adresse email.'
    }

    if (phonePattern.test(value)) {
      return 'La réponse libre semble contenir un numéro de téléphone.'
    }

    return null
  }

  private paperPathFingerprint(publicCode: string, questionIds: string[]): string {
    return createHash('sha256').update(`${publicCode}:${questionIds.join('|')}`).digest('hex')
  }

  private async assertBuildingScope(user: AuthenticatedUser, buildingId: string): Promise<void> {
    if (user.role === 'moderator' && user.buildingId !== buildingId) {
      throw new ForbiddenException('Le bâtiment sélectionné est hors de votre périmètre')
    }

    if (user.role === 'site_manager') {
      const building = await this.prisma.building.findUnique({ where: { id: buildingId } })
      if (!building || building.siteId !== user.siteId) {
        throw new ForbiddenException('Le bâtiment sélectionné est hors de votre site')
      }
    }
  }

  private async expireOverdueInvitationsForScope(user: AuthenticatedUser): Promise<void> {
    const overdue = await this.prisma.invitation.findMany({
      where: {
        ...this.scopedWhere(user),
        status: { in: [...activeInvitationStatuses] },
        expiresAt: { lt: new Date() },
      },
      include: this.invitationInclude(),
      take: 100,
    })

    if (!overdue.length) {
      return
    }

    await this.prisma.invitation.updateMany({
      where: { id: { in: overdue.map((invitation: any) => invitation.id) } },
      data: { status: 'expired' },
    })

    for (const invitation of overdue) {
      await this.identityVaultService.recordDeliveryEvent({
        invitationId: invitation.id,
        publicCode: invitation.publicCode,
        eventType: 'invitation_expired',
        metadata: { expiredAt: new Date().toISOString() },
      })

      if (invitation.deliveryMode !== 'onsite_terminal') {
        if (invitation.deliveryMode === 'sms' || invitation.deliveryMode === 'sms_simulation') {
          const identity = await this.identityVaultService.loadOutboundPhoneForInvitation(invitation.id)
          if (identity) {
            this.smsQueue.enqueue(this.buildInvitationSms({
              invitation: { ...invitation, status: 'expired' },
              recipientPhone: identity.phone,
              token: null,
              template: 'expiration',
            }))
          }
        } else {
          const identity = await this.identityVaultService.loadOutboundEmailForInvitation(invitation.id)
          if (identity) {
            this.mailQueue.enqueue(this.buildInvitationMail({
              invitation: { ...invitation, status: 'expired' },
              recipientEmail: identity.email,
              token: null,
              template: 'expiration',
            }))
          }
        }
      }
    }
  }

  private scopedWhere(user: AuthenticatedUser) {
    if (user.role === 'moderator') {
      return { buildingId: user.buildingId ?? '00000000-0000-0000-0000-000000000000' }
    }

    if (user.role === 'site_manager') {
      return { siteId: user.siteId ?? '00000000-0000-0000-0000-000000000000' }
    }

    return {}
  }

  private invitationInclude() {
    return {
      building: true,
      terminalDevice: { include: { building: true } },
      identityVaultEntry: {
        select: { encryptedEmail: true, encryptedPhone: true },
      },
      responseSession: {
        include: {
          submission: true,
        },
      },
      questionnaireVersion: { include: { questionnaire: true } },
    }
  }

  private toInvitationDto(invitation: any) {
    return {
      id: invitation.id,
      publicCode: invitation.publicCode,
      status: invitation.status,
      deliveryMode: invitation.deliveryMode ?? 'email_simulation',
      assistanceMode: invitation.assistanceMode ?? 'none',
      maskedEmail: invitation.identityVaultEntry?.encryptedEmail ? 'email masqué' : null,
      maskedPhone: invitation.identityVaultEntry?.encryptedPhone ? 'téléphone masqué' : null,
      questionnaireVersionId: invitation.questionnaireVersionId,
      questionnaireTitle: invitation.questionnaireVersion?.questionnaire?.title ?? null,
      versionLabel: invitation.questionnaireVersion?.versionLabel ?? null,
      building: invitation.building,
      terminalDevice: invitation.terminalDevice ? this.toTerminalDeviceDto(invitation.terminalDevice) : null,
      terminalDispatchedAt: invitation.terminalDispatchedAt,
      expiresAt: invitation.expiresAt,
      sentAt: invitation.sentAt,
      openedAt: invitation.openedAt,
      startedAt: invitation.startedAt,
      submittedAt: invitation.submittedAt,
      responseStatus: invitation.responseSession?.status ?? null,
    }
  }

  private toTerminalDeviceDto(device: any) {
    return {
      id: device.id,
      code: device.code,
      label: device.label,
      status: device.status,
      building: device.building,
      lastSeenAt: device.lastSeenAt,
      pendingInvitationCount: device.invitations?.length ?? 0,
    }
  }


  private resolveDeliveryMode(deliveryMode?: string): 'email' | 'email_simulation' | 'onsite_terminal' | 'paper_form' | 'refusal_record' | 'sms' | 'sms_simulation' {
    const resolved = deliveryMode ?? (this.config.get<string>('NODE_ENV') === 'production' ? 'email' : 'email_simulation')

    if ((resolved === 'email_simulation' || resolved === 'sms_simulation') && this.config.get<string>('NODE_ENV') === 'production') {
      throw new BadRequestException('Les modes de simulation sont interdits en production')
    }

    if (resolved === 'email'
      || resolved === 'email_simulation'
      || resolved === 'onsite_terminal'
      || resolved === 'paper_form'
      || resolved === 'refusal_record'
      || resolved === 'sms'
      || resolved === 'sms_simulation') {
      return resolved
    }

    throw new BadRequestException('Mode de livraison invalide')
  }

  private buildInvitationSms(input: { invitation: any; recipientPhone: string; token: string | null; template: 'invitation' | 'reminder' | 'expiration' }) {
    const questionnaireTitle = input.invitation.questionnaireVersion?.questionnaire?.title ?? 'questionnaire CHPM'
    const link = input.token ? this.respondentLink(input.token) : null
    const textByTemplate = {
      invitation: [
        `CHPM : vous êtes invité(e) à répondre au questionnaire ${questionnaireTitle}.`,
        `Code ${input.invitation.publicCode}.`,
        link ? `Lien sécurisé : ${link}` : 'Lien indisponible.',
        `Expiration : ${new Date(input.invitation.expiresAt).toLocaleString('fr-FR')}.`,
      ],
      reminder: [
        `CHPM : rappel pour le questionnaire ${questionnaireTitle}.`,
        `Code ${input.invitation.publicCode}.`,
        link ? `Lien : ${link}` : 'Lien indisponible.',
      ],
      expiration: [
        `CHPM : l'invitation au questionnaire ${questionnaireTitle} est expirée.`,
        `Code ${input.invitation.publicCode}.`,
      ],
    }

    return {
      template: input.template,
      to: { phone: input.recipientPhone },
      text: textByTemplate[input.template].join(' '),
      invitationId: input.invitation.id,
      publicCode: input.invitation.publicCode,
      metadata: {
        questionnaireVersionId: input.invitation.questionnaireVersionId,
        deliveryMode: input.invitation.deliveryMode,
        expiresAt: input.invitation.expiresAt?.toISOString?.() ?? String(input.invitation.expiresAt),
      },
    }
  }

  private buildInvitationMail(input: { invitation: any; recipientEmail: string; token: string | null; template: 'invitation' | 'reminder' | 'expiration' }) {
    const questionnaireTitle = input.invitation.questionnaireVersion?.questionnaire?.title ?? 'questionnaire CHPM'
    const link = input.token ? this.respondentLink(input.token) : null
    const subjectByTemplate = {
      invitation: `Invitation à répondre au questionnaire ${questionnaireTitle}`,
      reminder: `Relance — questionnaire ${questionnaireTitle}`,
      expiration: `Invitation expirée — questionnaire ${questionnaireTitle}`,
    }

    const textByTemplate = {
      invitation: [
        'Bonjour,',
        `Vous êtes invité(e) à répondre au questionnaire : ${questionnaireTitle}.`,
        `Code unique : ${input.invitation.publicCode}.`,
        link ? `Lien sécurisé à usage unique : ${link}` : 'Cette invitation est expirée ou indisponible.',
        `Expiration : ${new Date(input.invitation.expiresAt).toLocaleString('fr-FR')}.`,
        'Vos réponses sont pseudonymisées ; votre email est conservé dans le coffre identité séparé.',
      ],
      reminder: [
        'Bonjour,',
        `Rappel : le questionnaire ${questionnaireTitle} est encore en attente.`,
        `Code unique : ${input.invitation.publicCode}.`,
        link ? `Lien sécurisé renouvelé : ${link}` : 'Lien indisponible.',
        `Expiration : ${new Date(input.invitation.expiresAt).toLocaleString('fr-FR')}.`,
      ],
      expiration: [
        'Bonjour,',
        `L'invitation au questionnaire ${questionnaireTitle} est expirée.`,
        `Code unique : ${input.invitation.publicCode}.`,
        'Aucune action supplémentaire n’est possible avec ce lien.',
      ],
    }

    return {
      template: input.template,
      to: { email: input.recipientEmail },
      subject: subjectByTemplate[input.template],
      text: textByTemplate[input.template].join('\n'),
      invitationId: input.invitation.id,
      publicCode: input.invitation.publicCode,
      metadata: {
        questionnaireVersionId: input.invitation.questionnaireVersionId,
        deliveryMode: input.invitation.deliveryMode,
        expiresAt: input.invitation.expiresAt?.toISOString?.() ?? String(input.invitation.expiresAt),
      },
    }
  }

  private canExposeRespondentToken(): boolean {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      return false
    }

    return this.config.get<string>('EXPOSE_RESPONDENT_DEV_LINKS', 'true') === 'true'
  }

  private respondentLink(token: string): string {
    const origin = (this.config.get<string>('FRONTEND_ORIGIN', 'http://localhost:5173').split(',')[0] ?? 'http://localhost:5173').trim()
    return `${origin}/r/${encodeURIComponent(token)}`
  }

  private terminalLink(token: string): string {
    const origin = (this.config.get<string>('FRONTEND_ORIGIN', 'http://localhost:5173').split(',')[0] ?? 'http://localhost:5173').trim()
    return `${origin}/terminal/${encodeURIComponent(token)}`
  }

  private defaultExpiry(deliveryMode = 'email_simulation'): Date {
    if (deliveryMode === 'onsite_terminal') {
      const hours = Math.max(Number(this.config.get<string>('ONSITE_TERMINAL_TOKEN_TTL_HOURS', '12')), 1)
      return new Date(Date.now() + hours * 60 * 60 * 1000)
    }

    const days = Math.max(Number(this.config.get<string>('RESPONDENT_TOKEN_TTL_DAYS', '30')), 1)
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  }

  private async generateUniquePublicCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = this.randomCode(8)
      const existing = await this.prisma.invitation.findUnique({ where: { publicCode: code } })
      if (!existing) {
        return code
      }
    }

    throw new Error('Impossible de générer un code unique')
  }

  private async generateUniqueTerminalCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = `TERM-${this.randomCode(6)}`
      const existing = await this.prisma.terminalDevice.findUnique({ where: { code } })
      if (!existing) {
        return code
      }
    }

    throw new Error('Impossible de générer un code terminal unique')
  }

  private randomCode(length: number): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const chars = Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
    return length === 8 ? `${chars.slice(0, 4)}-${chars.slice(4)}` : chars
  }
}
