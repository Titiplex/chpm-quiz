import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { AccessTokenService } from '../security/access-token.service'

const terminalInvitationStatuses = ['sent', 'opened', 'in_progress', 'draft'] as const

@Injectable()
export class TerminalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokenService: AccessTokenService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async getSession(terminalToken: string) {
    const terminalDevice = await this.resolveTerminalDeviceFromToken(terminalToken)

    const invitations = await this.prisma.invitation.findMany({
      where: {
        deliveryMode: 'onsite_terminal',
        terminalDeviceId: terminalDevice.id,
        buildingId: terminalDevice.buildingId,
        status: { in: [...terminalInvitationStatuses] },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      include: this.invitationInclude(),
    })

    return {
      terminalDevice: this.toTerminalDeviceDto({ ...terminalDevice, invitations }),
      invitations: invitations.map((invitation: any) => this.toTerminalInvitationDto(invitation)),
    }
  }

  async openInvitation(invitationId: string, terminalToken: string, request?: Request) {
    const terminalDevice = await this.resolveTerminalDeviceFromToken(terminalToken)
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      include: this.invitationInclude(),
    })

    this.assertInvitationCanOpenOnTerminal(invitation, terminalDevice)

    const { token, tokenHash } = this.accessTokenService.create(invitation.publicCode)
    const now = new Date()

    const updated = await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash,
        status: 'opened',
        openedAt: invitation.openedAt ?? now,
        terminalDispatchedAt: invitation.terminalDispatchedAt ?? now,
        deliveryEvents: {
          create: {
            publicCode: invitation.publicCode,
            eventType: 'terminal_invitation_opened',
            metadata: {
              terminalDeviceId: terminalDevice.id,
              terminalCode: terminalDevice.code,
            },
          },
        },
      },
      include: this.invitationInclude(),
    })

    await this.auditService.log({
      actor: null,
      action: 'terminal.invitation.open',
      entityType: 'Invitation',
      entityId: invitation.id,
      publicCode: invitation.publicCode,
      request,
      metadata: {
        terminalDeviceId: terminalDevice.id,
        buildingId: terminalDevice.buildingId,
      },
    })

    return {
      invitation: this.toTerminalInvitationDto(updated),
      accessToken: token,
      respondentAccessLink: this.respondentLink(token, terminalToken),
    }
  }

  private async resolveTerminalDeviceFromToken(terminalToken: string) {
    if (!terminalToken) {
      throw new UnauthorizedException('Jeton terminal requis')
    }

    const tokenData = this.accessTokenService.verify(terminalToken)
    const terminalDevice = await this.prisma.terminalDevice.findUnique({
      where: { code: tokenData.publicCode },
      include: { building: true },
    })

    if (!terminalDevice || terminalDevice.accessTokenHash !== tokenData.tokenHash || terminalDevice.status !== 'active') {
      throw new UnauthorizedException('Terminal invalide ou désactivé')
    }

    await this.prisma.terminalDevice.update({
      where: { id: terminalDevice.id },
      data: { lastSeenAt: new Date() },
    })

    return terminalDevice
  }

  private assertInvitationCanOpenOnTerminal(invitation: any, terminalDevice: any): void {
    if (!invitation) {
      throw new NotFoundException('Invitation introuvable')
    }

    if (invitation.deliveryMode !== 'onsite_terminal') {
      throw new ForbiddenException('Cette invitation n’est pas destinée à un terminal hospitalier')
    }

    if (invitation.terminalDeviceId !== terminalDevice.id) {
      throw new ForbiddenException('Invitation affectée à un autre terminal')
    }

    if (invitation.buildingId !== terminalDevice.buildingId) {
      throw new ForbiddenException('Terminal hors du bâtiment de l’invitation')
    }

    if (invitation.status === 'submitted' || invitation.responseSession?.submission) {
      throw new BadRequestException('Cette invitation a déjà été soumise')
    }

    if (invitation.status === 'blocked' || invitation.status === 'cancelled' || invitation.status === 'expired') {
      throw new BadRequestException('Cette invitation n’est plus active')
    }

    if (invitation.expiresAt <= new Date()) {
      throw new BadRequestException('Cette invitation est expirée')
    }
  }

  private invitationInclude() {
    return {
      building: true,
      terminalDevice: { include: { building: true } },
      responseSession: { include: { submission: true } },
      questionnaireVersion: { include: { questionnaire: true } },
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
      pendingInvitationCount: device.invitations?.filter((invitation: any) => invitation.status !== 'submitted').length ?? 0,
    }
  }

  private toTerminalInvitationDto(invitation: any) {
    return {
      id: invitation.id,
      publicCode: invitation.publicCode,
      status: invitation.status,
      deliveryMode: invitation.deliveryMode,
      assistanceMode: invitation.assistanceMode ?? 'none',
      maskedEmail: null,
      maskedPhone: null,
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

  private respondentLink(token: string, terminalToken: string): string {
    const origin = (this.config.get<string>('FRONTEND_ORIGIN', 'http://localhost:5173').split(',')[0] ?? 'http://localhost:5173').trim()
    return `${origin}/r/${encodeURIComponent(token)}?terminalToken=${encodeURIComponent(terminalToken)}`
  }
}
