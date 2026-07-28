import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(async (password: string) => `hash:${password}`) }, hash: vi.fn(async (password: string) => `hash:${password}`) }))

import { UsersService } from './users.service'

const adminUser = { id: 'admin-1', role: 'admin', organizationId: 'org-1', siteId: null, buildingId: null } as any
const siteUser = { id: 'site-user', role: 'site_manager', organizationId: 'org-1', siteId: 'site-1', buildingId: null } as any
const siteAdmin = { id: 'site-admin-1', email: 'site.admin@example.test', displayName: 'Site Admin', role: 'site_manager', organizationId: 'org-1', siteId: 'site-1', buildingId: null, isActive: true, createdAt: new Date(), updatedAt: new Date(), site: { id: 'site-1', code: 'S1', name: 'Site 1' }, building: null }
const site = { id: 'site-1', organizationId: 'org-1', code: 'S1', name: 'Site 1', country: 'France', timezone: 'Europe/Paris', organization: { id: 'org-1', code: 'ORG', name: 'Org' } }
const moderator = { id: 'mod-1', email: 'mod@example.test', displayName: 'Mod', role: 'moderator', organizationId: 'org-1', siteId: 'site-1', buildingId: 'building-1', isActive: true, createdAt: new Date(), updatedAt: new Date(), site: { id: 'site-1', code: 'S1', name: 'Site 1' }, building: null }
const building = { id: 'building-1', organizationId: 'org-1', siteId: 'site-1', code: 'B1', label: 'Bâtiment 1', city: 'Avignon', country: 'France', timezone: 'Europe/Paris', site: { id: 'site-1', code: 'S1', name: 'Site 1' } }
const otherBuilding = { ...building, id: 'building-2', siteId: 'site-2' }
const request = { ip: '127.0.0.1', get: vi.fn(() => 'Vitest') } as any

