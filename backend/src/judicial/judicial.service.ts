import { createCipheriv, createHash, randomBytes } from 'node:crypto'

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import { EmailCryptoService } from '../security/email-crypto.service'
import type { CreateJudicialRequestDto } from './dto/create-judicial-request.dto'
import type { JudicialWorkflowCommentDto, RejectJudicialRequestDto } from './dto/judicial-workflow.dto'

@Injectable()
export class JudicialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailCryptoService: EmailCryptoService,
    private readonly config: ConfigService,
  ) {}

  async list() {
    return this.prisma.judicialAccessRequest.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 100,
    })
  }

  async create(dto: CreateJudicialRequestDto, user: AuthenticatedUser, request: Request) {
    const existing = await this.prisma.judicialAccessRequest.findUnique({
      where: { requestReference: dto.requestReference },
    })

    if (existing) {
      throw new ConflictException('Cette référence de demande existe déjà')
    }

    const requestedPublicCodes = this.normalizePublicCodes(dto.requestedPublicCodes)

    const created = await this.prisma.$transaction(async (tx: any) => {
      const judicialRequest = await tx.judicialAccessRequest.create({
        data: {
          requestReference: dto.requestReference,
          legalBasisDescription: dto.legalBasisDescription,
          courtOrderReference: dto.courtOrderReference,
          requestedPublicCodes,
          requestedBy: dto.requestedBy,
          comments: dto.comments,
          status: 'received',
          dpoValidationUserId: user.role === 'dpo' ? user.id : undefined,
        },
      })

      await tx.identityVaultAuditLog.create({
        data: {
          actorUserId: user.id,
          action: 'judicial_access.request_create',
          requestId: judicialRequest.id,
          ipAddress: request.ip,
          metadata: {
            requestReference: dto.requestReference,
            requestedPublicCodeCount: requestedPublicCodes.length,
          },
        },
      })

      return judicialRequest
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

  async validateDpo(id: string, user: AuthenticatedUser, dto: JudicialWorkflowCommentDto, request: Request) {
    if (user.role !== 'dpo' && user.role !== 'admin') {
      throw new ForbiddenException('Validation DPO réservée au DPO ou à un administrateur global habilité')
    }

    return this.validate(id, user, dto, request, 'dpo')
  }

  async validateLegal(id: string, user: AuthenticatedUser, dto: JudicialWorkflowCommentDto, request: Request) {
    if (user.role !== 'judicial_officer' && user.role !== 'admin') {
      throw new ForbiddenException('Validation juridique réservée au responsable accès judiciaire')
    }

    return this.validate(id, user, dto, request, 'legal')
  }

  async reject(id: string, user: AuthenticatedUser, dto: RejectJudicialRequestDto, request: Request) {
    const judicialRequest = await this.getRequest(id)

    if (judicialRequest.status === 'executed' || judicialRequest.status === 'closed') {
      throw new BadRequestException('Une demande exécutée ou clôturée ne peut plus être rejetée')
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const record = await tx.judicialAccessRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          comments: this.appendComment(judicialRequest.comments, user, dto.reason || dto.comments || 'Rejet sans motif détaillé'),
        },
      })

      await tx.identityVaultAuditLog.create({
        data: {
          actorUserId: user.id,
          action: 'judicial_access.reject',
          requestId: id,
          ipAddress: request.ip,
          metadata: { reason: dto.reason },
        },
      })

      return record
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
    if (user.role !== 'judicial_officer' && user.role !== 'admin') {
      throw new ForbiddenException('Exécution réservée au responsable accès judiciaire')
    }

    const judicialRequest = await this.getRequest(id)

    if (judicialRequest.status !== 'validated') {
      throw new BadRequestException('La demande doit avoir une validation DPO et une validation juridique avant exécution')
    }

    if (!judicialRequest.dpoValidationUserId || !judicialRequest.legalValidationUserId) {
      throw new BadRequestException('Double validation incomplète : DPO et juridique sont obligatoires')
    }

    const emailIdentities = await this.prisma.emailIdentity.findMany({
      where: {
        publicCode: { in: judicialRequest.requestedPublicCodes },
        deletedAt: null,
      },
      orderBy: { publicCode: 'asc' },
    })

    const rows = emailIdentities.map((identity: any) => ({
      publicCode: identity.publicCode,
      email: this.emailCryptoService.decryptEmail(identity.emailCiphertext),
      questionnaireVersionId: identity.questionnaireVersionId,
      buildingId: identity.buildingId,
    }))

    const exportPayload = {
      requestReference: judicialRequest.requestReference,
      exportedAt: new Date().toISOString(),
      rowCount: rows.length,
      rows,
    }
    const encryptedExport = this.encryptExport(exportPayload)
    const exportFingerprint = createHash('sha256').update(encryptedExport.ciphertext).digest('hex')

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const record = await tx.judicialAccessRequest.update({
        where: { id },
        data: {
          status: 'executed',
          executedAt: new Date(),
          executedByUserId: user.id,
          exportFingerprint,
          comments: this.appendComment(judicialRequest.comments, user, `Export minimal chiffré exécuté (${rows.length} ligne(s)).`),
        },
      })

      await tx.identityVaultAuditLog.create({
        data: {
          actorUserId: user.id,
          action: 'judicial_access.execute',
          requestId: id,
          ipAddress: request.ip,
          metadata: {
            requestReference: judicialRequest.requestReference,
            requestedPublicCodeCount: judicialRequest.requestedPublicCodes.length,
            exportedRowCount: rows.length,
            exportFingerprint,
          },
        },
      })

      return record
    })

    await this.auditService.log({
      actor: user,
      action: 'judicial_access.execute',
      entityType: 'JudicialAccessRequest',
      entityId: id,
      request,
      metadata: {
        requestReference: judicialRequest.requestReference,
        requestedPublicCodeCount: judicialRequest.requestedPublicCodes.length,
        exportedRowCount: rows.length,
        exportFingerprint,
      },
    })

    return {
      judicialRequest: updated,
      encryptedExport: {
        ...encryptedExport,
        fingerprint: exportFingerprint,
        expiresInMinutes: 15,
        warning: 'Exporter immédiatement vers le coffre documentaire. Le serveur ne conserve pas le contenu de l’export.',
      },
    }
  }

  async close(id: string, user: AuthenticatedUser, dto: JudicialWorkflowCommentDto, request: Request) {
    const judicialRequest = await this.getRequest(id)

    if (judicialRequest.status !== 'executed') {
      throw new BadRequestException('Seule une demande exécutée peut être clôturée')
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const record = await tx.judicialAccessRequest.update({
        where: { id },
        data: {
          status: 'closed',
          comments: this.appendComment(judicialRequest.comments, user, dto.comments || 'Clôture de la procédure.'),
        },
      })

      await tx.identityVaultAuditLog.create({
        data: {
          actorUserId: user.id,
          action: 'judicial_access.close',
          requestId: id,
          ipAddress: request.ip,
          metadata: { requestReference: judicialRequest.requestReference },
        },
      })

      return record
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
    const judicialRequest = await this.getRequest(id)

    if (judicialRequest.status !== 'received' && judicialRequest.status !== 'validated') {
      throw new BadRequestException('Seule une demande reçue peut être validée')
    }

    const data = validationType === 'dpo'
      ? { dpoValidationUserId: user.id }
      : { legalValidationUserId: user.id }

    const nextDpoId = validationType === 'dpo' ? user.id : judicialRequest.dpoValidationUserId
    const nextLegalId = validationType === 'legal' ? user.id : judicialRequest.legalValidationUserId
    const nextStatus = nextDpoId && nextLegalId ? 'validated' : judicialRequest.status

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const record = await tx.judicialAccessRequest.update({
        where: { id },
        data: {
          ...data,
          status: nextStatus,
          comments: this.appendComment(judicialRequest.comments, user, dto.comments || `Validation ${validationType}.`),
        },
      })

      await tx.identityVaultAuditLog.create({
        data: {
          actorUserId: user.id,
          action: `judicial_access.validate_${validationType}`,
          requestId: id,
          ipAddress: request.ip,
          metadata: { requestReference: judicialRequest.requestReference },
        },
      })

      return record
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

  private async getRequest(id: string) {
    const judicialRequest = await this.prisma.judicialAccessRequest.findUnique({ where: { id } })

    if (!judicialRequest) {
      throw new NotFoundException('Demande judiciaire introuvable')
    }

    return judicialRequest
  }

  private normalizePublicCodes(publicCodes: string[]): string[] {
    return Array.from(new Set(publicCodes.map((code) => code.trim().toUpperCase()).filter(Boolean)))
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
    const rawKey = this.config.get<string>('JUDICIAL_EXPORT_KEY_B64') || this.config.get<string>('EMAIL_ENCRYPTION_KEY_B64')

    if (rawKey) {
      const key = Buffer.from(rawKey, 'base64')
      if (key.length !== 32) {
        throw new BadRequestException('JUDICIAL_EXPORT_KEY_B64 doit contenir 32 octets encodés en base64')
      }
      return key
    }

    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new BadRequestException('JUDICIAL_EXPORT_KEY_B64 est obligatoire en production')
    }

    return createHash('sha256')
      .update(this.config.get<string>('DEV_JUDICIAL_EXPORT_SECRET') ?? 'development-judicial-export-key-change-me')
      .digest()
  }
}
