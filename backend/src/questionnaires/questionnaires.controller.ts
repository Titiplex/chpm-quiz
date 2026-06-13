import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto'
import { QuestionnairesService } from './questionnaires.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('questionnaires')
export class QuestionnairesController {
  constructor(
    private readonly questionnairesService: QuestionnairesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const questionnaires = await this.questionnairesService.listForUser(user)
    return { questionnaires }
  }

  @Get(':id')
  @Roles('admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst', 'dpo')
  async get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const questionnaire = await this.questionnairesService.getOneForUser(id, user)
    return { questionnaire }
  }

  @Post()
  @Roles('admin', 'questionnaire_admin')
  async create(
    @Body() dto: CreateQuestionnaireDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const questionnaire = await this.questionnairesService.create(dto, user)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire.create',
      entityType: 'Questionnaire',
      entityId: questionnaire.id,
      request,
      metadata: { code: questionnaire.code },
    })
    return { questionnaire }
  }
}
