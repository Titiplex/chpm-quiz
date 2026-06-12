import { Injectable } from '@nestjs/common'

import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class QuestionnairesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(user: AuthenticatedUser) {
    const questionnaires = await this.prisma.questionnaire.findMany({
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
    })

    return questionnaires.map((questionnaire) => ({
      ...questionnaire,
      groupCount: questionnaire.groups.length,
      questionCount: questionnaire.groups.reduce((total, group) => total + group.questions.length, 0),
    }))
  }
}
