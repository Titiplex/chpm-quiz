import { Injectable } from '@nestjs/common'

import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'

type QuestionnaireQuestion = {
  id: string
  code: string
  title: string
  type: string
  answerScaleLabel: string
  helperText: string | null
  popupTerm: string | null
  popupBody: string | null
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

type QuestionnaireGroup = {
  id: string
  questionnaireId: string
  title: string
  description: string | null
  displayOrder: number
  randomize: boolean
  createdAt: Date
  updatedAt: Date
  questions: QuestionnaireQuestion[]
}

type QuestionnaireWithGroups = {
  id: string
  code: string
  title: string
  version: string
  language: string
  isPublished: boolean
  createdAt: Date
  updatedAt: Date
  groups: QuestionnaireGroup[]
}

@Injectable()
export class QuestionnairesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: AuthenticatedUser) {
    const questionnaires = (await this.prisma.questionnaire.findMany({
      where: user.role === 'admin' ? undefined : { isPublished: true },
      orderBy: [{ isPublished: 'desc' }, { updatedAt: 'desc' }],
      include: {
        groups: {
          orderBy: { displayOrder: 'asc' },
          include: {
            questions: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    })) as QuestionnaireWithGroups[]

    return questionnaires.map((questionnaire: QuestionnaireWithGroups) => ({
      ...questionnaire,
      groupCount: questionnaire.groups.length,
      questionCount: questionnaire.groups.reduce(
        (total: number, group: QuestionnaireGroup) => total + group.questions.length,
        0,
      ),
    }))
  }
}
