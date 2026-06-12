import { Controller, Get, UseGuards } from '@nestjs/common'

import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { QuestionnairesService } from './questionnaires.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('questionnaires')
export class QuestionnairesController {
  constructor(private readonly questionnairesService: QuestionnairesService) {}

  @Get()
  @Roles('admin', 'moderator', 'respondent')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const questionnaires = await this.questionnairesService.listForUser(user)
    return { questionnaires }
  }
}
