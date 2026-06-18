import { createHash } from 'node:crypto'

import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import { assertCanAccessQuestionnaire } from '../common/access-scope'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'

const activeInvitationStatuses = ['sent', 'opened', 'in_progress', 'draft'] as const
const draftSessionStatuses = ['draft', 'abandoned'] as const

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
  ) {}

  technicalRegister(user: AuthenticatedUser) {
    return {
      generatedAt: new Date().toISOString(),
      controller: 'Centre Hospitalier de Montfavet',
      dpoContact: this.config.get<string>('DPO_CONTACT', 'dpo@chpm.local'),
      consultedByRole: user.role,
      processing: [
        {
          name: 'Gestion des questionnaires adaptatifs',
          finality: 'Créer, publier et administrer des questionnaires métier versionnés.',
          lawfulBasis: 'Intérêt légitime / mission d’intérêt public selon le contexte de déploiement.',
          dataCategories: ['métadonnées questionnaire', 'groupes', 'questions', 'règles adaptatives', 'popups'],
          recipients: ['administrateurs questionnaire', 'administrateurs globaux'],
          storage: 'schéma public PostgreSQL',
        },
        {
          name: 'Invitations répondants',
          finality: 'Envoyer un lien unique, suivre les statuts et empêcher les doublons actifs.',
          lawfulBasis: 'Intérêt légitime / mission d’intérêt public selon le contexte de déploiement.',
          dataCategories: ['code public', 'statut invitation', 'bâtiment', 'hash de jeton', 'email chiffré séparé'],
          recipients: ['modérateurs périmétrés', 'DPO', 'responsable judiciaire sous procédure'],
          storage: 'statuts en public, email chiffré dans le schéma identity',
        },
        {
          name: 'Réponses et télémétrie de passation',
          finality: 'Mesurer la compréhension, les temps, les ouvertures de popups et les difficultés de formulaire.',
          lawfulBasis: 'Information préalable et poursuite volontaire du questionnaire.',
          dataCategories: ['réponses pseudonymisées', 'durées', 'événements popup', 'page courante', 'alertes identifiabilité'],
          recipients: ['administrateurs habilités', 'analystes', 'DPO'],
          storage: 'schéma public PostgreSQL, relié au code public uniquement',
        },
        {
          name: 'Accès judiciaire exceptionnel',
          finality: 'Répondre à une réquisition simulée avec double validation et export minimal chiffré.',
          lawfulBasis: 'Obligation légale uniquement sur demande documentée.',
          dataCategories: ['référence demande', 'codes publics', 'validations', 'empreinte export'],
          recipients: ['DPO', 'responsable accès judiciaire'],
          storage: 'schéma public + traces identity.vault_audit_logs',
        },
      ],
      safeguards: [
        'séparation logique public/identity',
        'cookies de session HTTP-only',
        'RBAC côté API et côté routeur',
        'ValidationPipe whitelist + rejet des champs inconnus',
        'rate limiting mémoire basique par IP',
        'audit des opérations sensibles',
        'seuils anti-réidentification sur les statistiques',
      ],
    }
  }

  retentionPolicy() {
    const invitationDays = this.numberFromEnv('RESPONDENT_TOKEN_TTL_DAYS', 30)
    const draftDays = this.numberFromEnv('DRAFT_RETENTION_DAYS', 45)
    const identityDays = this.numberFromEnv('IDENTITY_RETENTION_DAYS', 365)
    const auditDays = this.numberFromEnv('AUDIT_RETENTION_DAYS', 730)

    return {
      generatedAt: new Date().toISOString(),
      rules: [
        {
          object: 'Invitation non soumise',
          retention: `${invitationDays} jours par défaut`,
          action: 'expiration automatique du lien et passage au statut expired',
          endpoint: 'POST /api/compliance/maintenance/expire-invitations',
        },
        {
          object: 'Brouillon répondant expiré',
          retention: `${draftDays} jours après dernière activité ou expiration`,
          action: 'suppression de la session brouillon et des réponses brouillon associées',
          endpoint: 'POST /api/compliance/maintenance/cleanup-drafts',
        },
        {
          object: 'Correspondance email-code',
          retention: `${identityDays} jours maximum ou suppression anticipée validée`,
          action: 'marquage deletionScheduledAt puis anonymisation/suppression physique selon procédure DPO',
          endpoint: 'workflow DPO / judicial-access uniquement',
        },
        {
          object: 'Journaux d’audit',
          retention: `${auditDays} jours`,
          action: 'conservation longue pour preuve de conformité et contrôle judiciaire',
          endpoint: 'GET /api/audit-logs',
        },
      ],
      knownLimitations: [
        'La suppression physique planifiée doit être exécutée par un job serveur en production.',
        'Le rate limiting mémoire convient au MVP, pas à un cluster multi-instances.',
        'Les durées exactes doivent être validées juridiquement avant production.',
      ],
    }
  }

  async expireInvitations(user: AuthenticatedUser, request: Request) {
    const now = new Date()
    const result = await this.prisma.invitation.updateMany({
      where: {
        status: { in: [...activeInvitationStatuses] },
        expiresAt: { lt: now },
      },
      data: {
        status: 'expired',
      },
    })

    await this.auditService.log({
      actor: user,
      action: 'compliance.expire_invitations',
      entityType: 'Invitation',
      request,
      metadata: { expiredCount: result.count },
    })

    return {
      expiredCount: result.count,
      executedAt: now.toISOString(),
    }
  }

  async cleanupExpiredDrafts(user: AuthenticatedUser, request: Request) {
    const cutoff = new Date(Date.now() - this.numberFromEnv('DRAFT_RETENTION_DAYS', 45) * 24 * 60 * 60 * 1000)
    const result = await this.prisma.responseSession.deleteMany({
      where: {
        status: { in: [...draftSessionStatuses] },
        submittedAt: null,
        lastSeenAt: { lt: cutoff },
        invitation: {
          OR: [
            { status: 'expired' },
            { expiresAt: { lt: new Date() } },
          ],
        },
      },
    })

    await this.auditService.log({
      actor: user,
      action: 'compliance.cleanup_expired_drafts',
      entityType: 'ResponseSession',
      request,
      metadata: { deletedDraftSessionCount: result.count, cutoff: cutoff.toISOString() },
    })

    return {
      deletedDraftSessionCount: result.count,
      cutoff: cutoff.toISOString(),
      executedAt: new Date().toISOString(),
    }
  }

  async pseudonymizedExport(questionnaireId: string | undefined, user: AuthenticatedUser, request: Request) {
    const questionnaire = questionnaireId
      ? await this.prisma.questionnaire.findUnique({ where: { id: questionnaireId } })
      : await this.prisma.questionnaire.findFirst({
          where: this.questionnaireWhereForUser(user),
          orderBy: { createdAt: 'asc' },
        })

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire introuvable pour export pseudonymisé')
    }

    assertCanAccessQuestionnaire(user, questionnaire)

    const submissions = await this.prisma.submission.findMany({
      where: {
        questionnaireVersion: {
          questionnaireId: questionnaire.id,
        },
        ...this.submissionWhereForUser(user),
      },
      include: {
        building: true,
        questionnaireVersion: true,
        responseSession: {
          include: {
            answers: {
              include: { question: true },
              orderBy: { createdAt: 'asc' },
            },
            telemetryEvents: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    })

    const threshold = this.statisticsThreshold()
    const suppressedByThreshold = submissions.length > 0 && submissions.length < threshold && user.role !== 'dpo'
    const rows = suppressedByThreshold
      ? []
      : submissions.map((submission: any) => ({
          publicCode: submission.publicCode,
          questionnaireId: questionnaire.id,
          questionnaireCode: questionnaire.code,
          versionId: submission.questionnaireVersionId,
          versionLabel: submission.questionnaireVersion.versionLabel,
          buildingCode: submission.building.code,
          buildingLabel: submission.building.label,
          submittedAt: submission.submittedAt,
          answerCount: submission.answerCount,
          telemetryEventCount: submission.responseSession.telemetryEvents.length,
          answers: submission.responseSession.answers.map((answer: any) => ({
            questionCode: answer.question.code,
            responseType: answer.question.responseType,
            value: answer.identifiabilityWarning ? '[REDACTED_IDENTIFIABILITY_WARNING]' : answer.value,
            warning: answer.identifiabilityWarning ? answer.warningReason : null,
          })),
        }))

    const fingerprint = createHash('sha256').update(JSON.stringify(rows)).digest('hex')

    await this.auditService.log({
      actor: user,
      action: 'compliance.pseudonymized_export',
      entityType: 'Questionnaire',
      entityId: questionnaire.id,
      request,
      metadata: {
        rowCount: rows.length,
        sourceRowCount: submissions.length,
        suppressedByThreshold,
        threshold,
        fingerprint,
        scope: {
          organizationId: user.organizationId,
          siteId: user.siteId,
          buildingId: user.buildingId,
        },
      },
    })

    return {
      generatedAt: new Date().toISOString(),
      generatedByRole: user.role,
      questionnaire: {
        id: questionnaire.id,
        code: questionnaire.code,
        title: questionnaire.title,
      },
      rowCount: rows.length,
      sourceRowCount: submissions.length,
      containsDirectEmail: false,
      identityVaultExcluded: true,
      threshold,
      suppressedByThreshold,
      displayValue: suppressedByThreshold ? 'effectif insuffisant' : `${rows.length} ligne(s) exportée(s)`,
      fingerprint,
      rows,
    }
  }


  private questionnaireWhereForUser(user: AuthenticatedUser) {
    if (!user.organizationId) {
      return undefined
    }

    return { organizationId: user.organizationId }
  }

  private submissionWhereForUser(user: AuthenticatedUser) {
    if (user.role === 'site_manager' && user.siteId) {
      return { building: { siteId: user.siteId } }
    }

    if (user.buildingId && user.role !== 'admin' && user.role !== 'dpo') {
      return { buildingId: user.buildingId }
    }

    if (user.organizationId) {
      return { building: { organizationId: user.organizationId } }
    }

    return {}
  }

  private statisticsThreshold(): number {
    return this.numberFromEnv('STATISTICS_MIN_GROUP_SIZE', 5)
  }

  private numberFromEnv(key: string, fallback: number): number {
    const value = Number(this.config.get<string>(key, String(fallback)))
    return Number.isFinite(value) && value > 0 ? value : fallback
  }
}
