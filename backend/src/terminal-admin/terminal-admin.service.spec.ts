import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { TerminalAdminService } from './terminal-admin.service'

const adminUser = { id: 'user-admin', role: 'admin' as const, buildingId: null, siteId: null }
const moderatorUser = { id: 'user-mod', role: 'moderator' as const, buildingId: 'building-1', siteId: null }
const building = { id: 'building-1', organizationId: 'org-1', siteId: 'site-1', label: 'Bâtiment A', code: 'A' }
const terminal = {
  id: 'terminal-1',
  code: 'TERM-0001',
  label: 'Tablette A',
  status: 'active',
  buildingId: building.id,
  building,
  lastSeenAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  invitations: [],
}

function makeService(overrides: Record<string, unknown> = {}) {
  const prisma = {
    building: { findUnique: vi.fn(async () => building) },
    terminalDevice: {
      findMany: vi.fn(async () => [terminal]),
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => terminal),
      create: vi.fn(async () => terminal),
      update: vi.fn(async (_args: any) => ({ ...terminal, ..._args.data })),
      ...overrides,
    },
  }
  const accessToken = {
    create: vi.fn(() => ({ token: 'terminal-token', tokenHash: 'terminal-token-hash' })),
  }
  const audit = { log: vi.fn() }
  const config = { get: vi.fn((_key: string, fallback?: string) => fallback) }

  return { service: new TerminalAdminService(prisma as any, accessToken as any, audit as any, config as any), prisma, accessToken, audit }
}

describe('TerminalAdminService', () => {
  it('lists terminals in the caller scope', async () => {
    const { service, prisma } = makeService()

    const result = await service.listForUser(moderatorUser as any)

    expect(prisma.terminalDevice.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { buildingId: 'building-1' },
    }))
    expect(result[0]?.id).toBe(terminal.id)
  })

  it('creates an active terminal with a non-recoverable launch token for admins', async () => {
    const { service, prisma, accessToken, audit } = makeService()

    const result = await service.create(adminUser as any, { buildingId: building.id, label: 'Tablette accueil' }, {} as any)

    expect(accessToken.create).toHaveBeenCalled()
    expect(prisma.terminalDevice.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ buildingId: building.id, label: 'Tablette accueil', status: 'active' }),
    }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'terminal_device.create' }))
    expect(result.terminalLaunchLink).toContain('/terminal/')
  })

  it('rejects terminal administration by moderators', async () => {
    const { service } = makeService()

    await expect(service.create(moderatorUser as any, { buildingId: building.id, label: 'Tablette' }, {} as any)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('updates terminal status and logs the change', async () => {
    const { service, prisma, audit } = makeService()

    const result = await service.update(adminUser as any, terminal.id, { status: 'paused' }, {} as any)

    expect(prisma.terminalDevice.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'paused' }) }))
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'terminal_device.update' }))
    expect(result.terminalDevice.status).toBe('paused')
  })

  it('regenerates a token and reactivates a revoked terminal', async () => {
    const revoked = { ...terminal, status: 'revoked' }
    const { service, prisma } = makeService({ findFirst: vi.fn(async () => revoked) })

    const result = await service.regenerateToken(adminUser as any, terminal.id, {} as any)

    expect(prisma.terminalDevice.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ accessTokenHash: 'terminal-token-hash', status: 'active' }) }))
    expect(result.terminalAccessToken).toBe('terminal-token')
  })

  it('fails when the terminal is outside the caller scope', async () => {
    const { service } = makeService({ findFirst: vi.fn(async () => null) })

    await expect(service.update(adminUser as any, terminal.id, { label: 'x' }, {} as any)).rejects.toBeInstanceOf(NotFoundException)
  })
})
