import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { AccessTokenService } from '../security/access-token.service'
import type { CreateTerminalDeviceDto } from './dto/create-terminal-device.dto'
import type { UpdateTerminalDeviceDto } from './dto/update-terminal-device.dto'

const activeInvitationStatuses = ['sent', 'opened', 'in_progress', 'draft'] as const
const administrativeRoles = ['admin', 'technical_admin'] as const

@Injectable()
export class TerminalAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokenService: AccessTokenService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  async listForUser(user: AuthenticatedUser) {
    const terminalDevices = await this.prisma.terminalDevice.findMany({
      where: this.scopedWhere(user),
      orderBy: [{ status: 'asc' }, { label: 'asc' }],
      include: this.deviceInclude(),
      take: 500,
    })

    return terminalDevices.map((device: any) => this.toTerminalDeviceDto(device))
  }

  async create(user: AuthenticatedUser, dto: CreateTerminalDeviceDto, request: Request) {
    this.assertCanAdminister(user)

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
      include: this.deviceInclude(),
    })

    await this.auditService.log({
      actor: user,
      action: 'terminal_device.create',
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

  async update(user: AuthenticatedUser, terminalDeviceId: string, dto: UpdateTerminalDeviceDto, request: Request) {
    this.assertCanAdminister(user)
    const terminalDevice = await this.findScopedDevice(user, terminalDeviceId)

    const updated = await this.prisma.terminalDevice.update({
      where: { id: terminalDevice.id },
      data: {
        label: dto.label?.trim() || undefined,
        status: dto.status,
      },
      include: this.deviceInclude(),
    })

    await this.auditService.log({
      actor: user,
      action: 'terminal_device.update',
      entityType: 'TerminalDevice',
      entityId: terminalDevice.id,
      request,
      metadata: { label: dto.label?.trim(), status: dto.status },
    })

    return { terminalDevice: this.toTerminalDeviceDto(updated) }
  }

  async revoke(user: AuthenticatedUser, terminalDeviceId: string, request: Request) {
    return this.update(user, terminalDeviceId, { status: 'revoked' }, request)
  }

  async regenerateToken(user: AuthenticatedUser, terminalDeviceId: string, request: Request) {
    this.assertCanAdminister(user)
    const terminalDevice = await this.findScopedDevice(user, terminalDeviceId)
    const { token, tokenHash } = this.accessTokenService.create(terminalDevice.code)

    const updated = await this.prisma.terminalDevice.update({
      where: { id: terminalDevice.id },
      data: {
        accessTokenHash: tokenHash,
        status: terminalDevice.status === 'revoked' ? 'active' : terminalDevice.status,
      },
      include: this.deviceInclude(),
    })

    await this.auditService.log({
      actor: user,
      action: 'terminal_device.token_regenerate',
      entityType: 'TerminalDevice',
      entityId: terminalDevice.id,
      request,
      metadata: {
        code: terminalDevice.code,
        previousStatus: terminalDevice.status,
        newStatus: updated.status,
      },
    })

    return {
      terminalDevice: this.toTerminalDeviceDto(updated),
      terminalAccessToken: token,
      terminalLaunchLink: this.terminalLink(token),
    }
  }

  private assertCanAdminister(user: AuthenticatedUser): void {
    if (!administrativeRoles.includes(user.role as any)) {
      throw new ForbiddenException('Seuls les administrateurs et administrateurs techniques peuvent administrer les terminaux')
    }
  }

  private async findScopedDevice(user: AuthenticatedUser, terminalDeviceId: string) {
    const terminalDevice = await this.prisma.terminalDevice.findFirst({
      where: {
        id: terminalDeviceId,
        ...this.scopedWhere(user),
      },
      include: this.deviceInclude(),
    })

    if (!terminalDevice) {
      throw new NotFoundException('Terminal introuvable dans votre périmètre')
    }

    return terminalDevice
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

  private deviceInclude() {
    return {
      building: true,
      invitations: {
        where: {
          deliveryMode: 'onsite_terminal',
          status: { in: [...activeInvitationStatuses] },
          expiresAt: { gt: new Date() },
        },
        select: { id: true },
      },
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
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    }
  }

  private terminalLink(token: string): string {
    const origin = (this.config.get<string>('FRONTEND_ORIGIN', 'http://localhost:5173').split(',')[0] ?? 'http://localhost:5173').trim()
    return `${origin}/terminal/${encodeURIComponent(token)}`
  }

  private async generateUniqueTerminalCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = this.randomTerminalCode()
      const existing = await this.prisma.terminalDevice.findUnique({ where: { code } })
      if (!existing) return code
    }

    throw new Error('Impossible de générer un code terminal unique')
  }

  private randomTerminalCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const chars = Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
    return `TERM-${chars.slice(0, 4)}-${chars.slice(4)}`
  }
}
