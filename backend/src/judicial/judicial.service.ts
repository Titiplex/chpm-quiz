import { createCipheriv, createHash, randomBytes } from 'node:crypto'

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { IdentityVaultService } from '../identity-vault/identity-vault.service'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateJudicialRequestDto } from './dto/create-judicial-request.dto'
import type {
  JudicialWorkflowCommentDto,
  RejectJudicialRequestDto,
} from './dto/judicial-workflow.dto'

@Injectable()
export class JudicialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly identityVaultService: IdentityVaultService,
    private readonly config: ConfigService,
  ) {}

  async list(user: AuthenticatedUser) {
    this.assertOrganizationScope(user)
    return this.prisma.judicialAccessRequest.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { receivedAt: 'desc' },
    })
  }

  async create(dto: CreateJudicialRequestDto, user: AuthenticatedUser, request: Request) {
    if (user.role !== 'judicial_officer') {
      throw new ForbiddenException('Création réservée au responsable accès judiciaire')
    }
    this.assertOrganizationScope(user)
    const existing = await this.prisma.judicialAccessRequest.findFirst({
      where: {
        organizationId: user.organizationId,
        requestReference: dto.requestReference,
      },
    })

    if (existing) {
      throw new ConflictException('Cette référence de demande existe déjà')
    }

    const requestedPublicCodes = this.normalizePublicCodes(dto.requestedPublicCodes)
    await this.assertCodesBelongToOrganization(requestedPublicCodes, user.organizationId)

    const created = await this.prisma.judicialAccessRequest.create({
      data: {
        organizationId: user.organizationId,
        requestReference: dto.requestReference,
        legalBasisDescription: dto.legalBasisDescription,
        courtOrderReference: dto.courtOrderReference,
        requestedPublicCodes,
        requestedBy: dto.requestedBy,
        comments: dto.comments,
        status: 'received',
      },
    })

    await this.identityVaultService.recordVaultAudit({
      actorUserId: user.id,
      action: 'judicial_access.request_create',
      requestId: created.id,
      ipAddress: request.ip,
      metadata: {
        requestReference: dto.requestReference,
        requestedPublicCodeCount: requestedPublicCodes.length,
      },
    })

    await this.auditService.log({
      actor: user,
      action: 'judicial_access.request_create',
      entityType: 'JudicialAccessRequest',
      entityId: created.id,
      request,
      metadata: {
        requestReference: dto.requestReference,
        requestedPublicCodeCount: requestedPublicCodes.length,
      },
    })

    return created
  }

  async validateDpo(
    id: string,
    user: AuthenticatedUser,
    dto: JudicialWorkflowCommentDto,
    request: Request,
  ) {
    if (user.role !== 'dpo') {
      throw new ForbiddenException('Validation DPO réservée au DPO')
    }

    return this.validate(id, user, dto, request, 'dpo')
  }

  async validateLegal(
    id: string,
    user: AuthenticatedUser,
    dto: JudicialWorkflowCommentDto,
    request: Request,
  ) {
    if (user.role !== 'judicial_officer') {
      throw new ForbiddenException('Validation juridique réservée au responsable accès judiciaire')
    }

    return this.validate(id, user, dto, request, 'legal')
  }

  async reject(
    id: string,
    user: AuthenticatedUser,
    dto: RejectJudicialRequestDto,
    request: Request,
  ) {
    const judicialRequest = await this.getRequest(id, user)

    if (judicialRequest.status === 'executed' || judicialRequest.status === 'closed') {
      throw new BadRequestException('Une demande exécutée ou clôturée ne peut plus être rejetée')
    }

    const updated = await this.prisma.judicialAccessRequest.update({
      where: { id },
      data: {
        status: 'rejected',
        comments: this.appendComment(
          judicialRequest.comments,
          user,
          dto.reason || dto.comments || 'Rejet sans motif détaillé',
        ),
      },
    })

    await this.identityVaultService.recordVaultAudit({
      actorUserId: user.id,
      action: 'judicial_access.reject',
      requestId: id,
      ipAddress: request.ip,
      metadata: { reason: dto.reason },
    })

    await this.auditService.log({
      actor: user,
      action: 'judicial_access.reject',
      entityType: 'JudicialAccessRequest',
      entityId: id,
      request,
      metadata: { reason: dto.reason },
    })

    return updated
  }

  async execute(id: string, user: AuthenticatedUser, request: Request) {
    if (user.role !== 'dpo') {
      throw new ForbiddenException('Exécution réservée au DPO')
    }
    this.assertOrganizationScope(user)
    const judicialRequest = await this.getRequest(id, user)
    if (
      judicialRequest.status !== 'validated' ||
      !judicialRequest.dpoValidationUserId ||
      !judicialRequest.legalValidationUserId
    ) {
      throw new BadRequestException(
        'La double validation DPO et juridique est obligatoire avant exécution',
      )
    }

    await this.assertCodesBelongToOrganization(
      judicialRequest.requestedPublicCodes,
      user.organizationId,
    )
    const rows = await this.identityVaultService.loadJudicialIdentityRows(
      judicialRequest.requestedPublicCodes,
    )
    const expiresAt = new Date(Date.now() + this.exportTtlMinutes() * 60_000)
    const exportEnvelope = this.encryptExport({
      requestId: judicialRequest.id,
      requestReference: judicialRequest.requestReference,
      generatedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      requestedPublicCodes: judicialRequest.requestedPublicCodes,
      rows,
    })
    const exportFingerprint = createHash('sha256')
      .update(JSON.stringify(exportEnvelope))
      .digest('hex')
    const updated = await this.prisma.judicialAccessRequest.update({
      where: { id },
      data: {
        status: 'executed',
        executedByUserId: user.id,
        executedAt: new Date(),
        exportFingerprint,
        exportExpiresAt: expiresAt,
        exportDeletedAt: null,
      },
    })

    await this.auditService.log({
      actor: user,
      action: 'judicial_access.execute',
      entityType: 'JudicialAccessRequest',
      entityId: id,
      request,
      metadata: {
        requestReference: judicialRequest.requestReference,
        rowCount: rows.length,
        exportFingerprint,
        expiresAt,
      },
    })
    await this.identityVaultService.recordVaultAudit({
      actorUserId: user.id,
      action: 'judicial_access.execute',
      requestId: id,
      ipAddress: request.ip,
      metadata: { rowCount: rows.length, exportFingerprint, expiresAt: expiresAt.toISOString() },
    })

    return {
      judicialRequest: updated,
      export: {
        fingerprint: exportFingerprint,
        expiresAt,
        rowCount: rows.length,
        envelope: exportEnvelope,
      },
    }
  }

  async close(
    id: string,
    user: AuthenticatedUser,
    dto: JudicialWorkflowCommentDto,
    request: Request,
  ) {
    const judicialRequest = await this.getRequest(id, user)

    if (judicialRequest.status !== 'executed') {
      throw new BadRequestException('Seule une demande exécutée peut être clôturée')
    }

    const updated = await this.prisma.judicialAccessRequest.update({
      where: { id },
      data: {
        status: 'closed',
        comments: this.appendComment(
          judicialRequest.comments,
          user,
          dto.comments || 'Clôture de la procédure.',
        ),
      },
    })

    await this.identityVaultService.recordVaultAudit({
      actorUserId: user.id,
      action: 'judicial_access.close',
      requestId: id,
      ipAddress: request.ip,
      metadata: { requestReference: judicialRequest.requestReference },
    })

    await this.auditService.log({
      actor: user,
      action: 'judicial_access.close',
      entityType: 'JudicialAccessRequest',
      entityId: id,
      request,
      metadata: { requestReference: judicialRequest.requestReference },
    })

    return updated
  }

  private async validate(
    id: string,
    user: AuthenticatedUser,
    dto: JudicialWorkflowCommentDto,
    request: Request,
    validationType: 'dpo' | 'legal',
  ) {
    const judicialRequest = await this.getRequest(id, user)

    if (judicialRequest.status !== 'received' && judicialRequest.status !== 'validated') {
      throw new BadRequestException('Seule une demande reçue peut être validée')
    }

    const data =
      validationType === 'dpo'
        ? { dpoValidationUserId: user.id }
        : { legalValidationUserId: user.id }

    const nextDpoId = validationType === 'dpo' ? user.id : judicialRequest.dpoValidationUserId
    const nextLegalId = validationType === 'legal' ? user.id : judicialRequest.legalValidationUserId
    const nextStatus = nextDpoId && nextLegalId ? 'validated' : judicialRequest.status

    const updated = await this.prisma.judicialAccessRequest.update({
      where: { id },
      data: {
        ...data,
        status: nextStatus,
        comments: this.appendComment(
          judicialRequest.comments,
          user,
          dto.comments || `Validation ${validationType}.`,
        ),
      },
    })

    await this.identityVaultService.recordVaultAudit({
      actorUserId: user.id,
      action: `judicial_access.validate_${validationType}`,
      requestId: id,
      ipAddress: request.ip,
      metadata: { requestReference: judicialRequest.requestReference },
    })

    await this.auditService.log({
      actor: user,
      action: `judicial_access.validate_${validationType}`,
      entityType: 'JudicialAccessRequest',
      entityId: id,
      request,
      metadata: { requestReference: judicialRequest.requestReference },
    })

    return updated
  }

  private async getRequest(id: string, user: AuthenticatedUser) {
    this.assertOrganizationScope(user)
    const judicialRequest = await this.prisma.judicialAccessRequest.findUnique({ where: { id } })

    if (!judicialRequest) {
      throw new NotFoundException('Demande judiciaire introuvable')
    }

    if (judicialRequest.organizationId !== user.organizationId) {
      throw new NotFoundException('Demande judiciaire introuvable')
    }

    return judicialRequest
  }

  private normalizePublicCodes(publicCodes: string[]): string[] {
    return Array.from(new Set(publicCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)))
  }

  private async assertCodesBelongToOrganization(
    publicCodes: string[],
    organizationId: string,
  ): Promise<void> {
    const scopedInvitations = await this.prisma.invitation.findMany({
      where: {
        publicCode: { in: publicCodes },
        building: { organizationId },
      },
      select: { publicCode: true },
    })
    const scopedCodes = new Set(
      scopedInvitations.map((invitation: { publicCode: string }) => invitation.publicCode),
    )

    if (publicCodes.some((publicCode) => !scopedCodes.has(publicCode))) {
      throw new BadRequestException(
        'Un ou plusieurs codes publics sont absents ou hors du périmètre de l’organisation',
      )
    }
  }

  private appendComment(current: string | null, user: AuthenticatedUser, comment: string): string {
    const line = `[${new Date().toISOString()}] ${user.role}:${user.id} — ${comment}`
    return current ? `${current}\n${line}` : line
  }

  private encryptExport(payload: Record<string, unknown>) {
    const iv = randomBytes(12)
    const key = this.exportKey()
    const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: 16 })
    const serialized = JSON.stringify(payload)
    const ciphertext = Buffer.concat([cipher.update(serialized, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()

    return {
      algorithm: 'aes-256-gcm',
      keyRef: this.config.get<string>('JUDICIAL_EXPORT_KEY_REF', 'env:JUDICIAL_EXPORT_KEY_B64'),
      iv: iv.toString('base64url'),
      authTag: tag.toString('base64url'),
      ciphertext: ciphertext.toString('base64url'),
    }
  }

  private exportKey(): Buffer {
    const rawKey =
      this.config.get<string>('JUDICIAL_EXPORT_KEY_B64') ||
      this.config.get<string>('EMAIL_ENCRYPTION_KEY_B64')

    if (rawKey) {
      const key = Buffer.from(rawKey, 'base64')
      if (key.length !== 32) {
        throw new BadRequestException(
          'JUDICIAL_EXPORT_KEY_B64 doit contenir 32 octets encodés en base64',
        )
      }
      return key
    }

    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new BadRequestException('JUDICIAL_EXPORT_KEY_B64 est obligatoire en production')
    }

    return createHash('sha256')
      .update(
        this.config.get<string>('DEV_JUDICIAL_EXPORT_SECRET') ??
          'development-judicial-export-key-change-me',
      )
      .digest()
  }

  private exportTtlMinutes(): number {
    const value = Number(this.config.get<string>('JUDICIAL_EXPORT_TTL_MINUTES', '60'))
    return Number.isFinite(value) ? Math.min(Math.max(Math.floor(value), 5), 1_440) : 60
  }

  private assertOrganizationScope(
    user: AuthenticatedUser,
  ): asserts user is AuthenticatedUser & { organizationId: string } {
    if (!user.organizationId) {
      throw new ForbiddenException('Compte sans organisation affectée')
    }
  }
}
