import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { StatsService } from './stats.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('stats')
export class StatsController {
  constructor(
    private readonly statsService: StatsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('questionnaires/:id')
  @Roles('admin', 'site_manager', 'questionnaire_admin', 'analyst')
  async questionnaireStats(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const stats = await this.statsService.questionnaireStats(id, user)
    await this.auditService.log({
      actor: user,
      action: 'stats.questionnaire.read',
      entityType: 'Questionnaire',
      entityId: id,
      request,
      metadata: {
        threshold: stats.threshold,
        submitted: stats.totals.submitted,
        pseudonymizedSubmissionRows: stats.submissions.length,
      },
    })
    return { stats }
  }

  @Get('questions/:id')
  @Roles('admin', 'site_manager', 'questionnaire_admin', 'analyst')
  async questionStats(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const stats = await this.statsService.questionStats(id, user)
    await this.auditService.log({
      actor: user,
      action: 'stats.question.read',
      entityType: 'Question',
      entityId: id,
      request,
      metadata: { questionnaireId: stats.questionnaire.id, questionCode: stats.question.code },
    })
    return { stats }
  }

  @Get('submissions/:publicCode')
  @Roles('analyst')
  async submission(
    @Param('publicCode') publicCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const submission = await this.statsService.submission(publicCode, user)
    await this.auditService.log({
      actor: user,
      action: 'stats.submission_pseudonymized.read',
      entityType: 'Submission',
      publicCode,
      request,
      metadata: { questionnaire: submission.questionnaire, answerCount: submission.answerCount },
    })
    return { submission }
  }
}
