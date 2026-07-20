import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { AuditService } from './audit.service'

function makeService() {
  const prisma = {
    auditLog: {
      create: vi.fn(async () => undefined),
      findMany: vi.fn(async () => [{ id: 'audit-1' }]),
    },
  }
  return { service: new AuditService(prisma as any), prisma }
}

describe('AuditService', () => {
  it('persists actor, request and metadata safely', async () => {
    const { service, prisma } = makeService()
    const request = { ip: '127.0.0.1', get: vi.fn(() => 'Vitest') } as any

    await service.log({
      actor: { id: 'user-1' } as any,
      action: 'stats.read',
      entityType: 'Questionnaire',
      entityId: 'q1',
      publicCode: 'ITQ-001',
      metadata: { threshold: 5 },
      request,
    })

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'user-1',
        action: 'stats.read',
        entityType: 'Questionnaire',
        entityId: 'q1',
        publicCode: 'ITQ-001',
        metadata: { threshold: 5 },
        ipAddress: '127.0.0.1',
        userAgent: 'Vitest',
      }),
    })
  })

  it('scopes logs by organization and caps result size', async () => {
    const { service, prisma } = makeService()

    await service.listForUser({ organizationId: 'org-1' } as any)
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1' },
      take: 100,
    }))

    await service.listForUser({ organizationId: 'org-1' } as any, 999)
    expect(prisma.auditLog.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 200 }))

    await expect(service.listForUser({ organizationId: null } as any)).resolves.toEqual([])
  })
})
