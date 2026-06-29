import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AccessTokenService } from '../security/access-token.service'
import { EmailCryptoService } from '../security/email-crypto.service'
import { PrismaService } from '../prisma/prisma.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'
import { RegisterTerminalDeviceDto } from './dto/register-terminal-device.dto'

const activeInvitationStatuses = ['sent', 'opened', 'in_progress', 'draft'] as const
const validTerminalStatuses = ['active'] as const

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

    if (questionnaireVersion.openUntil && questionnaireVersion.openUntil < new Date()) {
      throw new BadRequestException('La période d’ouverture du questionnaire est terminée')
    }

    const building = await this.prisma.building.findUnique({ where: { id: dto.buildingId } })

    if (!building) {
      throw new NotFoundException('Bâtiment introuvable')
    }

    const deliveryMode = dto.deliveryMode ?? 'email_simulation'
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
          deliveryEvents: {
            create: {
              publicCode,
              eventType: 'terminal_invitation_assigned',
              metadata: {
                terminalDeviceId: terminalDevice.id,
                terminalCode: terminalDevice.code,
                note: 'Invitation attribuée à un terminal hospitalier enregistré',
              },
            },
          },
        },
        include: this.invitationInclude(),
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

    if (!dto.email) {
      throw new BadRequestException('Une adresse email est requise pour ce mode d’envoi')
    }

    const normalizedEmail = this.emailCryptoService.normalize(dto.email)
    const emailHash = this.emailCryptoService.hashEmail(normalizedEmail)

    const duplicate = await this.prisma.identityVaultEntry.findFirst({
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
          deliveryMode,
          assistanceMode,
          notifyModerator: dto.notifyModerator ?? false,
          notifyAdmins: dto.notifyAdmins ?? false,
          expiresAt,
          sentAt: new Date(),
          identityVaultEntry: {
            create: {
              uniqueCode: publicCode,
              encryptedEmail: this.emailCryptoService.encryptEmail(normalizedEmail),
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
              eventType: deliveryMode === 'email' ? 'email_queued' : 'dev_link_created',
              metadata: { note: deliveryMode === 'email' ? 'Email prêt à être envoyé' : 'Envoi email simulé en développement' },
            },
          },
        },
        include: this.invitationInclude(),
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
        deliveryMode,
        notifyModerator: dto.notifyModerator ?? false,
        notifyAdmins: dto.notifyAdmins ?? false,
      },
    })

    return {
      invitation: this.toInvitationDto(invitation),
      accessToken: token,
      devAccessLink: this.respondentLink(token),
      terminalDispatchLink: null,
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

    const isTerminal = invitation.deliveryMode === 'onsite_terminal'
    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        terminalDispatchedAt: isTerminal ? new Date() : invitation.terminalDispatchedAt,
        deliveryEvents: {
          create: {
            publicCode: invitation.publicCode,
            eventType: isTerminal ? 'terminal_invitation_redispatched' : 'dev_resend_created',
            metadata: {
              note: isTerminal ? 'Invitation réattribuée au terminal hospitalier' : 'Relance email simulée en développement',
              terminalDeviceId: invitation.terminalDeviceId ?? undefined,
            },
          },
        },
      },
      include: this.invitationInclude(),
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
    await this.prisma.invitation.updateMany({
      where: {
        ...this.scopedWhere(user),
        status: { in: [...activeInvitationStatuses] },
        expiresAt: { lt: new Date() },
      },
      data: { status: 'expired' },
    })
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
      identityVaultEntry: true,
      terminalDevice: { include: { building: true } },
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
      maskedEmail: invitation.identityVaultEntry ? this.emailCryptoService.maskEncryptedEmail(invitation.identityVaultEntry.encryptedEmail) : null,
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
