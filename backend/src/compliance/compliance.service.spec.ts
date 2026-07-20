import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))
vi.mock('../audit/audit.service', () => ({ AuditService: class AuditService {} }))
vi.mock('../observability/observability.service', () => ({ ObservabilityService: class ObservabilityService {} }))

import { ComplianceService } from './compliance.service'

const adminUser = { id: 'admin-1', role: 'admin', organizationId: 'org-1', siteId: null, buildingId: null } as any
const dpoUser = { ...adminUser, id: 'dpo-1', role: 'dpo' } as any
const siteUser = { ...adminUser, id: 'site-1', role: 'site_manager', siteId: 'site-1' } as any
const analystUser = { ...adminUser, id: 'analyst-1', role: 'analyst' } as any

const questionnaire = { id: 'q1', code: 'ITQ', title: 'ITQ', organizationId: 'org-1' }
const submission = {
  id: 'submission-1',
  publicCode: 'ITQ-0001',
  questionnaireVersionId: 'v1',
  questionnaireVersion: { id: 'v1', versionLabel: '1.0' },
  building: { code: 'B1', label: 'Bâtiment 1' },
  submittedAt: new Date('2026-01-02T03:04:05Z'),
  answerCount: 2,
  responseSession: {
    telemetryEvents: [{ id: 'event-1' }],
    answers: [
      { value: 'Oui', identifiabilityWarning: false, warningReason: null, question: { code: 'Q1', responseType: 'likert' } },
      { value: 'Je m’appelle Jean', identifiabilityWarning: true, warningReason: 'nom propre', question: { code: 'Q2', responseType: 'free_text' } },
    ],
  },
}

function makeService(overrides: Record<string, unknown> = {}, env: Record<string, string> = {}) {
  const prisma = {
    invitation: { updateMany: vi.fn(async () => ({ count: 2 })) },
    responseSession: { deleteMany: vi.fn(async () => ({ count: 3 })) },
    questionnaire: {
      findUnique: vi.fn(async () => questionnaire),
      findFirst: vi.fn(async () => questionnaire),
    },
    submission: { findMany: vi.fn(async () => [submission]) },
    ...overrides,
  }
  const audit = { log: vi.fn(async () => undefined) }
  const observability = { recordPseudonymizedExport: vi.fn() }
  const config = { get: vi.fn(<T = string>(key: string, fallback?: T) => (key in env ? env[key] as T : fallback)) }

  return { service: new ComplianceService(prisma as any, audit as any, config as any, observability as any), prisma, audit, observability, config }
}

describe('ComplianceService', () => {
  it('builds technical register and retention policy from environment values', () => {
    const { service } = makeService({}, {
      DPO_CONTACT: 'dpo@example.test',
      RESPONDENT_TOKEN_TTL_DAYS: '12',
      DRAFT_RETENTION_DAYS: '34',
      IDENTITY_RETENTION_DAYS: '56',
      AUDIT_RETENTION_DAYS: '78',
      RESPONSE_RETENTION_DAYS: '90',
      JUDICIAL_EXPORT_TTL_MINUTES: '15',
    })

    expect(service.technicalRegister(dpoUser)).toMatchObject({
      controller: 'Centre Hospitalier de Montfavet',
      dpoContact: 'dpo@example.test',
      consultedByRole: 'dpo',
    })
    expect(service.technicalRegister(dpoUser).processing).toHaveLength(4)

    const policy = service.retentionPolicy()
    expect(policy.rules.map((rule) => rule.retention)).toEqual([
      '12 days by default',
      '34 days after last activity and invitation expiry',
      '90 days after submission',
      '56 days maximum unless an approved earlier action applies',
      '15 minutes after execution',
      '78 days',
    ])
  })

  it('expires overdue invitations and audits the maintenance action', async () => {
    const { service, prisma, audit } = makeService()

    const result = await service.expireInvitations(adminUser, { ip: '127.0.0.1' } as any)

    expect(prisma.invitation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ['sent', 'opened', 'in_progress', 'draft'] }, expiresAt: { lt: expect.any(Date) } }),
      data: { status: 'expired' },
    }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'compliance.expire_invitations', metadata: { expiredCount: 2 } }))
    expect(result).toMatchObject({ expiredCount: 2 })
  })

  it('cleans expired drafts using the configured retention window', async () => {
    const { service, prisma, audit } = makeService({}, { DRAFT_RETENTION_DAYS: '10' })

    const result = await service.cleanupExpiredDrafts(adminUser, {} as any)

    expect(prisma.responseSession.deleteMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: ['draft', 'abandoned'] }, submittedAt: null }),
    }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'compliance.cleanup_expired_drafts' }))
    expect(result.deletedDraftSessionCount).toBe(3)
  })

  it('suppresses pseudonymized export rows below threshold for non-DPO users', async () => {
    const { service, audit, observability } = makeService({}, { STATISTICS_MIN_GROUP_SIZE: '5' })

    const result = await service.pseudonymizedExport('q1', adminUser, {} as any)

    expect(result).toMatchObject({ rowCount: 0, sourceRowCount: 1, suppressedByThreshold: true, displayValue: 'effectif insuffisant', containsDirectEmail: false })
    expect(result.rows).toEqual([])
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'compliance.pseudonymized_export' }))
    expect(observability.recordPseudonymizedExport).toHaveBeenCalledWith(expect.objectContaining({ rowCount: 0, sourceRowCount: 1, suppressedByThreshold: true }))
  })

  it('exports redacted pseudonymized rows only when the anti-reidentification threshold is satisfied', async () => {
    const { service } = makeService({}, { STATISTICS_MIN_GROUP_SIZE: '1' })

    const result = await service.pseudonymizedExport(undefined, analystUser, {} as any)

    expect(result.suppressedByThreshold).toBe(false)
    expect(result.containsDirectEmail).toBe(false)
    expect(result.identityVaultExcluded).toBe(true)
    expect(result.rows[0]).toMatchObject({
      publicCode: 'ITQ-0001',
      questionnaireCode: 'ITQ',
      telemetryEventCount: 1,
      answers: [
        { questionCode: 'Q1', value: 'Oui', warning: null },
        { questionCode: 'Q2', value: '[REDACTED_IDENTIFIABILITY_WARNING]', warning: 'nom propre' },
      ],
    })
    expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/)
  })

  it('scopes exports for site managers and rejects missing questionnaires', async () => {
    const { service, prisma } = makeService({ questionnaire: { findUnique: vi.fn(async () => null), findFirst: vi.fn(async () => null) } })
    await expect(service.pseudonymizedExport('missing', adminUser, {} as any)).rejects.toBeInstanceOf(NotFoundException)

    const scoped = makeService()
    await scoped.service.pseudonymizedExport('q1', siteUser, {} as any)
    expect(scoped.prisma.submission.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ building: { siteId: 'site-1' } }) }))
    expect(prisma.questionnaire.findUnique).toHaveBeenCalledWith({ where: { id: 'missing' } })
  })
})
