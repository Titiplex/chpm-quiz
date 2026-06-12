import { Controller, Get, UseGuards } from '@nestjs/common'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { BuildingsService } from './buildings.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @Roles('admin', 'moderator')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const buildings = await this.buildingsService.listForUser(user)
    return { buildings }
  }
}
