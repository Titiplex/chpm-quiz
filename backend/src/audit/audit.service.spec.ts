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

  it('returns the complete list by default and honors an explicit positive limit', async () => {
    const { service, prisma } = makeService()

    await service.list()
    const completeQuery = (prisma.auditLog.findMany as any).mock.calls[0][0]
    expect(completeQuery).not.toHaveProperty('take')

    await service.list(999)
    expect(prisma.auditLog.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ take: 999 }))

    await service.list(-5)
    const invalidLimitQuery = (prisma.auditLog.findMany as any).mock.calls.at(-1)[0]
    expect(invalidLimitQuery).not.toHaveProperty('take')
  })
})
