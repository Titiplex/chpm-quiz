import { createHash } from 'node:crypto'

import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import { assertCanAccessQuestionnaire } from '../common/access-scope'
import type { AuthenticatedUser } from '../auth/auth.types'
import { ObservabilityService } from '../observability/observability.service'
import { PrismaService } from '../prisma/prisma.service'

const activeInvitationStatuses = ['sent', 'opened', 'in_progress', 'draft'] as const
const draftSessionStatuses = ['draft', 'abandoned'] as const

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService,
  ) {}

  technicalRegister(user: AuthenticatedUser) {
    return {
      generatedAt: new Date().toISOString(),
      controller: 'Centre Hospitalier de Montfavet',
      dpoContact: this.config.get<string>('DPO_CONTACT', 'dpo@chpm.local'),
      consultedByRole: user.role,
      processing: [
        {
          name: 'Adaptive questionnaire management',
          finality: 'Create, publish, translate, and administer versioned questionnaires.',
          lawfulBasis: 'To be approved by the controller for the actual deployment context.',
          dataCategories: ['questionnaire metadata', 'groups', 'questions', 'adaptive rules', 'help popups'],
          recipients: ['questionnaire administrators', 'project administrators'],
          storage: 'PostgreSQL operational schema',
        },
        {
          name: 'Respondent invitations',
          finality: 'Send a unique link, track status, and prevent conflicting active invitations.',
          lawfulBasis: 'To be approved by the controller for the actual deployment context.',
          dataCategories: ['public code', 'invitation status', 'building', 'token hash', 'separately encrypted contact'],
          recipients: ['scoped moderators/site managers', 'approved delivery provider', 'DPO under exceptional procedure'],
          storage: 'status in the operational schema; encrypted contact and delivery queue in the identity schema',
        },
        {
          name: 'Responses and completion telemetry',
          finality: 'Collect responses and measure comprehension signals, duration, popup use, and form difficulty.',
          lawfulBasis: 'To be approved and presented in the versioned respondent notice.',
          dataCategories: ['pseudonymized answers', 'durations', 'popup events', 'current page', 'identifiability warnings'],
          recipients: ['authorized scoped staff', 'analysts'],
          storage: 'PostgreSQL operational schema linked only to a public code',
        },
        {
          name: 'Exceptional judicial identity access',
          finality: 'Respond to a documented lawful request through independent validation and a minimal encrypted export.',
          lawfulBasis: 'Legal obligation or other basis approved for the exact documented request.',
          dataCategories: ['request reference', 'explicit public codes', 'named validations', 'encrypted export fingerprint/expiry'],
          recipients: ['DPO', 'judicial officer', 'approved lawful recipient'],
          storage: 'operational request metadata plus identity-vault audit evidence',
        },
      ],
      safeguards: [
        'separate operational and identity schemas with distinct runtime database roles',
        'OIDC Authorization Code/PKCE with required MFA claim in production',
        'opaque HTTP-only secure session cookies and database-backed account lockout',
        'API RBAC plus organization/site/building object scope',
        'whitelisted DTO validation with unknown-field rejection',
        'encrypted direct contacts and durable delivery payloads',
        'organization-scoped operational and identity-vault audit evidence',
        'small-cell suppression across all statistical dimensions',
        'scheduled retention and export expiry',
      ],
    }
  }

  retentionPolicy() {
    const invitationDays = this.numberFromEnv('RESPONDENT_TOKEN_TTL_DAYS', 30)
    const draftDays = this.numberFromEnv('DRAFT_RETENTION_DAYS', 45)
    const identityDays = this.numberFromEnv('IDENTITY_RETENTION_DAYS', 365)
    const auditDays = this.numberFromEnv('AUDIT_RETENTION_DAYS', 730)
    const responseDays = this.numberFromEnv('RESPONSE_RETENTION_DAYS', 730)
    const exportMinutes = this.numberFromEnv('JUDICIAL_EXPORT_TTL_MINUTES', 60)

    return {
      generatedAt: new Date().toISOString(),
      rules: [
        {
          object: 'Unsubmitted invitation',
          retention: `${invitationDays} days by default`,
          action: 'expire the link and set status to expired',
          endpoint: 'POST /api/compliance/maintenance/expire-invitations',
        },
        {
          object: 'Expired respondent draft',
          retention: `${draftDays} days after last activity and invitation expiry`,
          action: 'delete the draft session and dependent draft answers/telemetry',
          endpoint: 'POST /api/compliance/maintenance/cleanup-drafts',
        },
        {
          object: 'Submitted response',
          retention: `${responseDays} days after submission`,
          action: 'delete the locked session and dependent answers, telemetry, and submission record',
          endpoint: 'scheduled worker or POST /api/compliance/maintenance/run-retention',
        },
        {
          object: 'Code-to-contact identity mapping and completed delivery jobs',
          retention: `${identityDays} days maximum unless an approved earlier action applies`,
          action: 'scrub encrypted contact/hash fields and delete expired delivery records',
          endpoint: 'scheduled worker or POST /api/compliance/maintenance/run-retention',
        },
        {
          object: 'Judicial export availability',
          retention: `${exportMinutes} minutes after execution`,
          action: 'mark export metadata deleted; recipient/local copy destruction remains procedural',
          endpoint: 'scheduled worker or POST /api/compliance/maintenance/run-retention',
        },
        {
          object: 'Operational and identity-vault audit records',
          retention: `${auditDays} days`,
          action: 'delete records after the approved accountability cutoff unless a lawful hold applies',
          endpoint: 'GET /api/audit-logs',
        },
      ],
      knownLimitations: [
        'Legal holds and deletion of provider, paper, recipient, log-platform, and backup copies require the approved external procedure.',
        'Run the scheduled retention worker on one designated API instance in a multi-replica deployment.',
        'The controller and DPO must approve the exact periods before production.',
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
    const suppressedByThreshold = submissions.length > 0 && submissions.length < threshold
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

    this.observability.recordPseudonymizedExport({
      actorRole: user.role,
      rowCount: rows.length,
      sourceRowCount: submissions.length,
      suppressedByThreshold,
      questionnaireId: questionnaire.id,
      fingerprint,
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

    if (user.buildingId && user.role !== 'admin') {
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
