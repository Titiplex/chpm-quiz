import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(async (password: string) => `hash:${password}`) }, hash: vi.fn(async (password: string) => `hash:${password}`) }))

import { UsersService } from './users.service'

const adminUser = { id: 'admin-1', role: 'admin', organizationId: 'org-1', siteId: null, buildingId: null } as any
const siteUser = { id: 'site-user', role: 'site_manager', organizationId: 'org-1', siteId: 'site-1', buildingId: null } as any
const moderator = { id: 'mod-1', email: 'mod@example.test', displayName: 'Mod', role: 'moderator', organizationId: 'org-1', siteId: 'site-1', buildingId: 'building-1', isActive: true, createdAt: new Date(), updatedAt: new Date(), site: { id: 'site-1', code: 'S1', name: 'Site 1' }, building: null }
const building = { id: 'building-1', organizationId: 'org-1', siteId: 'site-1', code: 'B1', label: 'Bâtiment 1', city: 'Avignon', country: 'France', timezone: 'Europe/Paris', site: { id: 'site-1', code: 'S1', name: 'Site 1' } }
const otherBuilding = { ...building, id: 'building-2', siteId: 'site-2' }
const request = { ip: '127.0.0.1', get: vi.fn(() => 'Vitest') } as any

function makeService(overrides: Record<string, unknown> = {}) {
  const tx = {
    user: {
      create: vi.fn(async (args: any) => ({ ...moderator, ...args.data, id: 'created-mod', site: building.site, building })),
      update: vi.fn(async (args: any) => ({ ...moderator, ...args.data, site: building.site, building })),
    },
    session: { deleteMany: vi.fn(async () => ({ count: 1 })) },
    auditLog: { create: vi.fn(async () => undefined) },
  }
  const prisma = {
    user: {
      findMany: vi.fn(async () => [moderator]),
      findUnique: vi.fn(async () => moderator),
    },
    building: { findUnique: vi.fn(async () => building) },
    $transaction: vi.fn(async (callback: any) => callback(tx)),
    ...overrides,
  }

  return { service: new UsersService(prisma as any), prisma, tx }
}

describe('UsersService', () => {
  it('lists site team in the manager scope', async () => {
    const { service, prisma } = makeService()

    const result = await service.listSiteTeam(siteUser)

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ siteId: 'site-1' }) }))
    expect(result[0]).toMatchObject({ id: 'mod-1', role: 'moderator', email: 'mod@example.test' })
  })

  it('creates or reactivates a moderator scoped to a managed building', async () => {
    const { service, prisma, tx } = makeService({ user: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []) } })

    const result = await service.upsertSiteModerator(siteUser, {
      email: ' New.Mod@Example.test ',
      displayName: ' Nouveau mod ',
      buildingId: building.id,
      temporaryPassword: 'TempPass123!',
    } as any, request)

    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'new.mod@example.test', role: 'moderator', siteId: 'site-1', buildingId: 'building-1' }) }))
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'created-mod' } })
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'user.siteModerator.create' }) }))
    expect(prisma.$transaction).toHaveBeenCalled()
    expect(result.temporaryPassword).toBe('TempPass123!')
    expect(result.user.role).toBe('moderator')
  })

  it('rejects buildings outside a site manager perimeter', async () => {
    const { service } = makeService({ building: { findUnique: vi.fn(async () => otherBuilding) } })

    await expect(service.upsertSiteModerator(siteUser, {
      email: 'mod@example.test',
      displayName: 'Mod',
      buildingId: otherBuilding.id,
      temporaryPassword: 'TempPass123!',
    } as any, request)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('updates and disables only moderators in scope', async () => {
    const { service, tx } = makeService()

    const result = await service.updateSiteModerator(adminUser, 'mod-1', { isActive: false, buildingId: building.id } as any, request)

    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isActive: false, buildingId: 'building-1' }) }))
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'mod-1' } })
    expect(result.user.isActive).toBe(false)
  })

  it('does not expose non-moderator accounts through moderator mutations', async () => {
    const { service } = makeService({ user: { findUnique: vi.fn(async () => ({ ...moderator, role: 'admin' })), findMany: vi.fn(async () => []) } })

    await expect(service.updateSiteModerator(siteUser, 'admin-1', { isActive: false } as any, request)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('resets a moderator password and revokes sessions', async () => {
    const { service, tx } = makeService()

    const result = await service.resetSiteModeratorPassword(siteUser, 'mod-1', request)

    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ isActive: true }) }))
    expect(tx.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'mod-1' } })
    expect(result.temporaryPassword).toMatch(/\S{12,}/)
  })
})
