import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import type { AuthenticatedUser } from '../auth/auth.types'
import { adminLikeRoles, type UserRole } from '../auth/role-permissions'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateQuestionnaireDto } from './dto/create-questionnaire.dto'
import type {
  CreateQuestionDto,
  CreateQuestionGroupDto,
  PopupDefinitionDto,
  UpdateQuestionDto,
  UpdateQuestionGroupDto,
  UpdateQuestionnaireDto,
} from './dto/questionnaire-builder.dto'

const publishedStatus = 'published'
const draftStatus = 'draft'
const defaultDraftVersionLabel = '0.1-draft'
const editableQuestionTypes = new Set(['free_text', 'free_text_short', 'free_text_long', 'likert'])


@Injectable()
export class QuestionnairesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: AuthenticatedUser) {
    const canSeeDrafts = this.canConfigureQuestionnaires(user.role)

    const questionnaires = await this.prisma.questionnaire.findMany({
      where: canSeeDrafts ? undefined : { versions: { some: { status: publishedStatus } } },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        versions: {
          where: canSeeDrafts ? undefined : { status: publishedStatus },
          orderBy: [{ updatedAt: 'desc' }],
          include: this.versionInclude(),
        },
      },
    })

    return questionnaires
      .map((questionnaire: any) => {
        const version = this.selectVersionForUser(questionnaire.versions, canSeeDrafts)

        if (!version) {
          return null
        }

        return this.toApiQuestionnaire(questionnaire, version)
      })
      .filter(Boolean)
  }

  async getOneForUser(id: string, user: AuthenticatedUser) {
    const canSeeDrafts = this.canConfigureQuestionnaires(user.role)
    const questionnaire = await this.loadQuestionnaire(id, canSeeDrafts)

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire introuvable')
    }

    const version = this.selectVersionForUser(questionnaire.versions, canSeeDrafts)

    if (!version) {
      throw new NotFoundException('Version de questionnaire introuvable')
    }

    return this.toApiQuestionnaire(questionnaire, version)
  }

  async create(dto: CreateQuestionnaireDto, user: AuthenticatedUser) {
    const code = normalizeCode(dto.code)
    const existing = await this.prisma.questionnaire.findUnique({ where: { code } })

    if (existing) {
      throw new ConflictException('Ce code questionnaire existe déjà')
    }

    const questionnaire = await this.prisma.questionnaire.create({
      data: {
        code,
        title: dto.title.trim(),
        description: cleanOptionalText(dto.description),
        defaultLanguage: dto.defaultLanguage?.trim() ?? 'fr',
        finality: cleanOptionalText(dto.finality),
        status: draftStatus,
        ownerUserId: user.id,
        organizationId: user.organizationId ?? undefined,
        versions: {
          create: {
            versionLabel: defaultDraftVersionLabel,
            language: dto.defaultLanguage?.trim() ?? 'fr',
            status: draftStatus,
            description: cleanOptionalText(dto.description),
            finality: cleanOptionalText(dto.finality),
          },
        },
      },
      include: {
        versions: {
          include: this.versionInclude(),
        },
      },
    })

    return this.toApiQuestionnaire(questionnaire, questionnaire.versions[0])
  }

  async updateQuestionnaire(id: string, dto: UpdateQuestionnaireDto, user: AuthenticatedUser) {
    await this.assertCanConfigure(id, user)
    const draftVersion = await this.getDraftVersion(id)

    await this.prisma.questionnaire.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: cleanOptionalText(dto.description) } : {}),
        ...(dto.defaultLanguage !== undefined ? { defaultLanguage: dto.defaultLanguage.trim() } : {}),
        ...(dto.finality !== undefined ? { finality: cleanOptionalText(dto.finality) } : {}),
        status: draftStatus,
      },
    })

    await this.prisma.questionnaireVersion.update({
      where: { id: draftVersion.id },
      data: {
        ...(dto.description !== undefined ? { description: cleanOptionalText(dto.description) } : {}),
        ...(dto.defaultLanguage !== undefined ? { language: dto.defaultLanguage.trim() } : {}),
        ...(dto.finality !== undefined ? { finality: cleanOptionalText(dto.finality) } : {}),
        status: draftStatus,
      },
    })

    return this.returnEditableQuestionnaire(id)
  }

  async createGroup(id: string, dto: CreateQuestionGroupDto, user: AuthenticatedUser) {
    await this.assertCanConfigure(id, user)
    const draftVersion = await this.getDraftVersion(id)
    const displayOrder = dto.displayOrder ?? (await this.nextGroupOrder(draftVersion.id))
    await this.assertGroupOrderAvailable(draftVersion.id, displayOrder)

    await this.prisma.questionGroup.create({
      data: {
        questionnaireVersionId: draftVersion.id,
        title: dto.title.trim(),
        description: cleanOptionalText(dto.description),
        displayOrder,
        questionsPerPage: dto.questionsPerPage ?? 3,
        randomize: dto.randomize ?? false,
      },
    })

    return this.returnEditableQuestionnaire(id)
  }

  async updateGroup(id: string, groupId: string, dto: UpdateQuestionGroupDto, user: AuthenticatedUser) {
    await this.assertCanConfigure(id, user)
    const group = await this.getEditableGroup(id, groupId)

    if (dto.displayOrder !== undefined && dto.displayOrder !== group.displayOrder) {
      await this.assertGroupOrderAvailable(group.questionnaireVersionId, dto.displayOrder)
    }

    await this.prisma.questionGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.description !== undefined ? { description: cleanOptionalText(dto.description) } : {}),
        ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
        ...(dto.questionsPerPage !== undefined ? { questionsPerPage: dto.questionsPerPage } : {}),
        ...(dto.randomize !== undefined ? { randomize: dto.randomize } : {}),
      },
    })

    return this.returnEditableQuestionnaire(id)
  }

  async archiveGroup(id: string, groupId: string, user: AuthenticatedUser) {
    await this.assertCanConfigure(id, user)
    await this.getEditableGroup(id, groupId)

    await this.prisma.questionGroup.update({
      where: { id: groupId },
      data: { isArchived: true },
    })

    return this.returnEditableQuestionnaire(id)
  }

  async createQuestion(id: string, groupId: string, dto: CreateQuestionDto, user: AuthenticatedUser) {
    await this.assertCanConfigure(id, user)
    const group = await this.getEditableGroup(id, groupId)
    this.validateQuestionPayload(dto.responseType, dto.likertScale)

    const displayOrder = dto.displayOrder ?? (await this.nextQuestionOrder(groupId))
    await this.assertQuestionOrderAvailable(groupId, displayOrder)
    await this.assertQuestionCodeAvailable(groupId, normalizeCode(dto.code))

    await this.prisma.question.create({
      data: {
        groupId,
        code: normalizeCode(dto.code),
        language: group.questionnaireVersion.language,
        label: dto.label.trim(),
        helperText: cleanOptionalText(dto.helperText),
        responseType: dto.responseType,
        isRequired: dto.isRequired ?? false,
        displayOrder,
        tags: dto.popupDefinition ? ['popup'] : [],
        ...(dto.responseType === 'likert' && dto.likertScale
          ? {
              likertScale: {
                create: {
                  points: dto.likertScale.points,
                  minValue: dto.likertScale.minValue ?? 1,
                  leftAnchor: dto.likertScale.leftAnchor.trim(),
                  rightAnchor: dto.likertScale.rightAnchor.trim(),
                  neutralLabel: cleanOptionalText(dto.likertScale.neutralLabel),
                  allowNotApplicable: dto.likertScale.allowNotApplicable ?? false,
                },
              },
            }
          : {}),
        ...(dto.popupDefinition
          ? {
              popupDefinitions: {
                create: this.toPopupCreates(dto.popupDefinition, group.questionnaireVersion.language),
              },
            }
          : {}),
      },
    })

    return this.returnEditableQuestionnaire(id)
  }

  async updateQuestion(id: string, questionId: string, dto: UpdateQuestionDto, user: AuthenticatedUser) {
    await this.assertCanConfigure(id, user)
    const question = await this.getEditableQuestion(id, questionId)
    const responseType = dto.responseType ?? question.responseType
    this.validateQuestionPayload(responseType, dto.likertScale, question.likertScale !== null)

    if (dto.displayOrder !== undefined && dto.displayOrder !== question.displayOrder) {
      await this.assertQuestionOrderAvailable(question.groupId, dto.displayOrder)
    }

    if (dto.code !== undefined && normalizeCode(dto.code) !== question.code) {
      await this.assertQuestionCodeAvailable(question.groupId, normalizeCode(dto.code))
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.question.update({
        where: { id: questionId },
        data: {
          ...(dto.code !== undefined ? { code: normalizeCode(dto.code) } : {}),
          ...(dto.label !== undefined ? { label: dto.label.trim() } : {}),
          ...(dto.helperText !== undefined ? { helperText: cleanOptionalText(dto.helperText) } : {}),
          ...(dto.responseType !== undefined ? { responseType: dto.responseType } : {}),
          ...(dto.isRequired !== undefined ? { isRequired: dto.isRequired } : {}),
          ...(dto.displayOrder !== undefined ? { displayOrder: dto.displayOrder } : {}),
          ...(dto.popupDefinition !== undefined ? { tags: dto.popupDefinition ? ['popup'] : [] } : {}),
        },
      })

      if (responseType === 'likert' && dto.likertScale) {
        await tx.likertScale.upsert({
          where: { questionId },
          update: {
            points: dto.likertScale.points,
            minValue: dto.likertScale.minValue ?? 1,
            leftAnchor: dto.likertScale.leftAnchor.trim(),
            rightAnchor: dto.likertScale.rightAnchor.trim(),
            neutralLabel: cleanOptionalText(dto.likertScale.neutralLabel),
            allowNotApplicable: dto.likertScale.allowNotApplicable ?? false,
          },
          create: {
            questionId,
            points: dto.likertScale.points,
            minValue: dto.likertScale.minValue ?? 1,
            leftAnchor: dto.likertScale.leftAnchor.trim(),
            rightAnchor: dto.likertScale.rightAnchor.trim(),
            neutralLabel: cleanOptionalText(dto.likertScale.neutralLabel),
            allowNotApplicable: dto.likertScale.allowNotApplicable ?? false,
          },
        })
      }

      if (responseType !== 'likert' && question.likertScale) {
        await tx.likertScale.delete({ where: { questionId } })
      }

      if (dto.popupDefinition !== undefined) {
        await tx.popupDefinition.deleteMany({ where: { questionId } })

        if (dto.popupDefinition) {
          await tx.popupDefinition.createMany({
            data: this.toPopupCreates(dto.popupDefinition, question.group.questionnaireVersion.language).map((popup) => ({
              questionId,
              termKey: popup.termKey,
              language: popup.language,
              title: popup.title,
              body: popup.body,
              version: popup.version,
            })),
          })
        }
      }
    })

    return this.returnEditableQuestionnaire(id)
  }

  async archiveQuestion(id: string, questionId: string, user: AuthenticatedUser) {
    await this.assertCanConfigure(id, user)
    await this.getEditableQuestion(id, questionId)

    await this.prisma.question.update({
      where: { id: questionId },
      data: { isArchived: true },
    })

    return this.returnEditableQuestionnaire(id)
  }

  toApiQuestionnaire(questionnaire: any, version: any) {
    const groups = version.groups.map((group: any) => ({
      id: group.id,
      title: group.title,
      description: group.description,
      displayOrder: group.displayOrder,
      questionsPerPage: group.questionsPerPage,
      randomize: group.randomize,
      questions: group.questions.map((question: any) => ({
        id: question.id,
        code: question.code,
        title: question.label,
        label: question.label,
        type: question.responseType,
        responseType: question.responseType,
        answerScaleLabel: question.likertScale ? this.likertScaleLabel(question.likertScale) : this.responseTypeLabel(question.responseType),
        helperText: question.helperText,
        popupTerm: question.popupDefinitions[0]?.title ?? null,
        popupBody: question.popupDefinitions[0]?.body ?? null,
        displayOrder: question.displayOrder,
        isRequired: question.isRequired,
        likertScale: question.likertScale,
        options: question.answerOptions,
        popupDefinitions: question.popupDefinitions.map((popup: any) => ({
          id: popup.id,
          termKey: popup.termKey,
          language: popup.language,
          title: popup.title,
          body: popup.body,
          version: popup.version,
          termLabel: popup.glossaryTerm?.label ?? popup.title,
        })),
      })),
    }))

    return {
      id: questionnaire.id,
      code: questionnaire.code,
      title: questionnaire.title,
      description: questionnaire.description,
      defaultLanguage: questionnaire.defaultLanguage,
      versionId: version.id,
      version: version.versionLabel,
      versionLabel: version.versionLabel,
      language: version.language,
      finality: version.finality ?? questionnaire.finality,
      status: version.status,
      isPublished: version.status === 'published',
      openFrom: version.openFrom,
      openUntil: version.openUntil,
      groupCount: groups.length,
      questionCount: groups.reduce((total: number, group: any) => total + group.questions.length, 0),
      groups,
    }
  }

  private async loadQuestionnaire(id: string, canSeeDrafts: boolean) {
    return this.prisma.questionnaire.findFirst({
      where: {
        id,
        ...(canSeeDrafts ? {} : { versions: { some: { status: publishedStatus } } }),
      },
      include: {
        versions: {
          where: canSeeDrafts ? undefined : { status: publishedStatus },
          orderBy: [{ updatedAt: 'desc' }],
          include: this.versionInclude(),
        },
      },
    })
  }

  private selectVersionForUser(versions: any[], canSeeDrafts: boolean) {
    if (!versions.length) {
      return null
    }

    if (canSeeDrafts) {
      return versions.find((version: any) => version.status === draftStatus) ?? versions[0]
    }

    return versions.find((version: any) => version.status === publishedStatus) ?? null
  }

  private async returnEditableQuestionnaire(id: string) {
    const questionnaire = await this.loadQuestionnaire(id, true)

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire introuvable')
    }

    const draft = questionnaire.versions.find((version: any) => version.status === draftStatus)

    if (!draft) {
      throw new NotFoundException('Version brouillon introuvable')
    }

    return this.toApiQuestionnaire(questionnaire, draft)
  }

  private async getDraftVersion(questionnaireId: string) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        versions: {
          where: { status: draftStatus },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire introuvable')
    }

    if (questionnaire.versions[0]) {
      return questionnaire.versions[0]
    }

    return this.prisma.questionnaireVersion.create({
      data: {
        questionnaireId,
        versionLabel: await this.nextDraftVersionLabel(questionnaireId),
        language: questionnaire.defaultLanguage,
        status: draftStatus,
        description: questionnaire.description,
        finality: questionnaire.finality,
      },
    })
  }

  private async getEditableGroup(questionnaireId: string, groupId: string) {
    const group = await this.prisma.questionGroup.findFirst({
      where: {
        id: groupId,
        isArchived: false,
        questionnaireVersion: {
          questionnaireId,
          status: draftStatus,
        },
      },
      include: {
        questionnaireVersion: true,
      },
    })

    if (!group) {
      throw new NotFoundException('Groupe brouillon introuvable')
    }

    return group
  }

  private async getEditableQuestion(questionnaireId: string, questionId: string) {
    const question = await this.prisma.question.findFirst({
      where: {
        id: questionId,
        isArchived: false,
        group: {
          questionnaireVersion: {
            questionnaireId,
            status: draftStatus,
          },
        },
      },
      include: {
        likertScale: true,
        group: {
          include: {
            questionnaireVersion: true,
          },
        },
      },
    })

    if (!question) {
      throw new NotFoundException('Question brouillon introuvable')
    }

    return question
  }

  private async assertCanConfigure(questionnaireId: string, user: AuthenticatedUser) {
    if (!this.canConfigureQuestionnaires(user.role)) {
      throw new NotFoundException('Questionnaire introuvable')
    }

    const questionnaire = await this.prisma.questionnaire.findUnique({ where: { id: questionnaireId } })

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire introuvable')
    }
  }

  private async nextDraftVersionLabel(questionnaireId: string) {
    const count = await this.prisma.questionnaireVersion.count({ where: { questionnaireId } })
    return `0.${count + 1}-draft`
  }

  private async nextGroupOrder(questionnaireVersionId: string) {
    const latest = await this.prisma.questionGroup.findFirst({
      where: { questionnaireVersionId },
      orderBy: { displayOrder: 'desc' },
    })

    return (latest?.displayOrder ?? 0) + 1
  }

  private async nextQuestionOrder(groupId: string) {
    const latest = await this.prisma.question.findFirst({
      where: { groupId },
      orderBy: { displayOrder: 'desc' },
    })

    return (latest?.displayOrder ?? 0) + 1
  }

  private async assertGroupOrderAvailable(questionnaireVersionId: string, displayOrder: number) {
    const existing = await this.prisma.questionGroup.findFirst({
      where: { questionnaireVersionId, displayOrder },
    })

    if (existing) {
      throw new ConflictException('Un groupe utilise déjà cet ordre dans le brouillon')
    }
  }

  private async assertQuestionOrderAvailable(groupId: string, displayOrder: number) {
    const existing = await this.prisma.question.findFirst({
      where: { groupId, displayOrder },
    })

    if (existing) {
      throw new ConflictException('Une question utilise déjà cet ordre dans ce groupe')
    }
  }

  private async assertQuestionCodeAvailable(groupId: string, code: string) {
    const existing = await this.prisma.question.findFirst({ where: { groupId, code } })

    if (existing) {
      throw new ConflictException('Ce code question existe déjà dans le groupe')
    }
  }

  private validateQuestionPayload(responseType: string, likertScale?: unknown, hasExistingLikertScale = false) {
    if (!editableQuestionTypes.has(responseType)) {
      throw new BadRequestException('Type de question non disponible dans le constructeur admin')
    }

    if (responseType === 'likert' && !likertScale && !hasExistingLikertScale) {
      throw new BadRequestException('Une question Likert doit définir le nombre de points et les libellés gauche/droite')
    }
  }

  private toPopupCreates(popup: PopupDefinitionDto, language: string) {
    const terms = popup.termsExplained?.map((term) => term.trim()).filter(Boolean)
    const normalizedTerms = terms?.length ? terms : [popup.title.trim()]

    return normalizedTerms.map((term) => ({
      termKey: normalizeTermKey(term),
      language,
      title: popup.title.trim(),
      body: popup.body.trim(),
      version: '1.0',
    }))
  }

  private versionInclude() {
    return {
      groups: {
        where: { isArchived: false },
        orderBy: { displayOrder: 'asc' as const },
        include: {
          questions: {
            where: { isArchived: false },
            orderBy: { displayOrder: 'asc' as const },
            include: {
              likertScale: true,
              answerOptions: { orderBy: { displayOrder: 'asc' as const } },
              popupDefinitions: {
                orderBy: { createdAt: 'asc' as const },
                include: { glossaryTerm: true },
              },
            },
          },
        },
      },
    }
  }

  private likertScaleLabel(likertScale: { points: number; minValue?: number | null }): string {
    const minValue = likertScale.minValue ?? 1
    const maxValue = minValue + likertScale.points - 1

    return `${likertScale.points} points (${minValue}–${maxValue})`
  }

  private responseTypeLabel(responseType: string): string {
    const labels: Record<string, string> = {
      single_choice: 'Choix unique',
      multiple_choice: 'Choix multiple',
      free_text: 'Texte libre',
      free_text_short: 'Texte court',
      free_text_long: 'Texte long',
      number: 'Nombre',
      date: 'Date',
      information: 'Information',
    }

    return labels[responseType] ?? responseType
  }

  private canConfigureQuestionnaires(role: UserRole): boolean {
    return adminLikeRoles.includes(role)
  }
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function cleanOptionalText(value?: string | null): string | null | undefined {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function normalizeTermKey(value: string): string {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || 'terme_explique'
}

