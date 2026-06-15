import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { UpsertNotificationSubscriptionDto } from './dto/upsert-notification-subscription.dto'
import { NotificationsService } from './notifications.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('notifications/subscriptions')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const subscriptions = await this.notificationsService.list(user)
    return { subscriptions }
  }

  @Post()
  @Roles('admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo')
  async upsert(
    @Body() dto: UpsertNotificationSubscriptionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const subscription = await this.notificationsService.upsert(user, dto, request)
    return { subscription }
  }
}
