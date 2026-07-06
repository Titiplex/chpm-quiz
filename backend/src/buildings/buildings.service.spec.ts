import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { BuildingsService } from './buildings.service'

function makeService() {
  const prisma = { building: { findMany: vi.fn(async () => []) } }
  return { service: new BuildingsService(prisma as any), prisma }
}

describe('BuildingsService', () => {
  it('returns only the assigned building for moderators', async () => {
    const { service, prisma } = makeService()

    await service.listForUser({ role: 'moderator', buildingId: 'building-1' } as any)

    expect(prisma.building.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'building-1' } }))
  })

  it('returns no building for moderators without assignment', async () => {
    const { service, prisma } = makeService()

    await expect(service.listForUser({ role: 'moderator', buildingId: null } as any)).resolves.toEqual([])
    expect(prisma.building.findMany).not.toHaveBeenCalled()
  })

  it('scopes site managers by site and admins globally', async () => {
    const { service, prisma } = makeService()

    await service.listForUser({ role: 'site_manager', siteId: 'site-1' } as any)
    expect(prisma.building.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { siteId: 'site-1' } }))

    await service.listForUser({ role: 'admin' } as any)
    expect(prisma.building.findMany).toHaveBeenLastCalledWith(expect.not.objectContaining({ where: expect.anything() }))
  })
})
