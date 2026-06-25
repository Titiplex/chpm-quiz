import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateTerminalDeviceDto } from './dto/create-terminal-device.dto'
import { UpdateTerminalDeviceDto } from './dto/update-terminal-device.dto'
import { TerminalAdminService } from './terminal-admin.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('terminal-devices')
export class TerminalAdminController {
  constructor(private readonly terminalAdminService: TerminalAdminService) {}

  @Get()
  @Roles('admin', 'technical_admin', 'site_manager', 'moderator')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const terminalDevices = await this.terminalAdminService.listForUser(user)
    return { terminalDevices }
  }

  @Post()
  @Roles('admin', 'technical_admin', 'site_manager')
  async create(@Body() dto: CreateTerminalDeviceDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.terminalAdminService.create(user, dto, request)
  }

  @Patch(':id')
  @Roles('admin', 'technical_admin', 'site_manager')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTerminalDeviceDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.terminalAdminService.update(user, id, dto, request)
  }

  @Post(':id/revoke')
  @Roles('admin', 'technical_admin', 'site_manager')
  async revoke(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.terminalAdminService.revoke(user, id, request)
  }

  @Post(':id/regenerate-token')
  @Roles('admin', 'technical_admin', 'site_manager')
  async regenerateToken(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.terminalAdminService.regenerateToken(user, id, request)
  }
}
