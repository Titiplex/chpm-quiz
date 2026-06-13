import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import type { AuthenticatedUser } from '../auth/auth.types'
import { adminLikeRoles, type UserRole } from '../auth/role-permissions'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateQuestionnaireDto } from './dto/create-questionnaire.dto'

const publishedStatus = 'published'

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
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          include: this.versionInclude(),
        },
      },
    })

    return questionnaires
      .map((questionnaire: any) => {
        const version = questionnaire.versions[0]

        if (!version) {
          return null
        }

        return this.toApiQuestionnaire(questionnaire, version)
      })
      .filter(Boolean)
  }

  async getOneForUser(id: string, user: AuthenticatedUser) {
    const canSeeDrafts = this.canConfigureQuestionnaires(user.role)
    const questionnaire = await this.prisma.questionnaire.findFirst({
      where: {
        id,
        ...(canSeeDrafts ? {} : { versions: { some: { status: publishedStatus } } }),
      },
      include: {
        versions: {
          where: canSeeDrafts ? undefined : { status: publishedStatus },
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          include: this.versionInclude(),
        },
      },
    })

    if (!questionnaire || !questionnaire.versions[0]) {
      throw new NotFoundException('Questionnaire introuvable')
    }

    return this.toApiQuestionnaire(questionnaire, questionnaire.versions[0])
  }

  async create(dto: CreateQuestionnaireDto, user: AuthenticatedUser) {
    const existing = await this.prisma.questionnaire.findUnique({ where: { code: dto.code } })

    if (existing) {
      throw new ConflictException('Ce code questionnaire existe déjà')
    }

    return this.prisma.questionnaire.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        title: dto.title.trim(),
        description: dto.description?.trim(),
        defaultLanguage: dto.defaultLanguage ?? 'fr',
        finality: dto.finality,
        status: 'draft',
        ownerUserId: user.id,
        organizationId: user.organizationId ?? undefined,
      },
    })
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
        answerScaleLabel: question.likertScale ? `${question.likertScale.points} points` : this.responseTypeLabel(question.responseType),
        helperText: question.helperText,
        popupTerm: question.popupDefinitions[0]?.title ?? null,
        popupBody: question.popupDefinitions[0]?.body ?? null,
        displayOrder: question.displayOrder,
        isRequired: question.isRequired,
        likertScale: question.likertScale,
        options: question.answerOptions,
        popupDefinitions: question.popupDefinitions,
      })),
    }))

    return {
      id: questionnaire.id,
      code: questionnaire.code,
      title: questionnaire.title,
      description: questionnaire.description,
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
