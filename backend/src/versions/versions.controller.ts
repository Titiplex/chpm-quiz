import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateVersionDto } from './dto/create-version.dto'
import { VersionsService } from './versions.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller()
export class VersionsController {
  constructor(
    private readonly versionsService: VersionsService,
    private readonly auditService: AuditService,
  ) {}

  @Get('questionnaires/:id/versions')
  @Roles('admin', 'questionnaire_admin')
  async list(@Param('id') id: string) {
    const versions = await this.versionsService.list(id)
    return { versions }
  }

  @Post('questionnaires/:id/versions')
  @Roles('admin', 'questionnaire_admin')
  async create(
    @Param('id') id: string,
    @Body() dto: CreateVersionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const version = await this.versionsService.create(id, dto)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire_version.create',
      entityType: 'QuestionnaireVersion',
      entityId: version.id,
      request,
      metadata: { questionnaireId: id, versionLabel: version.versionLabel },
    })
    return { version }
  }

  @Post('versions/:id/publish')
  @Roles('admin', 'questionnaire_admin')
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const version = await this.versionsService.publish(id)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire_version.publish',
      entityType: 'QuestionnaireVersion',
      entityId: id,
      request,
      metadata: { versionLabel: version.versionLabel },
    })
    return { version }
  }
}
