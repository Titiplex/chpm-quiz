import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import type { AuthenticatedUser } from '../auth/auth.types'
import { IdentityVaultService } from './identity-vault.service'

function user(role: AuthenticatedUser['role']): AuthenticatedUser {
  return {
    id: `user-${role}`,
    email: `${role}@chpm.local`,
    displayName: role,
    role,
    organizationId: 'org-1',
    siteId: null,
    buildingId: null,
    isActive: true,
    building: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

describe('IdentityVaultService authorization', () => {
  function makeService() {
    const identityPrisma = {
      identityVaultAuditLog: { create: vi.fn(async () => ({ id: 'audit-1' })) },
      identityVaultEntry: {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
      },
      emailDeliveryEvent: { create: vi.fn(), findMany: vi.fn() },
      $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(identityPrisma)),
    }
    const emailCrypto = {
      normalize: vi.fn((email: string) => email.trim().toLowerCase()),
      hashEmail: vi.fn(() => 'hash'),
      encryptEmail: vi.fn(() => 'cipher'),
      decryptEmail: vi.fn(() => 'patient@example.org'),
    }
    const audit = { log: vi.fn(async () => undefined) }
    const service = new IdentityVaultService(identityPrisma as any, emailCrypto as any, audit as any)
    return { service, identityPrisma, audit }
  }

  it('refuses direct code-email access for an application admin', async () => {
    const { service, identityPrisma } = makeService()

    await expect(service.recordAccessAttempt(user('admin'), { publicCode: 'ABCD-1234', justification: 'Tentative directe hors procédure.' }, { ip: '127.0.0.1' } as any))
      .rejects
      .toBeInstanceOf(ForbiddenException)

    expect(identityPrisma.identityVaultAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'identity_vault.access_attempt_denied' }),
    }))
  })

  it('routes judicial officers to the formal judicial workflow without returning email', async () => {
    const { service } = makeService()

    const result = await service.recordAccessAttempt(user('judicial_officer'), { publicCode: 'ABCD-1234', justification: 'Demande judiciaire documentée.' }, { ip: '127.0.0.1' } as any)

    expect(result).toEqual(expect.objectContaining({ accepted: true }))
    expect(JSON.stringify(result)).not.toContain('patient@example.org')
  })
})
