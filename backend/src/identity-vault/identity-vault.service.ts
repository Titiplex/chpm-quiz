import { ForbiddenException, Injectable } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'
import type { IdentityVaultAccessAttemptDto } from './dto/identity-vault-access-attempt.dto'

@Injectable()
export class IdentityVaultService {
  constructor(
    private readonly prisma: PrismaService,
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
      accessMode: 'workflow judiciaire uniquement, via JudicialAccessRequest doublement validée',
      audit: ['AuditLog', 'IdentityVaultAuditLog'],
    }
  }

  async recordAccessAttempt(user: AuthenticatedUser, dto: IdentityVaultAccessAttemptDto, request: Request) {
    const publicCode = dto.publicCode?.trim().toUpperCase() || null
    const action = user.role === 'judicial_officer'
      ? 'identity_vault.access_attempt_routed_to_judicial_workflow'
      : 'identity_vault.access_attempt_denied'

    await this.prisma.identityVaultAuditLog.create({
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
}
