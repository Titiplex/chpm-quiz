import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import type { CreateVersionDto } from './dto/create-version.dto'

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(questionnaireId: string) {
    return this.prisma.questionnaireVersion.findMany({
      where: { questionnaireId },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        groups: {
          orderBy: { displayOrder: 'asc' },
          include: { questions: { orderBy: { displayOrder: 'asc' } } },
        },
      },
    })
  }

  async create(questionnaireId: string, dto: CreateVersionDto) {
    const questionnaire = await this.prisma.questionnaire.findUnique({ where: { id: questionnaireId } })

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire introuvable')
    }

    const existing = await this.prisma.questionnaireVersion.findUnique({
      where: {
        questionnaireId_versionLabel: {
          questionnaireId,
          versionLabel: dto.versionLabel,
        },
      },
    })

    if (existing) {
      throw new ConflictException('Cette version existe déjà pour ce questionnaire')
    }

    return this.prisma.questionnaireVersion.create({
      data: {
        questionnaireId,
        versionLabel: dto.versionLabel,
        language: dto.language ?? questionnaire.defaultLanguage,
        description: dto.description,
        finality: dto.finality ?? questionnaire.finality,
        openFrom: dto.openFrom ? new Date(dto.openFrom) : undefined,
        openUntil: dto.openUntil ? new Date(dto.openUntil) : undefined,
        status: 'draft',
      },
    })
  }

  async publish(versionId: string) {
    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id: versionId },
      include: {
        groups: {
          include: {
            questions: {
              include: {
                popupDefinitions: true,
              },
            },
          },
        },
      },
    })

    if (!version) {
      throw new NotFoundException('Version introuvable')
    }

    if (version.status !== 'draft') {
      throw new BadRequestException('Seule une version brouillon peut être publiée')
    }

    const questions = version.groups.flatMap((group: any) => group.questions)

    if (questions.length === 0) {
      throw new BadRequestException('Publication impossible sans question')
    }

    const invalidRequired = questions.filter((question: any) => question.isRequired && !question.label.trim())

    if (invalidRequired.length) {
      throw new BadRequestException('Des questions obligatoires sont incomplètes')
    }

    return this.prisma.$transaction(async (tx: any) => {
      const published = await tx.questionnaireVersion.update({
        where: { id: versionId },
        data: {
          status: 'published',
          publishedAt: new Date(),
          immutableAt: new Date(),
        },
      })

      await tx.questionnaire.update({
        where: { id: version.questionnaireId },
        data: { status: 'published' },
      })

      return published
    })
  }
}
