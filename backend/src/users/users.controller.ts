import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateSiteModeratorDto } from './dto/create-site-moderator.dto'
import { UpdateSiteModeratorDto } from './dto/update-site-moderator.dto'
import { UsersService } from './users.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('site-team')
  @Roles('admin', 'site_manager')
  async listSiteTeam(@CurrentUser() user: AuthenticatedUser) {
    const users = await this.usersService.listSiteTeam(user)
    return {
      users,
      policy: {
        manageableRoles: ['moderator'],
        scope: user.role === 'site_manager' ? 'site' : 'organization',
        passwordReturnedOnce: true,
      },
    }
  }

  @Post('site-moderators')
  @Roles('admin', 'site_manager')
  async upsertSiteModerator(@Body() dto: CreateSiteModeratorDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.upsertSiteModerator(user, dto, request)
  }

  @Patch('site-moderators/:id')
  @Roles('admin', 'site_manager')
  async updateSiteModerator(@Param('id') id: string, @Body() dto: UpdateSiteModeratorDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.updateSiteModerator(user, id, dto, request)
  }

  @Post('site-moderators/:id/reset-password')
  @Roles('admin', 'site_manager')
  async resetSiteModeratorPassword(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.usersService.resetSiteModeratorPassword(user, id, request)
  }
}
