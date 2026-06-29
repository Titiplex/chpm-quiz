import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { IdentityPrismaService } from '../prisma/identity-prisma.service'
import { EmailCryptoService } from '../security/email-crypto.service'
import type { IdentityVaultAccessAttemptDto } from './dto/identity-vault-access-attempt.dto'

export interface CreateEmailIdentityInput {
  invitationId: string
  publicCode: string
  email: string
  questionnaireVersionId: string
  buildingId: string
  createdByUserId: string
  request?: Request
}

export interface CreateDeliveryEventInput {
  invitationId: string
  publicCode: string
  eventType: string
  providerMessageId?: string | null
  metadata?: Record<string, unknown>
}

export interface JudicialIdentityExportRow {
  publicCode: string
  email: string
  questionnaireVersionId: string
  buildingId: string
}

@Injectable()
export class IdentityVaultService {
  constructor(
    private readonly identityPrisma: IdentityPrismaService,
    private readonly emailCryptoService: EmailCryptoService,
    private readonly auditService: AuditService,
  ) {}

  async status(user: AuthenticatedUser, request: Request) {
    await this.auditService.log({
      actor: user,
      action: 'identity_vault.status.read',
      entityType: 'IdentityVault',
      request,
      metadata: {
        currentRoleCanExecuteEmailAccess: user.role === 'judicial_officer',
        identityDisabledForOperationalApp: this.operationalIdentityAccessDisabled(),
      },
    })

    return {
      operationalSchema: 'public',
      identitySchema: 'identity',
      identityTable: 'identity.email_identities',
      model: 'IdentityVaultEntry',
      directEmailVisibleInAdmin: false,
      currentRole: user.role,
      currentRoleCanExecuteEmailAccess: user.role === 'judicial_officer',
      identityDisabledForOperationalApp: this.operationalIdentityAccessDisabled(),
      accessMode: 'workflow judiciaire uniquement, via JudicialAccessRequest doublement validée',
      audit: ['AuditLog', 'IdentityVaultAuditLog'],
    }
  }

  async recordAccessAttempt(user: AuthenticatedUser, dto: IdentityVaultAccessAttemptDto, request: Request) {
    const publicCode = dto.publicCode?.trim().toUpperCase() || null
    const action = user.role === 'judicial_officer'
      ? 'identity_vault.access_attempt_routed_to_judicial_workflow'
      : 'identity_vault.access_attempt_denied'

    await this.identityPrisma.identityVaultAuditLog.create({
      data: {
        actorUserId: user.id,
        action,
        publicCode: publicCode ?? undefined,
        ipAddress: request.ip,
        metadata: {
          role: user.role,
          justification: dto.justification ?? null,
          expectedWorkflow: 'Créer ou exécuter une JudicialAccessRequest validée ; aucun accès direct par écran admin.',
        },
      },
    })

    await this.auditService.log({
      actor: user,
      action,
      entityType: 'IdentityVault',
      publicCode,
      request,
      metadata: {
        role: user.role,
        justification: dto.justification ?? null,
      },
    })

    if (user.role !== 'judicial_officer') {
      throw new ForbiddenException('Accès au coffre email refusé : le rôle courant ne peut pas lire la correspondance code-email.')
    }

    return {
      accepted: true,
      message: 'Aucun email n’est renvoyé par cet endpoint. Utiliser le workflow JudicialAccessRequest validé et audité.',
      nextStep: '/api/judicial-access/requests',
    }
  }

  async hasExistingIdentityForEmail(questionnaireVersionId: string, email: string): Promise<boolean> {
    const normalizedEmail = this.emailCryptoService.normalize(email)
    const emailHash = this.emailCryptoService.hashEmail(normalizedEmail)
    const existing = await this.identityPrisma.identityVaultEntry.findFirst({
      where: {
        questionnaireVersionId,
        emailHash,
        deletedAt: null,
      },
      select: { id: true },
    })

    return Boolean(existing)
  }

