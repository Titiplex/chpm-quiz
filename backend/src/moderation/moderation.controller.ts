import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateInvitationDto } from './dto/create-invitation.dto'
import { ModerationService } from './moderation.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('moderation/invitations')
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  @Roles('admin', 'moderator', 'site_manager', 'analyst', 'dpo')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const invitations = await this.moderationService.listForUser(user)
    return { invitations }
  }

  @Post()
  @Roles('admin', 'moderator')
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.moderationService.create(user, dto, request)
  }

  @Post(':id/resend')
  @Roles('admin', 'moderator')
  async resend(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.moderationService.resend(user, id, request)
  }
}
