import { Controller, Get, Param, UseGuards } from '@nestjs/common'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { StatsService } from './stats.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('questionnaires/:id')
  @Roles('admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo')
  async questionnaireStats(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const stats = await this.statsService.questionnaireStats(id, user)
    return { stats }
  }

  @Get('submissions/:publicCode')
  @Roles('admin', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo')
  async submission(@Param('publicCode') publicCode: string, @CurrentUser() user: AuthenticatedUser) {
    const submission = await this.statsService.submission(publicCode, user)
    return { submission }
  }
}
