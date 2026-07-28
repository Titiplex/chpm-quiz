import { randomInt } from 'node:crypto'

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-require-imports
import bcrypt = require('bcryptjs')
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { canDelegateRole, roleProfiles } from '../auth/role-permissions'
import { sameOrganizationOrUnscoped } from '../common/access-scope'
import { PrismaService } from '../prisma/prisma.service'
import { CreateSiteAdminDto } from './dto/create-site-admin.dto'
import { CreateSiteDto } from './dto/create-site.dto'
import { CreateBuildingDto } from './dto/create-building.dto'
import { CreateSiteModeratorDto } from './dto/create-site-moderator.dto'
import { UpdateSiteAdminDto } from './dto/update-site-admin.dto'
import { UpdateSiteModeratorDto } from './dto/update-site-moderator.dto'

const scopedTeamRoles = ['moderator'] as const
const passwordLength = 20

type OrganizationRow = { id: string; code: string; name: string }
type SiteRow = { id: string; organizationId: string; code: string; name: string; country?: string; timezone?: string; organization?: OrganizationRow | null }

type BuildingWithSite = {
  id: string
  organizationId: string
  siteId: string
  code: string
  label: string
  city: string
  country: string
  timezone: string
  site?: { id: string; code: string; name: string } | null
}

type UserWithScope = {
  id: string
  organizationId: string | null
  siteId: string | null
  buildingId: string | null
  email: string
  displayName: string
  role: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  site?: { id: string; code: string; name: string } | null
  building?: BuildingWithSite | null
}

export type OperationalHierarchyRole = 'admin' | 'site_manager' | 'moderator'

export type ProjectHierarchyScope = 'project' | 'site' | 'self'

export type HierarchyNode = {
  id: string
  kind: 'project' | 'project_admin' | 'site' | 'site_manager' | 'moderator' | 'team'
  label: string
  subtitle: string | null
  role: OperationalHierarchyRole | null
  isActive: boolean | null
  isCurrentUser: boolean
  children: HierarchyNode[]
}

