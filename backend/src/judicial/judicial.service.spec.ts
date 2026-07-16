import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))
vi.mock('../audit/audit.service', () => ({ AuditService: class AuditService {} }))
vi.mock('../identity-vault/identity-vault.service', () => ({ IdentityVaultService: class IdentityVaultService {} }))

import { JudicialService } from './judicial.service'

const dpo = { id: 'dpo-1', role: 'dpo' } as any
const legal = { id: 'legal-1', role: 'judicial_officer' } as any
const request = { ip: '127.0.0.1' } as any

const receivedRequest = {
  id: 'jr-1',
  requestReference: 'REQ-2026-001',
  requestedPublicCodes: ['ITQ-0001', 'ITQ-0002'],
  comments: null,
  status: 'received',
  dpoValidationUserId: null,
  legalValidationUserId: null,
}

function makeService(overrides: Record<string, unknown> = {}, env: Record<string, string> = {}) {
  const prisma = {
    judicialAccessRequest: {
      findMany: vi.fn(async () => [receivedRequest]),
      findUnique: vi.fn(async () => null),
      create: vi.fn(async (args: any) => ({ id: 'jr-1', ...args.data })),
      update: vi.fn(async (args: any) => ({ ...receivedRequest, ...args.data })),
    },
    ...overrides,
  }
  const audit = { log: vi.fn(async () => undefined) }
  const identityVault = {
    recordVaultAudit: vi.fn(async () => undefined),
    loadJudicialIdentityRows: vi.fn(async () => [{ publicCode: 'ITQ-0001', email: 'patient@example.test' }]),
  }
  const config = {
    get: vi.fn(<T = string>(key: string, fallback?: T) => (key in env ? env[key] as T : fallback)),
  }

  return { service: new JudicialService(prisma as any, audit as any, identityVault as any, config as any), prisma, audit, identityVault, config }
}

describe('JudicialService', () => {
  it('lists latest requests', async () => {
    const { service, prisma } = makeService()

    await expect(service.list()).resolves.toEqual([receivedRequest])
    expect(prisma.judicialAccessRequest.findMany).toHaveBeenCalledWith({ orderBy: { receivedAt: 'desc' } })
  })

  it('creates a request, normalizes public codes and records both audit trails', async () => {
    const { service, prisma, audit, identityVault } = makeService()

    const result = await service.create({
      requestReference: 'REQ-2026-001',
      legalBasisDescription: 'Réquisition',
      courtOrderReference: 'COURT-1',
      requestedPublicCodes: [' itq-0001 ', 'ITQ-0001', '', 'itq-0002'],
      requestedBy: 'Autorité',
      comments: 'Urgent',
    }, dpo, request)

    expect(prisma.judicialAccessRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      requestedPublicCodes: ['ITQ-0001', 'ITQ-0002'],
      status: 'received',
      dpoValidationUserId: 'dpo-1',
    }) })
    expect(identityVault.recordVaultAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'judicial_access.request_create' }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'judicial_access.request_create' }))
    expect(result.requestedPublicCodes).toEqual(['ITQ-0001', 'ITQ-0002'])
  })

  it('rejects duplicate request references', async () => {
    const { service } = makeService({ judicialAccessRequest: { findUnique: vi.fn(async () => receivedRequest) } })

    await expect(service.create({ requestReference: 'REQ', legalBasisDescription: 'x', requestedPublicCodes: ['ITQ-1'], requestedBy: 'x' }, dpo, request)).rejects.toBeInstanceOf(ConflictException)
  })

  it('validates DPO and legal approvals with double-control status transition', async () => {
    const { service, prisma, audit, identityVault } = makeService({
      judicialAccessRequest: {
        findUnique: vi.fn(async () => ({ ...receivedRequest, dpoValidationUserId: 'dpo-1' })),
        update: vi.fn(async (args: any) => ({ ...receivedRequest, ...args.data })),
      },
    })

    await expect(service.validateDpo('jr-1', legal, {}, request)).rejects.toBeInstanceOf(ForbiddenException)
    const result = await service.validateLegal('jr-1', legal, { comments: 'OK juridique' }, request)

    expect(prisma.judicialAccessRequest.update).toHaveBeenCalledWith({
      where: { id: 'jr-1' },
      data: expect.objectContaining({ legalValidationUserId: 'legal-1', status: 'validated', comments: expect.stringContaining('OK juridique') }),
    })
    expect(identityVault.recordVaultAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'judicial_access.validate_legal' }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'judicial_access.validate_legal' }))
    expect(result.status).toBe('validated')
  })

  it('rejects and closes requests only in valid workflow states', async () => {
    const { service, prisma } = makeService({
      judicialAccessRequest: {
        findUnique: vi.fn(async () => receivedRequest),
        update: vi.fn(async (args: any) => ({ ...receivedRequest, ...args.data })),
      },
    })

    const rejected = await service.reject('jr-1', dpo, { reason: 'hors périmètre' }, request)
    expect(rejected.status).toBe('rejected')
    expect(prisma.judicialAccessRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ comments: expect.stringContaining('hors périmètre') }) }))

    const executedOnly = makeService({ judicialAccessRequest: { findUnique: vi.fn(async () => ({ ...receivedRequest, status: 'received' })), update: vi.fn() } })
    await expect(executedOnly.service.close('jr-1', dpo, {}, request)).rejects.toBeInstanceOf(BadRequestException)
  })

  it('refuses identity export execution through the main API and records the denied attempt', async () => {
    const { service, audit, identityVault } = makeService()

    await expect(service.execute('jr-1', dpo, request)).rejects.toBeInstanceOf(ForbiddenException)
    await expect(service.execute('jr-1', legal, request)).rejects.toBeInstanceOf(ForbiddenException)

    expect(identityVault.loadJudicialIdentityRows).not.toHaveBeenCalled()
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'judicial_access.execute_denied_dpo_console_required' }))
    expect(identityVault.recordVaultAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'judicial_access.execute_denied_dpo_console_required' }))
  })
})
