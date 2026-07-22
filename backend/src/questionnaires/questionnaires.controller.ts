import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import { AuditService } from '../audit/audit.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateQuestionnaireDto } from './dto/create-questionnaire.dto'
import { CreateTranslationDto } from './dto/create-translation.dto'
import {
  CreateQuestionDto,
  CreateQuestionGroupDto,
  UpdateQuestionDto,
  UpdateQuestionGroupDto,
  UpdateQuestionnaireDto,
} from './dto/questionnaire-builder.dto'
import { QuestionnairesService } from './questionnaires.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('questionnaires')
export class QuestionnairesController {
  constructor(
    private readonly questionnairesService: QuestionnairesService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Roles('admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst')
  async list(@CurrentUser() user: AuthenticatedUser) {
    const questionnaires = await this.questionnairesService.listForUser(user)
    return { questionnaires }
  }

  @Get(':id')
  @Roles('admin', 'moderator', 'site_manager', 'questionnaire_admin', 'analyst')
  async get(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const questionnaire = await this.questionnairesService.getOneForUser(id, user)
    return { questionnaire }
  }

  @Get(':id/preview')
  @Roles('admin', 'moderator', 'questionnaire_admin')
  async preview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
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
      metadata: { code: questionnaire.code, versionId: questionnaire.versionId },
    })
    return { questionnaire }
  }

  @Post(':id/translations')
  @Roles('admin', 'questionnaire_admin')
  async createTranslation(
    @Param('id') id: string,
    @Body() dto: CreateTranslationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const questionnaire = await this.questionnairesService.createTranslationDraft(id, dto, user)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire.translation.create',
      entityType: 'Questionnaire',
      entityId: questionnaire.id,
      request,
      metadata: { sourceQuestionnaireId: id, language: dto.language, versionId: questionnaire.versionId },
    })
    return { questionnaire }
  }

  @Patch(':id')
  @Roles('admin', 'questionnaire_admin')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionnaireDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const questionnaire = await this.questionnairesService.updateQuestionnaire(id, dto, user)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire.updateDraftMetadata',
      entityType: 'Questionnaire',
      entityId: questionnaire.id,
      request,
      metadata: { code: questionnaire.code, versionId: questionnaire.versionId },
    })
    return { questionnaire }
  }

  @Post(':id/groups')
  @Roles('admin', 'questionnaire_admin')
  async createGroup(
    @Param('id') id: string,
    @Body() dto: CreateQuestionGroupDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const questionnaire = await this.questionnairesService.createGroup(id, dto, user)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire.group.create',
      entityType: 'Questionnaire',
      entityId: questionnaire.id,
      request,
      metadata: { versionId: questionnaire.versionId, groupTitle: dto.title },
    })
    return { questionnaire }
  }

  @Patch(':id/groups/:groupId')
  @Roles('admin', 'questionnaire_admin')
  async updateGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateQuestionGroupDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const questionnaire = await this.questionnairesService.updateGroup(id, groupId, dto, user)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire.group.update',
      entityType: 'QuestionGroup',
      entityId: groupId,
      request,
      metadata: { questionnaireId: id, versionId: questionnaire.versionId },
    })
    return { questionnaire }
  }

  @Delete(':id/groups/:groupId')
  @Roles('admin', 'questionnaire_admin')
  async archiveGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const questionnaire = await this.questionnairesService.archiveGroup(id, groupId, user)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire.group.archive',
      entityType: 'QuestionGroup',
      entityId: groupId,
      request,
      metadata: { questionnaireId: id, versionId: questionnaire.versionId },
    })
    return { questionnaire }
  }

  @Post(':id/groups/:groupId/questions')
  @Roles('admin', 'questionnaire_admin')
  async createQuestion(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const questionnaire = await this.questionnairesService.createQuestion(id, groupId, dto, user)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire.question.create',
      entityType: 'Questionnaire',
      entityId: questionnaire.id,
      request,
      metadata: { versionId: questionnaire.versionId, groupId, code: dto.code },
    })
    return { questionnaire }
  }

  @Patch(':id/questions/:questionId')
  @Roles('admin', 'questionnaire_admin')
  async updateQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const questionnaire = await this.questionnairesService.updateQuestion(id, questionId, dto, user)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire.question.update',
      entityType: 'Question',
      entityId: questionId,
      request,
      metadata: { questionnaireId: id, versionId: questionnaire.versionId },
    })
    return { questionnaire }
  }

  @Delete(':id/questions/:questionId')
  @Roles('admin', 'questionnaire_admin')
  async archiveQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const questionnaire = await this.questionnairesService.archiveQuestion(id, questionId, user)
    await this.auditService.log({
      actor: user,
      action: 'questionnaire.question.archive',
      entityType: 'Question',
      entityId: questionId,
      request,
      metadata: { questionnaireId: id, versionId: questionnaire.versionId },
    })
    return { questionnaire }
  }
}
