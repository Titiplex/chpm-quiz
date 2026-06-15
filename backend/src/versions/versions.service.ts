import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'
import type { CreateVersionDto } from './dto/create-version.dto'
import type { CreateConditionalRuleDto, UpdateConditionalRuleDto } from './dto/conditional-rule.dto'

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


  async listRules(versionId: string) {
    await this.assertDraftOrPublishedVersionExists(versionId)
    return this.prisma.conditionalRule.findMany({
      where: { questionnaireVersionId: versionId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    })
  }

  async createRule(versionId: string, dto: CreateConditionalRuleDto) {
    await this.assertDraftVersion(versionId)
    return this.prisma.conditionalRule.create({
      data: {
        questionnaireVersionId: versionId,
        code: this.normalizeRuleCode(dto.code),
        trigger: dto.trigger as any,
        effect: dto.effect as any,
        priority: dto.priority ?? 100,
        isActive: dto.isActive ?? true,
      },
    })
  }

  async updateRule(versionId: string, ruleId: string, dto: UpdateConditionalRuleDto) {
    await this.assertDraftVersion(versionId)
    await this.assertRuleInVersion(versionId, ruleId)
    return this.prisma.conditionalRule.update({
      where: { id: ruleId },
      data: {
        ...(dto.code !== undefined ? { code: this.normalizeRuleCode(dto.code) } : {}),
        ...(dto.trigger !== undefined ? { trigger: dto.trigger as any } : {}),
        ...(dto.effect !== undefined ? { effect: dto.effect as any } : {}),
        ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    })
  }

  async archiveRule(versionId: string, ruleId: string) {
    await this.assertDraftVersion(versionId)
    await this.assertRuleInVersion(versionId, ruleId)
    return this.prisma.conditionalRule.update({ where: { id: ruleId }, data: { isActive: false } })
  }

  async publish(versionId: string) {
    const version = await this.prisma.questionnaireVersion.findUnique({
      where: { id: versionId },
      include: {
        questionnaire: true,
        conditionalRules: true,
        groups: {
          where: { isArchived: false },
          include: {
            questions: {
              where: { isArchived: false },
              include: {
                likertScale: true,
                answerOptions: true,
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

    this.assertPublishable(version)

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


  private async assertDraftOrPublishedVersionExists(versionId: string): Promise<void> {
    const version = await this.prisma.questionnaireVersion.findUnique({ where: { id: versionId } })
    if (!version) {
      throw new NotFoundException('Version introuvable')
    }
  }

  private async assertDraftVersion(versionId: string): Promise<void> {
    const version = await this.prisma.questionnaireVersion.findUnique({ where: { id: versionId } })
    if (!version) {
      throw new NotFoundException('Version introuvable')
    }
    if (version.status !== 'draft') {
      throw new BadRequestException('Les règles ne peuvent être modifiées que sur une version brouillon')
    }
  }

  private async assertRuleInVersion(versionId: string, ruleId: string): Promise<void> {
    const rule = await this.prisma.conditionalRule.findFirst({ where: { id: ruleId, questionnaireVersionId: versionId } })
    if (!rule) {
      throw new NotFoundException('Règle conditionnelle introuvable')
    }
  }

  private normalizeRuleCode(code: string): string {
    return code.trim().toUpperCase().replace(/\s+/g, '-')
  }

  private assertPublishable(version: any): void {
    const errors: string[] = []
    const groups = version.groups ?? []
    const questions = groups.flatMap((group: any) => group.questions.map((question: any) => ({ ...question, group })))

    if (!groups.length) {
      errors.push('au moins un groupe actif est obligatoire')
    }

    if (!questions.length) {
      errors.push('au moins une question active est obligatoire')
    }

    for (const group of groups) {
      if (!group.title?.trim()) {
        errors.push(`le groupe ${group.id} n’a pas de titre`)
      }
      if (group.questionsPerPage < 1) {
        errors.push(`le groupe ${group.title || group.id} doit afficher au moins une question par page`)
      }
    }

    const groupIds = new Set(groups.map((group: any) => group.id))
    const questionIds = new Set(questions.map((question: any) => question.id))
    const questionCodes = new Set(questions.map((question: any) => question.code))

    for (const question of questions) {
      if (!question.label?.trim()) {
        errors.push(`la question ${question.code} n’a pas de libellé`)
      }

      if (question.isRequired && !question.label?.trim()) {
        errors.push(`la question obligatoire ${question.code} est incomplète`)
      }

      if (question.language !== version.language) {
        errors.push(`la question ${question.code} n’a pas la langue de la version (${version.language})`)
      }

      if (question.responseType === 'likert' && !question.likertScale) {
        errors.push(`la question Likert ${question.code} n’a pas d’échelle configurée`)
      }

      if ((question.responseType === 'single_choice' || question.responseType === 'multiple_choice') && question.answerOptions.length < 2) {
        errors.push(`la question ${question.code} doit avoir au moins deux options de réponse`)
      }

      for (const popup of question.popupDefinitions) {
        if (!popup.termKey?.trim() || !popup.title?.trim() || !popup.body?.trim()) {
          errors.push(`une popup de la question ${question.code} est incomplète`)
        }
        if (popup.language !== version.language) {
          errors.push(`la popup ${popup.termKey} de ${question.code} n’a pas la langue de la version`)
        }
      }
    }

    for (const rule of version.conditionalRules.filter((item: any) => item.isActive)) {
      const serialized = JSON.stringify({ trigger: rule.trigger, effect: rule.effect })
      const referencedIds = this.extractUuidLikeValues(serialized)
      for (const ref of referencedIds) {
        if (!groupIds.has(ref) && !questionIds.has(ref)) {
          errors.push(`la règle conditionnelle ${rule.code} référence un objet supprimé ou introuvable (${ref})`)
        }
      }

      const referencedCodes = this.extractQuestionCodes(serialized)
      for (const code of referencedCodes) {
        if (!questionCodes.has(code)) {
          errors.push(`la règle conditionnelle ${rule.code} référence le code question introuvable ${code}`)
        }
      }
    }

    if (errors.length) {
      throw new BadRequestException(`Publication impossible : ${errors.join(' ; ')}`)
    }
  }

  private extractUuidLikeValues(serializedRule: string): string[] {
    return serializedRule.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? []
  }

  private extractQuestionCodes(serializedRule: string): string[] {
    return serializedRule.match(/Q-[A-Z0-9_-]+/gi)?.map((code) => code.toUpperCase()) ?? []
  }
}
