import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AccessTokenService } from '../security/access-token.service'
import { EmailCryptoService } from '../security/email-crypto.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'

const activeInvitationStatuses = ['sent', 'opened', 'in_progress', 'draft'] as const

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokenService: AccessTokenService,
    private readonly emailCryptoService: EmailCryptoService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async listForUser(user: AuthenticatedUser) {
    const invitations = await this.prisma.invitation.findMany({
      where: this.scopedWhere(user),
      orderBy: { createdAt: 'desc' },
      include: {
        building: true,
        questionnaireVersion: {
          include: {
            questionnaire: true,
          },
        },
        emailIdentity: true,
        responseSession: {
          include: {
            submission: true,
          },
        },
      },
      take: 200,
    })

    return invitations.map((invitation: any) => this.toInvitationDto(invitation))
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

    if (questionnaireVersion.openUntil && questionnaireVersion.openUntil < new Date()) {
      throw new BadRequestException('La période d’ouverture du questionnaire est terminée')
    }

    const building = await this.prisma.building.findUnique({ where: { id: dto.buildingId } })

    if (!building) {
      throw new NotFoundException('Bâtiment introuvable')
    }

    const normalizedEmail = this.emailCryptoService.normalize(dto.email)
    const emailHash = this.emailCryptoService.hashEmail(normalizedEmail)

    const duplicate = await this.prisma.emailIdentity.findFirst({
      where: {
        questionnaireVersionId: dto.questionnaireVersionId,
        emailHash,
        deletedAt: null,
        invitation: {
          status: { in: [...activeInvitationStatuses] },
        },
      },
    })

    if (duplicate) {
      throw new BadRequestException('Une invitation active existe déjà pour cet email et cette version')
    }

    const publicCode = await this.generateUniquePublicCode()
    const { token, tokenHash } = this.accessTokenService.create(publicCode)
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : this.defaultExpiry()

    const invitation = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.invitation.create({
        data: {
          questionnaireVersionId: dto.questionnaireVersionId,
          buildingId: dto.buildingId,
          siteId: building.siteId,
          createdByUserId: user.id,
          publicCode,
          tokenHash,
          status: 'sent',
          notifyModerator: dto.notifyModerator ?? false,
          notifyAdmins: dto.notifyAdmins ?? false,
          expiresAt,
          sentAt: new Date(),
          emailIdentity: {
            create: {
              publicCode,
              emailCiphertext: this.emailCryptoService.encryptEmail(normalizedEmail),
              emailHash,
              questionnaireVersionId: dto.questionnaireVersionId,
              buildingId: dto.buildingId,
              createdByUserId: user.id,
              lastEmailSentAt: new Date(),
            },
          },
          deliveryEvents: {
            create: {
              publicCode,
              eventType: 'dev_link_created',
              metadata: { note: 'Envoi email simulé en développement' },
            },
          },
        },
        include: {
          building: true,
          emailIdentity: true,
          responseSession: true,
          questionnaireVersion: { include: { questionnaire: true } },
        },
      })

      await tx.identityVaultAuditLog.create({
        data: {
          actorUserId: user.id,
          action: 'email_identity.create',
          publicCode,
          ipAddress: request.ip,
          metadata: { questionnaireVersionId: dto.questionnaireVersionId, buildingId: dto.buildingId },
        },
      })

      return created
    })

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
        notifyModerator: dto.notifyModerator ?? false,
        notifyAdmins: dto.notifyAdmins ?? false,
      },
    })

    return {
      invitation: this.toInvitationDto(invitation),
      accessToken: token,
      devAccessLink: this.respondentLink(token),
    }
  }

  async resend(user: AuthenticatedUser, invitationId: string, request: Request) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        id: invitationId,
        ...this.scopedWhere(user),
      },
      include: {
        building: true,
        emailIdentity: true,
        responseSession: true,
        questionnaireVersion: { include: { questionnaire: true } },
      },
    })

    if (!invitation) {
      throw new NotFoundException('Invitation introuvable dans votre périmètre')
    }

    if (invitation.status === 'submitted' || invitation.status === 'cancelled' || invitation.status === 'blocked') {
      throw new BadRequestException('Cette invitation ne peut pas être relancée')
    }

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        deliveryEvents: {
          create: {
            publicCode: invitation.publicCode,
            eventType: 'dev_resend_created',
            metadata: { note: 'Relance email simulée en développement' },
          },
        },
      },
      include: {
        building: true,
        emailIdentity: true,
        responseSession: true,
        questionnaireVersion: { include: { questionnaire: true } },
      },
    })

    await this.auditService.log({
      actor: user,
      action: 'invitation.resend',
      entityType: 'Invitation',
      entityId: invitation.id,
      publicCode: invitation.publicCode,
      request,
    })

    return { invitation: this.toInvitationDto(updated) }
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

  private scopedWhere(user: AuthenticatedUser) {
    if (user.role === 'moderator') {
      return { buildingId: user.buildingId ?? '00000000-0000-0000-0000-000000000000' }
    }

    if (user.role === 'site_manager') {
      return { siteId: user.siteId ?? '00000000-0000-0000-0000-000000000000' }
    }

    return {}
  }

  private toInvitationDto(invitation: any) {
    return {
      id: invitation.id,
      publicCode: invitation.publicCode,
      status: invitation.status,
      maskedEmail: invitation.emailIdentity ? this.emailCryptoService.maskEncryptedEmail(invitation.emailIdentity.emailCiphertext) : null,
      questionnaireVersionId: invitation.questionnaireVersionId,
      questionnaireTitle: invitation.questionnaireVersion?.questionnaire?.title ?? null,
      versionLabel: invitation.questionnaireVersion?.versionLabel ?? null,
      building: invitation.building,
      expiresAt: invitation.expiresAt,
      sentAt: invitation.sentAt,
      openedAt: invitation.openedAt,
      startedAt: invitation.startedAt,
      submittedAt: invitation.submittedAt,
      responseStatus: invitation.responseSession?.status ?? null,
    }
  }

  private respondentLink(token: string): string {
    const origin = (this.config.get<string>('FRONTEND_ORIGIN', 'http://localhost:5173').split(',')[0] ?? 'http://localhost:5173').trim()
    return `${origin}/r/${encodeURIComponent(token)}`
  }

  private defaultExpiry(): Date {
    const days = Number(this.config.get<string>('RESPONDENT_TOKEN_TTL_DAYS', '30'))
    return new Date(Date.now() + Math.max(days, 1) * 24 * 60 * 60 * 1000)
  }

  private async generateUniquePublicCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = this.randomPublicCode()
      const existing = await this.prisma.invitation.findUnique({ where: { publicCode: code } })
      if (!existing) {
        return code
      }
    }

    throw new Error('Impossible de générer un code unique')
  }

  private randomPublicCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const chars = Array.from({ length: 8 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
    return `${chars.slice(0, 4)}-${chars.slice(4)}`
  }
}
