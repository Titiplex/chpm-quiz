import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateInvitationDto } from './dto/create-invitation.dto'
import { RegisterTerminalDeviceDto } from './dto/register-terminal-device.dto'
import { ModerationService } from './moderation.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('moderation')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('invitations')
  @Roles('moderator', 'site_manager')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const invitations = await this.moderationService.listForUser(user)
    return { invitations }
  }

  @Post('invitations')
  @Roles('moderator', 'site_manager')
  async create(@Body() dto: CreateInvitationDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.moderationService.create(user, dto, request)
  }

  @Post('invitations/:id/resend')
  @Roles('moderator', 'site_manager')
  async resend(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.moderationService.resend(user, id, request)
  }

  @Get('terminal-devices')
  @Roles('moderator', 'site_manager', 'technical_admin')
  async listTerminalDevices(@CurrentUser() user: AuthenticatedUser) {
    const terminalDevices = await this.moderationService.listTerminalDevices(user)
    return { terminalDevices }
  }

  @Post('terminal-devices')
  @Roles('technical_admin', 'site_manager')
  async registerTerminalDevice(@Body() dto: RegisterTerminalDeviceDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.moderationService.registerTerminalDevice(user, dto, request)
  }
}