export type ProjectHierarchyResponse = {
  hierarchy: HierarchyNode
  scope: ProjectHierarchyScope
  generatedAt: string
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectHierarchy(actor: AuthenticatedUser): Promise<ProjectHierarchyResponse> {
    if (!['admin', 'site_manager', 'moderator'].includes(actor.role)) {
      throw new ForbiddenException('La hiérarchie opérationnelle est réservée aux rôles projet, site et modération')
    }

    if (!actor.organizationId) {
      throw new ForbiddenException('Utilisateur sans organisation affectée')
    }

    const scopedSiteId = actor.siteId ?? actor.building?.siteId ?? null
    if (actor.role !== 'admin' && !scopedSiteId) {
      throw new ForbiddenException('Utilisateur opérationnel sans site affecté')
    }

    const userWhere: Record<string, unknown> = {
      organizationId: actor.organizationId,
      role: { in: ['admin', 'site_manager', 'moderator'] },
    }

    if (actor.role === 'site_manager') {
      userWhere.OR = [
        { role: 'admin' },
        { id: actor.id },
        { role: 'moderator', siteId: scopedSiteId },
      ]
    } else if (actor.role === 'moderator') {
      userWhere.OR = [
        { role: 'admin' },
        { role: 'site_manager', siteId: scopedSiteId },
        { id: actor.id },
      ]
    }

    const [organization, sites, users] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: actor.organizationId },
        select: { id: true, code: true, name: true },
      }),
      this.prisma.site.findMany({
        where: {
          organizationId: actor.organizationId,
          ...(actor.role === 'admin' ? {} : { id: scopedSiteId }),
        },
        orderBy: [{ name: 'asc' }, { code: 'asc' }],
      }),
      this.prisma.user.findMany({
        where: userWhere,
        orderBy: [{ displayName: 'asc' }, { email: 'asc' }],
        include: {
          site: { select: { id: true, code: true, name: true } },
          building: { include: { site: { select: { id: true, code: true, name: true } } } },
        },
      }),
    ])

    if (!organization) {
      throw new NotFoundException('Organisation introuvable')
    }

    const hierarchyUsers = users as UserWithScope[]
    const projectAdmins = hierarchyUsers
      .filter((user) => user.role === 'admin')
      .map((user) => this.toHierarchyPersonNode(user, actor.id))

    const siteNodes: HierarchyNode[] = (sites as SiteRow[]).map((site) => {
      const managers = hierarchyUsers
        .filter((user) => user.role === 'site_manager' && user.siteId === site.id)
        .map((user) => this.toHierarchyPersonNode(user, actor.id))
      const moderators = hierarchyUsers
        .filter((user) => user.role === 'moderator' && user.siteId === site.id)
        .map((user) => this.toHierarchyPersonNode(user, actor.id))

      let children: HierarchyNode[]
      if (managers.length === 1 && managers[0]) {
        children = [{ ...managers[0], children: moderators }]
      } else if (managers.length > 1) {
        children = [
          {
            id: `site-management-${site.id}`,
            kind: 'team',
            label: 'Responsables de site',
            subtitle: `${managers.length} responsables affectés`,
            role: null,
            isActive: null,
            isCurrentUser: managers.some((manager) => manager.isCurrentUser),
            children: managers,
          },
          {
            id: `site-moderators-${site.id}`,
            kind: 'team',
            label: 'Modérateurs',
            subtitle: `${moderators.length} personnes`,
            role: null,
            isActive: null,
            isCurrentUser: moderators.some((moderator) => moderator.isCurrentUser),
            children: moderators,
          },
        ]
      } else {
        children = moderators.length
          ? [{
              id: `site-moderators-${site.id}`,
              kind: 'team',
              label: 'Modérateurs sans responsable affecté',
              subtitle: `${moderators.length} personnes`,
              role: null,
              isActive: null,
              isCurrentUser: moderators.some((moderator) => moderator.isCurrentUser),
              children: moderators,
            }]
          : []
      }

      return {
        id: `site-${site.id}`,
        kind: 'site',
        label: site.name,
        subtitle: site.code,
        role: null,
        isActive: null,
        isCurrentUser: site.id === scopedSiteId && actor.role !== 'admin',
        children,
      }
    })

    const visibleSiteIds = new Set((sites as SiteRow[]).map((site) => site.id))
    const unassignedPeople = actor.role === 'admin'
      ? hierarchyUsers
          .filter((user) => user.role !== 'admin' && (!user.siteId || !visibleSiteIds.has(user.siteId)))
          .map((user) => this.toHierarchyPersonNode(user, actor.id))
      : []
    const unassignedNode: HierarchyNode | null = unassignedPeople.length
      ? {
          id: `project-unassigned-${organization.id}`,
          kind: 'team',
          label: 'Affectations incomplètes',
          subtitle: `${unassignedPeople.length} personnes à rattacher`,
          role: null,
          isActive: null,
          isCurrentUser: unassignedPeople.some((person) => person.isCurrentUser),
          children: unassignedPeople,
        }
      : null

    const administrationNode: HierarchyNode = {
      id: `project-administration-${organization.id}`,
      kind: 'team',
      label: 'Administration projet',
      subtitle: `${projectAdmins.length} administrateur${projectAdmins.length > 1 ? 's' : ''} projet`,
      role: null,
      isActive: null,
      isCurrentUser: projectAdmins.some((admin) => admin.isCurrentUser),
      children: [...projectAdmins, ...siteNodes, ...(unassignedNode ? [unassignedNode] : [])],
    }

    const hierarchy: HierarchyNode = {
      id: `project-${organization.id}`,
      kind: 'project',
      label: organization.name,
      subtitle: organization.code,
      role: null,
      isActive: null,
      isCurrentUser: false,
      children: [administrationNode],
    }

    return {
      hierarchy,
      scope: actor.role === 'admin' ? 'project' : actor.role === 'site_manager' ? 'site' : 'self',
      generatedAt: new Date().toISOString(),
    }
  }

  async listManagedSites(actor: AuthenticatedUser) {
    this.assertProjectAdmin(actor)

    const sites = (await this.prisma.site.findMany({
      where: actor.organizationId ? { organizationId: actor.organizationId } : {},
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
      include: { organization: { select: { id: true, code: true, name: true } } },
    })) as SiteRow[]

    return sites.map((site) => ({
      id: site.id,
      code: site.code,
      name: site.name,
      organizationId: site.organizationId,
      organization: site.organization
        ? { id: site.organization.id, code: site.organization.code, name: site.organization.name }
        : null,
      country: site.country ?? null,
      timezone: site.timezone ?? null,
    }))
  }

  async createManagedSite(actor: AuthenticatedUser, dto: CreateSiteDto, request: Request) {
    this.assertProjectAdmin(actor)
    if (!actor.organizationId) {
      throw new ForbiddenException('Administrateur projet sans organisation affectée')
    }

    const code = dto.code.trim().toUpperCase()
    const existing = await this.prisma.site.findUnique({ where: { code } })
    if (existing) {
      throw new ConflictException('Ce code site existe déjà')
    }

    const site = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.site.create({
        data: {
          organizationId: actor.organizationId,
          code,
          name: dto.name.trim(),
          country: dto.country?.trim() || 'France',
          timezone: dto.timezone?.trim() || 'Europe/Paris',
        },
        include: { organization: { select: { id: true, code: true, name: true } } },
      })

      await this.writeAudit(tx, actor, request, {
        action: 'site.create',
        entityType: 'Site',
        entityId: created.id,
        metadata: { code: created.code },
      })
      return created
    })

    return {
      id: site.id,
      code: site.code,
      name: site.name,
      organizationId: site.organizationId,
      organization: site.organization,
      country: site.country,
      timezone: site.timezone,
    }
  }

  async createManagedBuilding(actor: AuthenticatedUser, dto: CreateBuildingDto, request: Request) {
    this.assertCanUseScopedTeamAdministration(actor)
    if (!actor.organizationId || !actor.siteId) {
      throw new ForbiddenException('Responsable de site sans périmètre complet')
    }

    const site = await this.loadManagedSite(actor, actor.siteId)
    const code = dto.code.trim().toUpperCase()
    const existing = await this.prisma.building.findUnique({ where: { code } })
    if (existing) {
      throw new ConflictException('Ce code bâtiment existe déjà')
    }

    return this.prisma.$transaction(async (tx: any) => {
      const building = await tx.building.create({
        data: {
          organizationId: actor.organizationId,
          siteId: site.id,
          code,
          label: dto.label.trim(),
          city: dto.city.trim(),
          country: dto.country.trim(),
          timezone: dto.timezone.trim(),
        },
        include: { site: true },
      })

      await this.writeAudit(tx, actor, request, {
        action: 'building.create',
        entityType: 'Building',
        entityId: building.id,
        metadata: { code: building.code, siteId: site.id },
      })
      return building
    })
  }

  async listSiteAdmins(actor: AuthenticatedUser) {
    this.assertProjectAdmin(actor)

    const users = (await this.prisma.user.findMany({
      where: this.siteAdminsWhere(actor),
      orderBy: [{ displayName: 'asc' }, { email: 'asc' }],
      include: {
        site: { select: { id: true, code: true, name: true } },
        building: { include: { site: { select: { id: true, code: true, name: true } } } },
      },
    })) as UserWithScope[]

    return users.map((user) => this.toStaffUserDto(user))
  }

  async createSiteAdmin(actor: AuthenticatedUser, dto: CreateSiteAdminDto, request: Request) {
    this.assertProjectAdmin(actor)

    const site = await this.loadManagedSite(actor, dto.siteId)
    const email = dto.email.trim().toLowerCase()
    const displayName = dto.displayName.trim()
    const temporaryPassword = dto.temporaryPassword ?? this.generateStrongPassword()
    const passwordError = this.validatePassword(temporaryPassword)
    if (passwordError) {
      throw new BadRequestException(passwordError)
    }

    const existingUser = (await this.prisma.user.findUnique({
      where: { email },
      include: {
        site: { select: { id: true, code: true, name: true } },
        building: { include: { site: { select: { id: true, code: true, name: true } } } },
      },
    })) as UserWithScope | null

    if (existingUser && existingUser.role !== 'site_manager') {
      throw new ConflictException('Cet email correspond déjà à un compte qui n’est pas un responsable de site.')
    }

    if (existingUser) {
      this.assertTargetSiteAdminInActorScope(actor, existingUser)
    }

    const passwordHash = await this.hashPassword(temporaryPassword)

    const savedUser = (await this.prisma.$transaction(async (tx: any) => {
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              displayName,
              passwordHash,
              mustChangePassword: true,
              role: 'site_manager',
              isActive: true,
              organizationId: site.organizationId,
              siteId: site.id,
              buildingId: null,
            },
            include: {
              site: { select: { id: true, code: true, name: true } },
              building: { include: { site: { select: { id: true, code: true, name: true } } } },
            },
          })
        : await tx.user.create({
            data: {
              email,
              displayName,
              passwordHash,
              mustChangePassword: true,
              role: 'site_manager',
              isActive: true,
              organizationId: site.organizationId,
              siteId: site.id,
              buildingId: null,
            },
            include: {
              site: { select: { id: true, code: true, name: true } },
              building: { include: { site: { select: { id: true, code: true, name: true } } } },
            },
          })

      await tx.session.deleteMany({ where: { userId: user.id } })
      await this.writeAudit(tx, actor, request, {
        action: existingUser ? 'user.siteAdmin.update' : 'user.siteAdmin.create',
        entityId: user.id,
        metadata: {
          email,
          siteId: site.id,
          previousSiteId: existingUser?.siteId ?? null,
          temporaryPasswordReturned: true,
          sessionsRevoked: true,
        },
      })

      return user
    })) as UserWithScope

    return {
      user: this.toStaffUserDto(savedUser),
      temporaryPassword,
      temporaryPasswordGenerated: dto.temporaryPassword === undefined,
    }
  }

  async updateSiteAdmin(actor: AuthenticatedUser, userId: string, dto: UpdateSiteAdminDto, request: Request) {
    this.assertProjectAdmin(actor)
    const target = await this.loadTargetSiteAdmin(actor, userId)

    const data: Record<string, unknown> = {}
    let nextSite: SiteRow | null = null

    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim()
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive
    }

    if (dto.siteId !== undefined) {
      nextSite = await this.loadManagedSite(actor, dto.siteId)
      data.organizationId = nextSite.organizationId
      data.siteId = nextSite.id
      data.buildingId = null
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('Aucune modification demandée.')
    }

    const updated = (await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data,
        include: {
          site: { select: { id: true, code: true, name: true } },
          building: { include: { site: { select: { id: true, code: true, name: true } } } },
        },
      })

      if (dto.isActive === false || dto.siteId !== undefined) {
        await tx.session.deleteMany({ where: { userId: user.id } })
      }

      await this.writeAudit(tx, actor, request, {
        action: 'user.siteAdmin.patch',
        entityId: user.id,
        metadata: {
          email: target.email,
          previousSiteId: target.siteId,
          nextSiteId: nextSite?.id ?? target.siteId,
          isActiveChanged: dto.isActive !== undefined,
          sessionsRevoked: dto.isActive === false || dto.siteId !== undefined,
        },
      })

      return user
    })) as UserWithScope

    return { user: this.toStaffUserDto(updated) }
  }

  async resetSiteAdminPassword(actor: AuthenticatedUser, userId: string, request: Request) {
    this.assertProjectAdmin(actor)
    const target = await this.loadTargetSiteAdmin(actor, userId)
    const temporaryPassword = this.generateStrongPassword()
    const passwordHash = await this.hashPassword(temporaryPassword)

    const updated = (await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data: { passwordHash, isActive: true, mustChangePassword: true, failedLoginCount: 0, lockedUntil: null },
        include: {
          site: { select: { id: true, code: true, name: true } },
          building: { include: { site: { select: { id: true, code: true, name: true } } } },
        },
      })
      await tx.session.deleteMany({ where: { userId: user.id } })
      await this.writeAudit(tx, actor, request, {
        action: 'user.siteAdmin.resetPassword',
        entityId: user.id,
        metadata: {
          email: target.email,
          siteId: target.siteId,
          temporaryPasswordReturned: true,
          sessionsRevoked: true,
        },
      })
      return user
    })) as UserWithScope

    return {
      user: this.toStaffUserDto(updated),
      temporaryPassword,
      temporaryPasswordGenerated: true,
    }
  }

  async revokeSiteAdminSessions(actor: AuthenticatedUser, userId: string, request: Request) {
    this.assertProjectAdmin(actor)
    const target = await this.loadTargetSiteAdmin(actor, userId)
    const result = await this.revokeSessions(actor, target, 'user.siteAdmin.revokeSessions', request)
    return { user: this.toStaffUserDto(target), revokedSessionCount: result.count }
  }

  async listSiteTeam(actor: AuthenticatedUser) {
    this.assertCanUseScopedTeamAdministration(actor)

    const users = (await this.prisma.user.findMany({
      where: this.siteTeamWhere(actor),
      orderBy: [{ role: 'asc' }, { displayName: 'asc' }, { email: 'asc' }],
      include: {
        site: { select: { id: true, code: true, name: true } },
        building: { include: { site: { select: { id: true, code: true, name: true } } } },
      },
    })) as UserWithScope[]

    return users.map((user) => this.toStaffUserDto(user))
  }

  async upsertSiteModerator(actor: AuthenticatedUser, dto: CreateSiteModeratorDto, request: Request) {
    this.assertCanUseScopedTeamAdministration(actor)

    const building = await this.loadManagedBuilding(actor, dto.buildingId)
    const email = dto.email.trim().toLowerCase()
    const displayName = dto.displayName.trim()
    const temporaryPassword = dto.temporaryPassword ?? this.generateStrongPassword()
    const passwordError = this.validatePassword(temporaryPassword)
    if (passwordError) {
      throw new BadRequestException(passwordError)
    }

    const existingUser = (await this.prisma.user.findUnique({
      where: { email },
      include: {
        site: { select: { id: true, code: true, name: true } },
        building: { include: { site: { select: { id: true, code: true, name: true } } } },
      },
    })) as UserWithScope | null

    if (existingUser && existingUser.role !== 'moderator') {
      throw new ConflictException('Cet email correspond déjà à un compte qui n’est pas un modérateur.')
    }

    if (existingUser) {
      this.assertTargetModeratorInActorScope(actor, existingUser)
    }

    const passwordHash = await this.hashPassword(temporaryPassword)

    const savedUser = (await this.prisma.$transaction(async (tx: any) => {
      const user = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              displayName,
              passwordHash,
              mustChangePassword: true,
              role: 'moderator',
              isActive: true,
              organizationId: building.organizationId,
              siteId: building.siteId,
              buildingId: building.id,
            },
            include: {
              site: { select: { id: true, code: true, name: true } },
              building: { include: { site: { select: { id: true, code: true, name: true } } } },
            },
          })
        : await tx.user.create({
            data: {
              email,
              displayName,
              passwordHash,
              mustChangePassword: true,
              role: 'moderator',
              isActive: true,
              organizationId: building.organizationId,
              siteId: building.siteId,
              buildingId: building.id,
            },
            include: {
              site: { select: { id: true, code: true, name: true } },
              building: { include: { site: { select: { id: true, code: true, name: true } } } },
            },
          })

      await tx.session.deleteMany({ where: { userId: user.id } })
      await this.writeAudit(tx, actor, request, {
        action: existingUser ? 'user.siteModerator.update' : 'user.siteModerator.create',
        entityId: user.id,
        metadata: {
          email,
          buildingId: building.id,
          siteId: building.siteId,
          previousBuildingId: existingUser?.buildingId ?? null,
          temporaryPasswordReturned: true,
          sessionsRevoked: true,
        },
      })

      return user
    })) as UserWithScope

    return {
      user: this.toStaffUserDto(savedUser),
      temporaryPassword,
      temporaryPasswordGenerated: dto.temporaryPassword === undefined,
    }
  }

  async updateSiteModerator(actor: AuthenticatedUser, userId: string, dto: UpdateSiteModeratorDto, request: Request) {
    this.assertCanUseScopedTeamAdministration(actor)
    const target = await this.loadTargetModerator(actor, userId)

    const data: Record<string, unknown> = {}
    let nextBuilding: BuildingWithSite | null = null

    if (dto.displayName !== undefined) {
      data.displayName = dto.displayName.trim()
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive
    }

    if (dto.buildingId !== undefined) {
      nextBuilding = await this.loadManagedBuilding(actor, dto.buildingId)
      data.organizationId = nextBuilding.organizationId
      data.siteId = nextBuilding.siteId
      data.buildingId = nextBuilding.id
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException('Aucune modification demandée.')
    }

    const updated = (await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data,
        include: {
          site: { select: { id: true, code: true, name: true } },
          building: { include: { site: { select: { id: true, code: true, name: true } } } },
        },
      })

      if (dto.isActive === false || dto.buildingId !== undefined) {
        await tx.session.deleteMany({ where: { userId: user.id } })
      }

      await this.writeAudit(tx, actor, request, {
        action: 'user.siteModerator.patch',
        entityId: user.id,
        metadata: {
          email: target.email,
          previousBuildingId: target.buildingId,
          nextBuildingId: nextBuilding?.id ?? target.buildingId,
          isActiveChanged: dto.isActive !== undefined,
          sessionsRevoked: dto.isActive === false || dto.buildingId !== undefined,
        },
      })

      return user
    })) as UserWithScope

    return { user: this.toStaffUserDto(updated) }
  }

  async resetSiteModeratorPassword(actor: AuthenticatedUser, userId: string, request: Request) {
    this.assertCanUseScopedTeamAdministration(actor)
    const target = await this.loadTargetModerator(actor, userId)
    const temporaryPassword = this.generateStrongPassword()
    const passwordHash = await this.hashPassword(temporaryPassword)

    const updated = (await this.prisma.$transaction(async (tx: any) => {
      const user = await tx.user.update({
        where: { id: target.id },
        data: { passwordHash, isActive: true, mustChangePassword: true, failedLoginCount: 0, lockedUntil: null },
        include: {
          site: { select: { id: true, code: true, name: true } },
          building: { include: { site: { select: { id: true, code: true, name: true } } } },
        },
      })
      await tx.session.deleteMany({ where: { userId: user.id } })
      await this.writeAudit(tx, actor, request, {
        action: 'user.siteModerator.resetPassword',
        entityId: user.id,
        metadata: {
          email: target.email,
          buildingId: target.buildingId,
          temporaryPasswordReturned: true,
          sessionsRevoked: true,
        },
      })
      return user
    })) as UserWithScope

    return {
      user: this.toStaffUserDto(updated),
      temporaryPassword,
      temporaryPasswordGenerated: true,
    }
  }

  async revokeSiteModeratorSessions(actor: AuthenticatedUser, userId: string, request: Request) {
    this.assertCanUseScopedTeamAdministration(actor)
    const target = await this.loadTargetModerator(actor, userId)
    const result = await this.revokeSessions(actor, target, 'user.siteModerator.revokeSessions', request)
    return { user: this.toStaffUserDto(target), revokedSessionCount: result.count }
  }

  private async loadManagedSite(actor: AuthenticatedUser, siteId: string): Promise<SiteRow> {
    const site = (await this.prisma.site.findUnique({
      where: { id: siteId },
      include: { organization: { select: { id: true, code: true, name: true } } },
    })) as SiteRow | null

    if (!site) {
      throw new NotFoundException('Site introuvable')
    }

    if (!sameOrganizationOrUnscoped(actor, site.organizationId)) {
      throw new ForbiddenException('Site hors organisation utilisateur')
    }

    return site
  }

  private async loadManagedBuilding(actor: AuthenticatedUser, buildingId: string): Promise<BuildingWithSite> {
    const building = (await this.prisma.building.findUnique({
      where: { id: buildingId },
      include: { site: { select: { id: true, code: true, name: true } } },
    })) as BuildingWithSite | null

    if (!building) {
      throw new NotFoundException('Bâtiment introuvable')
    }

    if (!sameOrganizationOrUnscoped(actor, building.organizationId)) {
      throw new ForbiddenException('Bâtiment hors organisation utilisateur')
    }

    if (actor.role === 'site_manager' && (!actor.siteId || actor.siteId !== building.siteId)) {
      throw new ForbiddenException('Bâtiment hors du site géré')
    }

    return building
  }

  private async loadTargetSiteAdmin(actor: AuthenticatedUser, userId: string): Promise<UserWithScope> {
    const target = (await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        site: { select: { id: true, code: true, name: true } },
        building: { include: { site: { select: { id: true, code: true, name: true } } } },
      },
    })) as UserWithScope | null

    if (!target || target.role !== 'site_manager') {
      throw new NotFoundException('Responsable de site introuvable dans votre périmètre')
    }

    this.assertTargetSiteAdminInActorScope(actor, target)
    return target
  }

  private async loadTargetModerator(actor: AuthenticatedUser, userId: string): Promise<UserWithScope> {
    const target = (await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        site: { select: { id: true, code: true, name: true } },
        building: { include: { site: { select: { id: true, code: true, name: true } } } },
      },
    })) as UserWithScope | null

    if (!target || target.role !== 'moderator') {
      throw new NotFoundException('Modérateur introuvable dans votre périmètre')
    }

    this.assertTargetModeratorInActorScope(actor, target)
    return target
  }

  private assertTargetSiteAdminInActorScope(actor: AuthenticatedUser, target: UserWithScope): void {
    this.assertProjectAdmin(actor)

    if (!sameOrganizationOrUnscoped(actor, target.organizationId)) {
      throw new NotFoundException('Responsable de site introuvable dans votre périmètre')
    }
  }

  private assertTargetModeratorInActorScope(actor: AuthenticatedUser, target: UserWithScope): void {
    if (!sameOrganizationOrUnscoped(actor, target.organizationId)) {
      throw new NotFoundException('Modérateur introuvable dans votre périmètre')
    }

    if (actor.role === 'site_manager' && (!actor.siteId || target.siteId !== actor.siteId)) {
      throw new NotFoundException('Modérateur introuvable dans votre site')
    }
  }

  private siteAdminsWhere(actor: AuthenticatedUser) {
    const base: Record<string, unknown> = { role: 'site_manager' }

    if (actor.organizationId) {
      base.organizationId = actor.organizationId
    }

    return base
  }

  private siteTeamWhere(actor: AuthenticatedUser) {
    const base: Record<string, unknown> = { role: { in: [...scopedTeamRoles] } }

    if (actor.organizationId) {
      base.organizationId = actor.organizationId
    }

    if (actor.role === 'site_manager') {
      base.siteId = actor.siteId ?? '00000000-0000-0000-0000-000000000000'
    }

    return base
  }

  private assertProjectAdmin(actor: AuthenticatedUser): void {
    if (actor.role !== 'admin') {
      throw new ForbiddenException('Seul un administrateur projet peut gérer les responsables de site')
    }

    if (!canDelegateRole('admin', 'site_manager')) {
      throw new ForbiddenException('Hiérarchie RBAC incohérente : admin projet ne délègue pas les responsables de site')
    }
  }

  private assertCanUseScopedTeamAdministration(actor: AuthenticatedUser): void {
    if (actor.role === 'site_manager') {
      if (!canDelegateRole('site_manager', 'moderator')) {
        throw new ForbiddenException('Ce rôle ne peut pas déléguer la modération')
      }
      if (!actor.siteId) {
        throw new ForbiddenException('Responsable de site sans site affecté')
      }
      return
    }

    throw new ForbiddenException('Seul un responsable de site peut gérer les modérateurs de son site')
  }

  private toHierarchyPersonNode(user: UserWithScope, currentUserId: string): HierarchyNode {
    const role = user.role as OperationalHierarchyRole
    const subtitle = role === 'admin'
      ? roleProfiles.admin.label
      : role === 'site_manager'
        ? (user.site?.name ?? roleProfiles.site_manager.label)
        : (user.building?.label ?? user.site?.name ?? roleProfiles.moderator.label)

    return {
      id: `user-${user.id}`,
      kind: role === 'admin' ? 'project_admin' : role,
      label: user.displayName,
      subtitle,
      role,
      isActive: user.isActive,
      isCurrentUser: user.id === currentUserId,
      children: [],
    }
  }

  private toStaffUserDto(user: UserWithScope) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      roleLabel: roleProfiles[user.role as keyof typeof roleProfiles]?.label ?? user.role,
      isActive: user.isActive,
      organizationId: user.organizationId,
      siteId: user.siteId,
      buildingId: user.buildingId,
      site: user.site
        ? {
            id: user.site.id,
            code: user.site.code,
            name: user.site.name,
          }
        : null,
      building: user.building
        ? {
            id: user.building.id,
            code: user.building.code,
            label: user.building.label,
            city: user.building.city,
            country: user.building.country,
            timezone: user.building.timezone,
            siteId: user.building.siteId,
            organizationId: user.building.organizationId,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  private async revokeSessions(actor: AuthenticatedUser, target: UserWithScope, action: string, request: Request) {
    return this.prisma.$transaction(async (tx: any) => {
      const result = await tx.session.deleteMany({ where: { userId: target.id } })
      await this.writeAudit(tx, actor, request, {
        action,
        entityId: target.id,
        metadata: {
          email: target.email,
          role: target.role,
          siteId: target.siteId,
          buildingId: target.buildingId,
          sessionsRevoked: true,
          revokedSessionCount: result.count,
        },
      })
      return result as { count: number }
    })
  }

  private async writeAudit(tx: any, actor: AuthenticatedUser, request: Request, input: { action: string; entityId: string; entityType?: string; metadata: Record<string, unknown> }) {
    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        organizationId: actor.organizationId,
        action: input.action,
        entityType: input.entityType ?? 'User',
        entityId: input.entityId,
        metadata: {
          source: 'staff-management-api',
          actorRole: actor.role,
          ...input.metadata,
        },
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    })
  }

  private async hashPassword(password: string) {
    const rounds = Math.min(Math.max(Number(process.env.PASSWORD_BCRYPT_ROUNDS ?? '12'), 12), 14)
    return bcrypt.hash(password, rounds)
  }

  private generateStrongPassword(): string {
    const groups = [
      'ABCDEFGHJKLMNPQRSTUVWXYZ',
      'abcdefghijkmnopqrstuvwxyz',
      '23456789',
      '!@#$%*-_=+?',
    ]
    const chars = groups.join('')
    const password = groups.map((group) => this.pickChar(group))

    while (password.length < passwordLength) {
      password.push(this.pickChar(chars))
    }

    for (let index = password.length - 1; index > 0; index -= 1) {
      const swapIndex = randomInt(index + 1)
      const current = password[index]
      const other = password[swapIndex]
      if (current !== undefined && other !== undefined) {
        password[index] = other
        password[swapIndex] = current
      }
    }

    return password.join('')
  }

  private pickChar(chars: string): string {
    const char = chars[randomInt(chars.length)]
    if (!char) {
      throw new Error('jeu de caractères vide pour génération de mot de passe')
    }
    return char
  }

  private validatePassword(password: string): string | null {
    if (password.length < 12) return 'Le mot de passe temporaire doit contenir au moins 12 caractères.'
    if (!/[a-z]/.test(password)) return 'Le mot de passe temporaire doit contenir au moins une minuscule.'
    if (!/[A-Z]/.test(password)) return 'Le mot de passe temporaire doit contenir au moins une majuscule.'
    if (!/\d/.test(password)) return 'Le mot de passe temporaire doit contenir au moins un chiffre.'
    if (!/[^A-Za-z0-9]/.test(password)) return 'Le mot de passe temporaire doit contenir au moins un caractère spécial.'
    return null
  }
}
