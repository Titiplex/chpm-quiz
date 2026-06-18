import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'

import type { AuthenticatedUser } from '../auth/auth.types'
import { adminLikeRoles, type UserRole } from '../auth/role-permissions'
import { assertCanAccessQuestionnaire } from '../common/access-scope'
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
const editableQuestionTypes = new Set(['free_text', 'free_text_short', 'free_text_long', 'likert', 'single_choice', 'multiple_choice', 'number', 'date', 'information'])
const choiceQuestionTypes = new Set(['single_choice', 'multiple_choice'])


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
        conditionExpression: dto.conditionExpression as any,
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
        ...(dto.conditionExpression !== undefined ? { conditionExpression: dto.conditionExpression as any } : {}),
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
    this.validateQuestionPayload(dto.responseType, dto.likertScale, false, dto.answerOptions)

    const displayOrder = dto.displayOrder ?? (await this.nextQuestionOrder(groupId))
    await this.assertQuestionOrderAvailable(groupId, displayOrder)
    await this.assertQuestionCodeAvailable(groupId, normalizeCode(dto.code))

    await this.prisma.$transaction(async (tx: any) => {
      const question = await tx.question.create({
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
          conditionExpression: dto.conditionExpression as any,
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
          ...(choiceQuestionTypes.has(dto.responseType) && dto.answerOptions
            ? {
                answerOptions: {
                  create: this.toAnswerOptionCreates(dto.answerOptions),
                },
              }
            : {}),
        },
      })

      if (dto.popupDefinition) {
        await this.replacePopupDefinitions(tx, question.id, dto.popupDefinition, group.questionnaireVersion.language)
      }
    })

    return this.returnEditableQuestionnaire(id)
  }

  async updateQuestion(id: string, questionId: string, dto: UpdateQuestionDto, user: AuthenticatedUser) {
    await this.assertCanConfigure(id, user)
    const question = await this.getEditableQuestion(id, questionId)
    const responseType = dto.responseType ?? question.responseType
    this.validateQuestionPayload(responseType, dto.likertScale, question.likertScale !== null, dto.answerOptions, question.answerOptions?.length > 0)

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
          ...(dto.conditionExpression !== undefined ? { conditionExpression: dto.conditionExpression as any } : {}),
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

      if (!choiceQuestionTypes.has(responseType)) {
        await tx.answerOption.deleteMany({ where: { questionId } })
      } else if (dto.answerOptions !== undefined) {
        await tx.answerOption.deleteMany({ where: { questionId } })
        await tx.answerOption.createMany({
          data: this.toAnswerOptionCreates(dto.answerOptions).map((option) => ({ ...option, questionId })),
        })
      }

      if (dto.popupDefinition !== undefined) {
        await tx.popupDefinition.deleteMany({ where: { questionId } })

        if (dto.popupDefinition) {
          await this.replacePopupDefinitions(tx, questionId, dto.popupDefinition, question.group.questionnaireVersion.language)
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
      conditionExpression: group.conditionExpression,
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
        conditionExpression: question.conditionExpression,
        likertScale: question.likertScale,
        options: question.answerOptions,
        popupDefinitions: question.popupDefinitions.map((popup: any) => ({
          id: popup.id,
          termKey: popup.termKey,
          language: popup.language,
          title: popup.title,
          body: popup.body,
          version: popup.version,
          glossaryTermId: popup.glossaryTermId,
          termLabel: popup.glossaryTerm?.label ?? popup.title,
          termDefinition: popup.glossaryTerm?.definition ?? popup.body,
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

    const latestPublished = await this.prisma.questionnaireVersion.findFirst({
      where: { questionnaireId, status: publishedStatus },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      include: this.versionCloneInclude(),
    })

    if (latestPublished) {
      return this.cloneVersionToDraft(questionnaire, latestPublished)
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
        answerOptions: true,
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

    assertCanAccessQuestionnaire(user, questionnaire)
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

  private validateQuestionPayload(
    responseType: string,
    likertScale?: unknown,
    hasExistingLikertScale = false,
    answerOptions?: Array<{ value: string; label: string }>,
    hasExistingAnswerOptions = false,
  ) {
    if (!editableQuestionTypes.has(responseType)) {
      throw new BadRequestException('Type de question non disponible dans le constructeur admin')
    }

    if (responseType === 'likert' && !likertScale && !hasExistingLikertScale) {
      throw new BadRequestException('Une question Likert doit définir le nombre de points et les libellés gauche/droite')
    }

    if (choiceQuestionTypes.has(responseType)) {
      if ((!answerOptions || answerOptions.length < 2) && !hasExistingAnswerOptions) {
        throw new BadRequestException('Une question à choix doit contenir au moins deux options')
      }

      if (answerOptions) {
        const normalizedValues = answerOptions.map((option) => normalizeCode(option.value || option.label))
        if (new Set(normalizedValues).size !== normalizedValues.length) {
          throw new BadRequestException('Les valeurs des options doivent être uniques')
        }
      }
    }
  }

  private toAnswerOptionCreates(options: Array<{ value: string; label: string; displayOrder?: number; isExclusive?: boolean }>) {
    return options.map((option, index) => ({
      value: (option.value?.trim() || normalizeCode(option.label)).slice(0, 80),
      label: option.label.trim(),
      displayOrder: option.displayOrder ?? index + 1,
      isExclusive: option.isExclusive ?? false,
    }))
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


  private async cloneVersionToDraft(questionnaire: any, publishedVersion: any) {
    return this.prisma.$transaction(async (tx: any) => {
      const draft = await tx.questionnaireVersion.create({
        data: {
          questionnaireId: questionnaire.id,
          versionLabel: await this.nextDraftVersionLabel(questionnaire.id),
          language: publishedVersion.language,
          status: draftStatus,
          description: publishedVersion.description ?? questionnaire.description,
          finality: publishedVersion.finality ?? questionnaire.finality,
          openFrom: publishedVersion.openFrom,
          openUntil: publishedVersion.openUntil,
        },
      })

      const groupIdMap = new Map<string, string>()
      const questionIdMap = new Map<string, string>()

      for (const group of publishedVersion.groups) {
        const clonedGroup = await tx.questionGroup.create({
          data: {
            questionnaireVersionId: draft.id,
            title: group.title,
            description: group.description,
            displayOrder: group.displayOrder,
            questionsPerPage: group.questionsPerPage,
            randomize: group.randomize,
            conditionExpression: group.conditionExpression,
            isArchived: false,
          },
        })
        groupIdMap.set(group.id, clonedGroup.id)

        for (const question of group.questions) {
          const clonedQuestion = await tx.question.create({
            data: {
              groupId: clonedGroup.id,
              code: question.code,
              language: question.language,
              label: question.label,
              helperText: question.helperText,
              responseType: question.responseType,
              isRequired: question.isRequired,
              displayOrder: question.displayOrder,
              tags: question.tags,
              conditionExpression: question.conditionExpression,
            },
          })
          questionIdMap.set(question.id, clonedQuestion.id)

          if (question.likertScale) {
            await tx.likertScale.create({
              data: {
                questionId: clonedQuestion.id,
                points: question.likertScale.points,
                minValue: question.likertScale.minValue,
                leftAnchor: question.likertScale.leftAnchor,
                rightAnchor: question.likertScale.rightAnchor,
                neutralLabel: question.likertScale.neutralLabel,
                allowNotApplicable: question.likertScale.allowNotApplicable,
                orientation: question.likertScale.orientation,
              },
            })
          }

          if (question.answerOptions?.length) {
            await tx.answerOption.createMany({
              data: question.answerOptions.map((option: any) => ({
                questionId: clonedQuestion.id,
                value: option.value,
                label: option.label,
                displayOrder: option.displayOrder,
                isExclusive: option.isExclusive,
              })),
            })
          }

          for (const popup of question.popupDefinitions ?? []) {
            await tx.popupDefinition.create({
              data: {
                questionId: clonedQuestion.id,
                glossaryTermId: popup.glossaryTermId,
                termKey: popup.termKey,
                language: popup.language,
                title: popup.title,
                body: popup.body,
                version: popup.version,
                isRequired: popup.isRequired,
              },
            })
          }
        }
      }

      for (const rule of publishedVersion.conditionalRules ?? []) {
        await tx.conditionalRule.create({
          data: {
            questionnaireVersionId: draft.id,
            code: rule.code,
            trigger: this.rewriteClonedReferences(rule.trigger, groupIdMap, questionIdMap),
            effect: this.rewriteClonedReferences(rule.effect, groupIdMap, questionIdMap),
            priority: rule.priority,
            isActive: rule.isActive,
          },
        })
      }

      return draft
    })
  }

  private async replacePopupDefinitions(tx: any, questionId: string, popup: PopupDefinitionDto, language: string): Promise<void> {
    const popupCreates = this.toPopupCreates(popup, language)

    for (const popupCreate of popupCreates) {
      const glossaryTerm = await tx.glossaryTerm.upsert({
        where: {
          termKey_language_version: {
            termKey: popupCreate.termKey,
            language: popupCreate.language,
            version: popupCreate.version,
          },
        },
        update: {
          label: popupCreate.title,
          definition: popupCreate.body,
          isArchived: false,
        },
        create: {
          termKey: popupCreate.termKey,
          language: popupCreate.language,
          label: popupCreate.title,
          definition: popupCreate.body,
          version: popupCreate.version,
        },
      })

      await tx.popupDefinition.create({
        data: {
          questionId,
          glossaryTermId: glossaryTerm.id,
          termKey: popupCreate.termKey,
          language: popupCreate.language,
          title: popupCreate.title,
          body: popupCreate.body,
          version: popupCreate.version,
        },
      })
    }
  }

  private rewriteClonedReferences(value: unknown, groupIdMap: Map<string, string>, questionIdMap: Map<string, string>): unknown {
    if (value === null || value === undefined) {
      return value
    }

    if (typeof value === 'string') {
      return groupIdMap.get(value) ?? questionIdMap.get(value) ?? value
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.rewriteClonedReferences(entry, groupIdMap, questionIdMap))
    }

    if (typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
          key,
          this.rewriteClonedReferences(nested, groupIdMap, questionIdMap),
        ]),
      )
    }

    return value
  }

  private versionCloneInclude() {
    return {
      conditionalRules: { orderBy: [{ priority: 'asc' as const }, { createdAt: 'asc' as const }] },
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
              popupDefinitions: { orderBy: { createdAt: 'asc' as const } },
            },
          },
        },
      },
    }
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

