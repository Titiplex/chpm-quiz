import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateSiteAdminDto } from './dto/create-site-admin.dto'
import { CreateSiteDto } from './dto/create-site.dto'
import { CreateBuildingDto } from './dto/create-building.dto'
import { CreateSiteModeratorDto } from './dto/create-site-moderator.dto'
import { UpdateSiteAdminDto } from './dto/update-site-admin.dto'
import { UpdateSiteModeratorDto } from './dto/update-site-moderator.dto'
import { UsersService, type ProjectHierarchyResponse } from './users.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('admin')
export class ProjectAdministrationController {
  constructor(private readonly usersService: UsersService) {}

  @Get('sites')
  @Roles('admin')
  async listManagedSites(@CurrentUser() user: AuthenticatedUser) {
    const sites = await this.usersService.listManagedSites(user)
    return { sites }
  }

  @Post('sites')
  @Roles('admin')
  async createSite(@Body() dto: CreateSiteDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    const site = await this.usersService.createManagedSite(user, dto, request)
    return { site }
  }

  @Get('site-admins')
  @Roles('admin')
  async listSiteAdmins(@CurrentUser() user: AuthenticatedUser) {
    const users = await this.usersService.listSiteAdmins(user)
    return {
      users,
      policy: {
        manageableRoles: ['site_manager'],
        scope: 'project',
        passwordReturnedOnce: true,
        forbiddenRoles: ['admin', 'dpo', 'technical_admin', 'judicial_officer'],
      },
    }
  }

  @Post('site-admins')
  @Roles('admin')
  async createSiteAdmin(@Body() dto: CreateSiteAdminDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.createSiteAdmin(user, dto, request)
  }

  @Patch('site-admins/:id')
  @Roles('admin')
  async updateSiteAdmin(@Param('id') id: string, @Body() dto: UpdateSiteAdminDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.updateSiteAdmin(user, id, dto, request)
  }

  @Post('site-admins/:id/reset-password')
  @Roles('admin')
  async resetSiteAdminPassword(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.resetSiteAdminPassword(user, id, request)
  }

  @Post('site-admins/:id/revoke-sessions')
  @Roles('admin')
  async revokeSiteAdminSessions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.revokeSiteAdminSessions(user, id, request)
  }
}

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('site')
export class SiteAdministrationController {
  constructor(private readonly usersService: UsersService) {}

  @Post('buildings')
  @Roles('site_manager')
  async createBuilding(@Body() dto: CreateBuildingDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    const building = await this.usersService.createManagedBuilding(user, dto, request)
    return { building }
  }

  @Get('team')
  @Roles('site_manager')
  async listTeam(@CurrentUser() user: AuthenticatedUser) {
    const users = await this.usersService.listSiteTeam(user)
    return {
      users,
      policy: {
        manageableRoles: ['moderator'],
        scope: 'site',
        passwordReturnedOnce: true,
      },
    }
  }

  @Post('moderators')
  @Roles('site_manager')
  async createModerator(@Body() dto: CreateSiteModeratorDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.upsertSiteModerator(user, dto, request)
  }

  @Patch('moderators/:id')
  @Roles('site_manager')
  async updateModerator(@Param('id') id: string, @Body() dto: UpdateSiteModeratorDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.updateSiteModerator(user, id, dto, request)
  }

  @Post('moderators/:id/reset-password')
  @Roles('site_manager')
  async resetModeratorPassword(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.resetSiteModeratorPassword(user, id, request)
  }

  @Post('moderators/:id/revoke-sessions')
  @Roles('site_manager')
  async revokeModeratorSessions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.revokeSiteModeratorSessions(user, id, request)
  }
}

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('hierarchy')
  @Roles('admin', 'site_manager', 'moderator')
  getHierarchy(@CurrentUser() user: AuthenticatedUser): Promise<ProjectHierarchyResponse> {
    return this.usersService.getProjectHierarchy(user)
  }

  @Get('site-team')
  @Roles('site_manager')
  async listSiteTeam(@CurrentUser() user: AuthenticatedUser) {
    const users = await this.usersService.listSiteTeam(user)
    return {
      users,
      policy: {
        manageableRoles: ['moderator'],
        scope: 'site',
        passwordReturnedOnce: true,
      },
    }
  }

  @Post('site-moderators')
  @Roles('site_manager')
  async upsertSiteModerator(@Body() dto: CreateSiteModeratorDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.upsertSiteModerator(user, dto, request)
  }

  @Patch('site-moderators/:id')
  @Roles('site_manager')
  async updateSiteModerator(@Param('id') id: string, @Body() dto: UpdateSiteModeratorDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.updateSiteModerator(user, id, dto, request)
  }

  @Post('site-moderators/:id/reset-password')
  @Roles('site_manager')
  async resetSiteModeratorPassword(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.resetSiteModeratorPassword(user, id, request)
  }

  @Post('site-moderators/:id/revoke-sessions')
  @Roles('site_manager')
  async revokeSiteModeratorSessions(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.revokeSiteModeratorSessions(user, id, request)
  }
}