  async createEmailIdentity(input: CreateEmailIdentityInput): Promise<void> {
    const normalizedEmail = this.emailCryptoService.normalize(input.email)
    const emailHash = this.emailCryptoService.hashEmail(normalizedEmail)

    await this.identityPrisma.$transaction(async (tx: any) => {
      await tx.identityVaultEntry.create({
        data: {
          invitationId: input.invitationId,
          uniqueCode: input.publicCode,
          encryptedEmail: this.emailCryptoService.encryptEmail(normalizedEmail),
          emailHash,
          questionnaireVersionId: input.questionnaireVersionId,
          buildingId: input.buildingId,
          createdByUserId: input.createdByUserId,
        },
      })

      await tx.identityVaultAuditLog.create({
        data: {
          actorUserId: input.createdByUserId,
          action: 'email_identity.create',
          publicCode: input.publicCode,
          ipAddress: input.request?.ip,
          metadata: {
            questionnaireVersionId: input.questionnaireVersionId,
            buildingId: input.buildingId,
          },
        },
      })
    })
  }

  async loadOutboundEmailForInvitation(invitationId: string): Promise<{ email: string; maskedEmail: string; publicCode: string } | null> {
    const identity = await this.identityPrisma.identityVaultEntry.findUnique({
      where: { invitationId },
      select: { encryptedEmail: true, uniqueCode: true, deletedAt: true },
    })

    if (!identity || identity.deletedAt) {
      return null
    }

    const email = this.emailCryptoService.decryptEmail(identity.encryptedEmail)
    return {
      email,
      maskedEmail: this.emailCryptoService.maskEmail(email),
      publicCode: identity.uniqueCode,
    }
  }

  async markOutboundEmailSent(invitationId: string, sentAt = new Date()): Promise<void> {
    await this.identityPrisma.identityVaultEntry.update({
      where: { invitationId },
      data: { lastEmailSentAt: sentAt },
    }).catch(() => undefined)
  }

  async recordDeliveryEvent(input: CreateDeliveryEventInput): Promise<void> {
    await this.identityPrisma.emailDeliveryEvent.create({
      data: {
        invitationId: input.invitationId,
        publicCode: input.publicCode,
        eventType: input.eventType,
        providerMessageId: input.providerMessageId ?? undefined,
        metadata: input.metadata,
      },
    })
  }


  async listDeliveryEventsForDigest(since: Date, until: Date): Promise<Array<{ publicCode: string, metadata: unknown }>> {
    return this.identityPrisma.emailDeliveryEvent.findMany({
      where: {
        eventType: 'notification_digest_queued',
        occurredAt: { gt: since, lte: until },
      },
      orderBy: { occurredAt: 'asc' },
      select: {
        publicCode: true,
        metadata: true,
      },
    })
  }

  async recordVaultAudit(input: {
    actorUserId?: string | null
    action: string
    publicCode?: string | null
    requestId?: string | null
    ipAddress?: string | null
    metadata?: Record<string, unknown>
  }): Promise<void> {
    await this.identityPrisma.identityVaultAuditLog.create({
      data: {
        actorUserId: input.actorUserId ?? undefined,
        action: input.action,
        publicCode: input.publicCode ?? undefined,
        requestId: input.requestId ?? undefined,
        ipAddress: input.ipAddress ?? undefined,
        metadata: input.metadata,
      },
    })
  }

  async loadJudicialIdentityRows(publicCodes: string[]): Promise<JudicialIdentityExportRow[]> {
    if (!publicCodes.length) {
      return []
    }

    const identityVaultEntries = await this.identityPrisma.identityVaultEntry.findMany({
      where: {
        uniqueCode: { in: publicCodes },
        deletedAt: null,
      },
      orderBy: { uniqueCode: 'asc' },
    })

    return identityVaultEntries.map((identity: any) => ({
      publicCode: identity.uniqueCode,
      email: this.emailCryptoService.decryptEmail(identity.encryptedEmail),
      questionnaireVersionId: identity.questionnaireVersionId,
      buildingId: identity.buildingId,
    }))
  }

  assertOperationalIdentityAccessDisabled(): void {
    if (this.operationalIdentityAccessDisabled()) {
      throw new ServiceUnavailableException(
        'EMAIL_IDENTITY_DISABLED_FOR_APP=true : accès identité désactivé pour les services métier applicatifs.',
      )
    }
  }

  private operationalIdentityAccessDisabled(): boolean {
    return process.env.EMAIL_IDENTITY_DISABLED_FOR_APP === 'true'
  }
}
