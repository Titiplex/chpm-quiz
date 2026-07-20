import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))
vi.mock('../identity-vault/identity-vault.service', () => ({
  IdentityVaultService: class IdentityVaultService {},
}))

import { ComplianceMaintenanceService } from './compliance-maintenance.service'

describe('ComplianceMaintenanceService', () => {
  it('runs the complete retention cycle with independently configured cutoffs', async () => {
    const prisma = {
      invitation: { updateMany: vi.fn(async () => ({ count: 1 })) },
      responseSession: {
        deleteMany: vi.fn().mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 3 }),
      },
      auditLog: { deleteMany: vi.fn(async () => ({ count: 4 })) },
      judicialAccessRequest: { updateMany: vi.fn(async () => ({ count: 5 })) },
    }
    const identityVault = {
      purgeByRetention: vi.fn(async () => ({
        anonymizedIdentityCount: 6,
        deletedDeliveryEventCount: 7,
        deletedDeliveryJobCount: 8,
        deletedIdentityAuditCount: 9,
      })),
    }
    const values: Record<string, string> = {
      DRAFT_RETENTION_DAYS: '30',
      IDENTITY_RETENTION_DAYS: '90',
      AUDIT_RETENTION_DAYS: '365',
      RESPONSE_RETENTION_DAYS: '730',
    }
    const config = { get: vi.fn((key: string, fallback?: string) => values[key] ?? fallback) }
    const audit = { log: vi.fn(async () => undefined) }
    const service = new ComplianceMaintenanceService(
      prisma as any,
      identityVault as any,
      config as any,
      audit as any,
    )

    const actor = { id: 'tech-1', role: 'technical_admin', organizationId: 'org-1' } as any
    const result = await service.runOnce(actor)

    expect(result).toMatchObject({
      skipped: false,
      expiredInvitationCount: 1,
      deletedDraftSessionCount: 2,
      deletedSubmittedSessionCount: 3,
      deletedAuditCount: 4,
      expiredExportCount: 5,
      anonymizedIdentityCount: 6,
      deletedDeliveryJobCount: 8,
    })
    expect(prisma.responseSession.deleteMany).toHaveBeenNthCalledWith(2, {
      where: { status: 'locked', submittedAt: { lt: expect.any(Date) } },
    })
    expect(identityVault.purgeByRetention).toHaveBeenCalledWith(
      expect.any(Date),
      expect.any(Date),
      expect.any(Date),
    )
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actor,
        action: 'compliance.retention_cycle',
        entityType: 'RetentionCycle',
      }),
    )
  })
})
