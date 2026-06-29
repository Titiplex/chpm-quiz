import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateConditionalRuleDto, UpdateConditionalRuleDto } from './dto/conditional-rule.dto'
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
  async list(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const versions = await this.versionsService.list(id, user)
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
    const version = await this.versionsService.create(id, dto, user)
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


  @Get('versions/:id/rules')
  @Roles('admin', 'questionnaire_admin')
  async listRules(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const rules = await this.versionsService.listRules(id, user)
    return { rules }
  }

  @Post('versions/:id/rules')
  @Roles('admin', 'questionnaire_admin')
  async createRule(
    @Param('id') id: string,
    @Body() dto: CreateConditionalRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const rule = await this.versionsService.createRule(id, dto, user)
    await this.auditService.log({
      actor: user,
      action: 'conditional_rule.create',
      entityType: 'ConditionalRule',
      entityId: rule.id,
      request,
      metadata: { versionId: id, code: rule.code },
    })
    return { rule }
  }

  @Patch('versions/:id/rules/:ruleId')
  @Roles('admin', 'questionnaire_admin')
  async updateRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @Body() dto: UpdateConditionalRuleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const rule = await this.versionsService.updateRule(id, ruleId, dto, user)
    await this.auditService.log({
      actor: user,
      action: 'conditional_rule.update',
      entityType: 'ConditionalRule',
      entityId: rule.id,
      request,
      metadata: { versionId: id, code: rule.code },
    })
    return { rule }
  }

  @Delete('versions/:id/rules/:ruleId')
  @Roles('admin', 'questionnaire_admin')
  async archiveRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const rule = await this.versionsService.archiveRule(id, ruleId, user)
    await this.auditService.log({
      actor: user,
      action: 'conditional_rule.archive',
      entityType: 'ConditionalRule',
      entityId: rule.id,
      request,
      metadata: { versionId: id, code: rule.code },
    })
    return { rule }
  }

  @Get('versions/:id/publication-check')
  @Roles('admin', 'questionnaire_admin')
  async validatePublication(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const report = await this.versionsService.validatePublication(id, user)
    return { report }
  }

  @Post('versions/:id/publish')
  @Roles('admin', 'questionnaire_admin')
  async publish(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const version = await this.versionsService.publish(id, user)
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