function makeService(overrides: Record<string, unknown> = {}) {
  const tx = {
    site: {
      create: vi.fn(async (args: any) => ({ id: 'site-created', ...args.data, organization: site.organization })),
    },
    building: {
      create: vi.fn(async (args: any) => ({ id: 'building-created', ...args.data, site })),
    },
    user: {
      create: vi.fn(async (args: any) => args.data.role === 'site_manager'
        ? ({ ...siteAdmin, ...args.data, id: 'created-site-admin', site, building: null })
        : ({ ...moderator, ...args.data, id: 'created-mod', site: building.site, building })),
      update: vi.fn(async (args: any) => args.data.role === 'site_manager'
        ? ({ ...siteAdmin, ...args.data, site, building: null })
        : ({ ...moderator, ...args.data, site: building.site, building })),
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
    site: { findUnique: vi.fn(async () => site), findMany: vi.fn(async () => [site]) },
    $transaction: vi.fn(async (callback: any) => callback(tx)),
    ...overrides,
  }

  return { service: new UsersService(prisma as any), prisma, tx }
}

describe('UsersService', () => {
  it('builds the complete project hierarchy for a project administrator', async () => {
    const secondModerator = {
      ...moderator,
      id: 'mod-2',
      displayName: 'Second Mod',
      building: { ...building, label: 'Bâtiment 2' },
    }
    const { service, prisma } = makeService({
      organization: {
        findUnique: vi.fn(async () => ({ id: 'org-1', code: 'ORG', name: 'Organisation CHPM' })),
      },
      site: {
        findUnique: vi.fn(async () => site),
        findMany: vi.fn(async () => [site]),
      },
      user: {
        findUnique: vi.fn(async () => moderator),
        findMany: vi.fn(async () => [
          { ...adminUser, email: 'admin@example.test', displayName: 'Admin Projet', isActive: true, createdAt: new Date(), updatedAt: new Date(), site: null, building: null },
          siteAdmin,
          { ...moderator, building },
          secondModerator,
        ]),
      },
    })

    const result = await service.getProjectHierarchy(adminUser)

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ organizationId: 'org-1' }),
    }))
    expect(result.scope).toBe('project')
    expect(result.hierarchy.label).toBe('Organisation CHPM')
    expect(result.hierarchy.children[0]?.children).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'project_admin', label: 'Admin Projet' }),
      expect.objectContaining({ kind: 'site', label: 'Site 1' }),
    ]))
    const siteNode = result.hierarchy.children[0]?.children.find((node: any) => node.kind === 'site')
    expect(siteNode?.children[0]).toMatchObject({ kind: 'site_manager', label: 'Site Admin' })
    expect(siteNode?.children[0]?.children).toHaveLength(2)
  })

  it('limits a moderator hierarchy to project admins, site managers, and the moderator themself', async () => {
    const moderatorActor = { ...moderator, building } as any
    const projectAdmin = {
      ...adminUser,
      email: 'admin@example.test',
      displayName: 'Admin Projet',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      site: null,
      building: null,
    }
    const { service, prisma } = makeService({
      organization: {
        findUnique: vi.fn(async () => ({ id: 'org-1', code: 'ORG', name: 'Organisation CHPM' })),
      },
      site: {
        findUnique: vi.fn(async () => site),
        findMany: vi.fn(async () => [site]),
      },
      user: {
        findUnique: vi.fn(async () => moderator),
        findMany: vi.fn(async () => [projectAdmin, siteAdmin, { ...moderator, building }]),
      },
    })

    const result = await service.getProjectHierarchy(moderatorActor)

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [
          { role: 'admin' },
          { role: 'site_manager', siteId: 'site-1' },
          { id: 'mod-1' },
        ],
      }),
    }))
    expect(result.scope).toBe('self')
    const siteNode = result.hierarchy.children[0]?.children.find((node: any) => node.kind === 'site')
    expect(siteNode?.children[0]).toMatchObject({ kind: 'site_manager', label: 'Site Admin' })
    expect(siteNode?.children[0]?.children).toEqual([
      expect.objectContaining({ kind: 'moderator', label: 'Mod', isCurrentUser: true }),
    ])
  })

  it('lists site team in the manager scope', async () => {
    const { service, prisma } = makeService()

    const result = await service.listSiteTeam(siteUser)

    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ siteId: 'site-1' }) }))
    expect(result[0]).toMatchObject({ id: 'mod-1', role: 'moderator', email: 'mod@example.test' })
  })

  it('creates a site only in the project administrator organization', async () => {
    const { service, prisma, tx } = makeService({
      site: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => [site]) },
    })

    const result = await service.createManagedSite(adminUser, {
      code: ' new_site ',
      name: ' New site ',
      country: 'Canada',
      timezone: 'America/Toronto',
    }, request)

    expect(tx.site.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: 'org-1', code: 'NEW_SITE', name: 'New site' }),
    }))
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'site.create' }) }))
    expect(result).toMatchObject({ id: 'site-created', organizationId: 'org-1', code: 'NEW_SITE' })
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('creates a building only in the site manager assigned site', async () => {
    const { service, tx } = makeService({
      building: { findUnique: vi.fn(async () => null) },
    })

    const result = await service.createManagedBuilding(siteUser, {
      code: ' north ',
      label: ' North wing ',
      city: 'Avignon',
      country: 'France',
      timezone: 'Europe/Paris',
    }, request)

    expect(tx.building.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ organizationId: 'org-1', siteId: 'site-1', code: 'NORTH' }),
    }))
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: 'building.create' }) }))
    expect(result).toMatchObject({ id: 'building-created', organizationId: 'org-1', siteId: 'site-1' })
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



  it('lets a project admin create a site manager but not a DPO through the API service', async () => {
    const { service, tx } = makeService({ user: { findUnique: vi.fn(async () => null), findMany: vi.fn(async () => []) } })

    const result = await service.createSiteAdmin(adminUser, {
      email: 'site.admin@example.test',
      displayName: 'Responsable site',
      siteId: site.id,
      temporaryPassword: 'TempPass123!',
    } as any, request)

    expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: 'site_manager', siteId: 'site-1' }) }))
    expect(result.user.role).toBe('site_manager')
    expect(result.user.role).not.toBe('dpo')
  })

  it('rejects moderator management by a project admin', async () => {
    const { service } = makeService()

    await expect(service.upsertSiteModerator(adminUser, {
      email: 'mod@example.test',
      displayName: 'Mod',
      buildingId: building.id,
      temporaryPassword: 'TempPass123!',
    } as any, request)).rejects.toBeInstanceOf(ForbiddenException)
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

  it('updates and disables only moderators in the site-manager scope', async () => {
    const { service, tx } = makeService()

    const result = await service.updateSiteModerator(siteUser, 'mod-1', { isActive: false, buildingId: building.id } as any, request)

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
