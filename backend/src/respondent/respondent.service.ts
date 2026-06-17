import { createHash, randomBytes } from 'node:crypto'

import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { AccessTokenService } from '../security/access-token.service'
import type { SaveAnswersDto } from './dto/save-answers.dto'
import type { TelemetryDto } from './dto/telemetry.dto'

interface RenderedQuestionnaire {
  groups: any[]
  pathQuestionIds: string[]
}

@Injectable()
export class RespondentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessTokenService: AccessTokenService,
    private readonly auditService: AuditService,
  ) {}

  async getSession(token: string) {
    const { invitation, responseSession } = await this.resolveOrCreateSession(token)
    return this.toRespondentSession(invitation, responseSession)
  }

  async saveAnswers(dto: SaveAnswersDto) {
    const { invitation, responseSession } = await this.resolveOrCreateSession(dto.token)
    this.assertWritable(responseSession)

    const rendered = this.renderVersion(invitation.questionnaireVersion, responseSession)
    const allowedQuestionIds = new Set(rendered.pathQuestionIds)

    for (const answer of dto.answers) {
      if (!allowedQuestionIds.has(answer.questionId)) {
        throw new BadRequestException('La question ne fait pas partie du chemin répondant actif')
      }
    }

    const savedAnswers = await this.prisma.$transaction(async (tx: any) => {
      const records = []
      for (const answer of dto.answers) {
        const warning = this.detectIdentifyingData(answer.value)
        const saved = await tx.answer.upsert({
          where: {
            responseSessionId_questionId: {
              responseSessionId: responseSession.id,
              questionId: answer.questionId,
            },
          },
          update: {
            value: answer.value as any,
            isDraft: true,
            identifiabilityWarning: Boolean(warning),
            warningReason: warning ?? null,
          },
          create: {
            responseSessionId: responseSession.id,
            questionId: answer.questionId,
            value: answer.value as any,
            isDraft: true,
            identifiabilityWarning: Boolean(warning),
            warningReason: warning ?? null,
          },
        })
        records.push(saved)
      }

      await tx.responseSession.update({
        where: { id: responseSession.id },
        data: {
          lastSeenAt: new Date(),
          status: 'draft',
          pathFingerprint: this.pathFingerprint(responseSession.id, rendered.pathQuestionIds),
        },
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'draft' },
      })

      return records
    })

    return {
      savedAnswers,
      warnings: savedAnswers.filter((answer: any) => answer.identifiabilityWarning).map((answer: any) => ({
        questionId: answer.questionId,
        reason: answer.warningReason,
      })),
    }
  }

  async recordTelemetry(dto: TelemetryDto) {
    const { invitation, responseSession } = await this.resolveOrCreateSession(dto.token)
    this.assertWritable(responseSession)

    const event = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.telemetryEvent.create({
        data: {
          responseSessionId: responseSession.id,
          questionId: dto.questionId,
          popupDefinitionId: dto.popupDefinitionId,
          eventType: dto.eventType,
          eventPayload: dto.eventPayload ?? undefined,
          durationMs: dto.durationMs,
          occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        },
      })

      const sessionStatusPatch = dto.eventType === 'questionnaire_abandon'
        ? { status: 'abandoned' }
        : dto.eventType === 'questionnaire_resume'
          ? { status: 'draft' }
          : {}

      if (dto.currentPage !== undefined) {
        await tx.responseSession.update({
          where: { id: responseSession.id },
          data: {
            currentPage: Math.max(1, dto.currentPage),
            lastSeenAt: new Date(),
            ...sessionStatusPatch,
          },
        })
      } else {
        await tx.responseSession.update({
          where: { id: responseSession.id },
          data: { lastSeenAt: new Date(), ...sessionStatusPatch },
        })
      }

      if (dto.eventType === 'questionnaire_resume' && invitation.status !== 'submitted') {
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'in_progress', startedAt: invitation.startedAt ?? new Date() },
        })
      }

      if (invitation.status === 'opened') {
        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'in_progress', startedAt: invitation.startedAt ?? new Date() },
        })
      }

      return created
    })

    return { event }
  }

  async submit(token: string) {
    const { invitation, responseSession } = await this.resolveOrCreateSession(token)
    this.assertWritable(responseSession)

    const rendered = this.renderVersion(invitation.questionnaireVersion, responseSession)
    const answerByQuestionId = new Map<string, any>((responseSession.answers ?? []).map((answer: any): [string, any] => [answer.questionId, answer]))
    const missingRequired = rendered.groups.flatMap((group) => group.questions)
      .filter((question: any) => question.isRequired && !this.hasUsableAnswer(question, answerByQuestionId.get(question.id)))

    if (missingRequired.length) {
      throw new BadRequestException(`Soumission impossible : ${missingRequired.length} question(s) obligatoire(s) sans réponse exploitable`)
    }

    const answerCount = await this.prisma.answer.count({ where: { responseSessionId: responseSession.id } })
    const pathFingerprint = this.pathFingerprint(responseSession.id, rendered.pathQuestionIds)
    const submittedAt = new Date()

    const submission = await this.prisma.$transaction(async (tx: any) => {
      const existingSubmission = await tx.submission.findUnique({
        where: { responseSessionId: responseSession.id },
      })

      if (existingSubmission) {
        throw new BadRequestException('La soumission est déjà verrouillée')
      }

      const lockResult = await tx.responseSession.updateMany({
        where: {
          id: responseSession.id,
          status: { in: ['draft', 'abandoned'] },
          submittedAt: null,
          lockedAt: null,
        },
        data: {
          status: 'locked',
          submittedAt,
          lockedAt: submittedAt,
          pathFingerprint,
        },
      })

      if (lockResult.count !== 1) {
        throw new BadRequestException('La soumission est définitive et verrouillée')
      }

      await tx.answer.updateMany({
        where: { responseSessionId: responseSession.id },
        data: { isDraft: false },
      })

      const created = await tx.submission.create({
        data: {
          responseSessionId: responseSession.id,
          publicCode: responseSession.publicCode,
          questionnaireVersionId: responseSession.questionnaireVersionId,
          buildingId: responseSession.buildingId,
          submittedAt,
          answerCount,
          pathFingerprint,
        },
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'submitted',
          submittedAt,
        },
      })

      return created
    })

    await this.auditService.log({
      actor: null,
      action: 'respondent.submit',
      entityType: 'Submission',
      entityId: submission.id,
      publicCode: responseSession.publicCode,
      metadata: { answerCount, pathFingerprint },
    })

    return { submission }
  }

  private async resolveOrCreateSession(token: string) {
    const tokenData = this.accessTokenService.verify(token)

    const invitation = await this.prisma.invitation.findUnique({
      where: { publicCode: tokenData.publicCode },
      include: {
        building: true,
        responseSession: {
          include: {
            answers: true,
            submission: true,
          },
        },
        questionnaireVersion: {
          include: {
            questionnaire: true,
            conditionalRules: { where: { isActive: true }, orderBy: { priority: 'asc' } },
            groups: {
              where: { isArchived: false },
              orderBy: { displayOrder: 'asc' },
              include: {
                questions: {
                  where: { isArchived: false },
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    likertScale: true,
                    answerOptions: { orderBy: { displayOrder: 'asc' } },
                    popupDefinitions: {
                      include: { glossaryTerm: true },
                      orderBy: { createdAt: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!invitation || invitation.tokenHash !== tokenData.tokenHash) {
      throw new UnauthorizedException('Jeton répondant invalide')
    }

    if (invitation.status === 'blocked' || invitation.status === 'cancelled') {
      throw new ForbiddenException('Invitation bloquée ou annulée')
    }

    if (invitation.expiresAt <= new Date() && invitation.status !== 'submitted') {
      await this.prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'expired' } })
      throw new ForbiddenException('Invitation expirée')
    }

    if (invitation.responseSession) {
      return { invitation, responseSession: invitation.responseSession }
    }

    const responseSession = await this.prisma.$transaction(async (tx: any) => {
      const session = await tx.responseSession.create({
        data: {
          invitationId: invitation.id,
          publicCode: invitation.publicCode,
          questionnaireVersionId: invitation.questionnaireVersionId,
          buildingId: invitation.buildingId,
          status: 'draft',
          randomizationSeed: randomBytes(16).toString('hex'),
        },
        include: {
          answers: true,
          submission: true,
        },
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: invitation.openedAt ? 'in_progress' : 'opened',
          openedAt: invitation.openedAt ?? new Date(),
          startedAt: invitation.startedAt ?? new Date(),
        },
      })

      return session
    })

    return { invitation: { ...invitation, responseSession }, responseSession }
  }

  private toRespondentSession(invitation: any, responseSession: any) {
    const answerByQuestionId = new Map<string, any>((responseSession.answers ?? []).map((answer: any): [string, any] => [answer.questionId, answer]))
    const version = invitation.questionnaireVersion
    const rendered = this.renderVersion(version, responseSession)

    return {
      responseSession: {
        id: responseSession.id,
        publicCode: responseSession.publicCode,
        status: responseSession.status,
        currentPage: responseSession.currentPage,
        startedAt: responseSession.startedAt,
        submittedAt: responseSession.submittedAt,
        lockedAt: responseSession.lockedAt,
      },
      invitation: {
        publicCode: invitation.publicCode,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        building: invitation.building,
      },
      questionnaire: {
        id: version.questionnaire.id,
        versionId: version.id,
        title: version.questionnaire.title,
        description: version.description ?? version.questionnaire.description,
        finality: version.finality ?? version.questionnaire.finality,
        versionLabel: version.versionLabel,
        language: version.language,
        groups: rendered.groups.map((group: any) => ({
          id: group.id,
          title: group.title,
          description: group.description,
          questionsPerPage: group.questionsPerPage,
          randomize: group.randomize,
          questions: group.questions.map((question: any) => ({
            id: question.id,
            code: question.code,
            label: question.label,
            helperText: question.helperText,
            responseType: question.responseType,
            isRequired: question.isRequired,
            displayOrder: question.displayOrder,
            likertScale: question.likertScale,
            options: question.answerOptions,
            popupDefinitions: question.popupDefinitions,
            answer: answerByQuestionId.get(question.id) ?? null,
          })),
        })),
      },
    }
  }

  private renderVersion(version: any, responseSession: any): RenderedQuestionnaire {
    const answerByQuestionId = new Map<string, unknown>((responseSession.answers ?? []).map((answer: any): [string, unknown] => [answer.questionId, answer.value]))
    const answersByCode = new Map<string, unknown>()

    for (const group of version.groups ?? []) {
      for (const question of group.questions ?? []) {
        if (answerByQuestionId.has(question.id)) {
          answersByCode.set(question.code, answerByQuestionId.get(question.id))
        }
      }
    }

    const context = { answerByQuestionId, answersByCode }
    const hiddenGroupIds = new Set<string>()
    const hiddenQuestionIds = new Set<string>()
    const forcedQuestionIds = new Set<string>()
    const forcedGroupIds = new Set<string>()
    let terminated = false

    for (const rule of version.conditionalRules ?? []) {
      if (!this.evaluateCondition(rule.trigger, context)) continue
      const effect = rule.effect ?? {}
      const action = effect.action ?? effect.type

      if (action === 'hide_group' && effect.groupId) hiddenGroupIds.add(effect.groupId)
      if (action === 'show_group' && effect.groupId) forcedGroupIds.add(effect.groupId)
      if (action === 'hide_question' && effect.questionId) hiddenQuestionIds.add(effect.questionId)
      if (action === 'show_question' && effect.questionId) forcedQuestionIds.add(effect.questionId)
      if (action === 'terminate_questionnaire') terminated = true
    }

    const groups = []
    const pathQuestionIds: string[] = []

    for (const group of version.groups ?? []) {
      if (terminated) break
      const groupVisible = forcedGroupIds.has(group.id)
        || (!hiddenGroupIds.has(group.id) && this.evaluateCondition(group.conditionExpression, context))

      if (!groupVisible) continue

      const questions = (group.questions ?? []).filter((question: any) => (
        forcedQuestionIds.has(question.id)
        || (!hiddenQuestionIds.has(question.id) && this.evaluateCondition(question.conditionExpression, context))
      ))

      const orderedQuestions = group.randomize
        ? this.stableShuffle(questions, `${responseSession.randomizationSeed}:${group.id}`)
        : questions

      if (orderedQuestions.length) {
        groups.push({ ...group, questions: orderedQuestions })
        pathQuestionIds.push(...orderedQuestions.map((question: any) => question.id))
      }
    }

    return { groups, pathQuestionIds }
  }

  private evaluateCondition(expression: unknown, context: { answerByQuestionId: Map<string, unknown>; answersByCode: Map<string, unknown> }): boolean {
    if (!expression) return true
    if (typeof expression !== 'object') return true

    const condition = expression as any

    if (Array.isArray(condition.all)) {
      return condition.all.every((item: unknown) => this.evaluateCondition(item, context))
    }

    if (Array.isArray(condition.any)) {
      return condition.any.some((item: unknown) => this.evaluateCondition(item, context))
    }

    if (condition.not) {
      return !this.evaluateCondition(condition.not, context)
    }

    const value = condition.questionId
      ? context.answerByQuestionId.get(condition.questionId)
      : condition.questionCode
        ? context.answersByCode.get(String(condition.questionCode).toUpperCase())
        : undefined

    const operator = condition.operator ?? (Object.prototype.hasOwnProperty.call(condition, 'equals') ? 'equals' : 'answered')
    const expected = Object.prototype.hasOwnProperty.call(condition, 'value') ? condition.value : condition.equals

    switch (operator) {
      case 'answered':
        return value !== undefined && value !== null && value !== ''
      case 'not_answered':
        return value === undefined || value === null || value === ''
      case 'equals':
        return value === expected
      case 'not_equals':
        return value !== expected
      case 'contains':
        return Array.isArray(value) ? value.includes(expected) : String(value ?? '').includes(String(expected))
      case 'gt':
        return Number(value) > Number(expected)
      case 'gte':
        return Number(value) >= Number(expected)
      case 'lt':
        return Number(value) < Number(expected)
      case 'lte':
        return Number(value) <= Number(expected)
      default:
        return true
    }
  }

  private stableShuffle<T extends { id: string }>(items: T[], seed: string): T[] {
    return [...items]
      .map((item) => ({ item, score: createHash('sha256').update(`${seed}:${item.id}`).digest('hex') }))
      .sort((left, right) => left.score.localeCompare(right.score))
      .map(({ item }) => item)
  }

  private assertWritable(responseSession: any): void {
    if (responseSession.status === 'submitted' || responseSession.status === 'locked' || responseSession.submission) {
      throw new BadRequestException('La soumission est définitive et verrouillée')
    }
  }

  private hasUsableAnswer(question: any, answer: any): boolean {
    if (!answer) return false

    const value = answer.value

    if (value === null || value === undefined) return false

    if (typeof value === 'string') return value.trim().length > 0

    if (Array.isArray(value)) return value.length > 0

    if (question.responseType === 'number') return Number.isFinite(Number(value))

    return true
  }

  private detectIdentifyingData(value: unknown): string | null {
    const text = typeof value === 'string' ? value : JSON.stringify(value ?? '')

    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) {
      return 'Adresse email détectée dans une réponse libre'
    }

    if (/(?:\+?\d[\d .-]{7,}\d)/.test(text)) {
      return 'Numéro de téléphone potentiel détecté dans une réponse libre'
    }

    return null
  }

  private pathFingerprint(sessionId: string, pathQuestionIds: string[]): string {
    return createHash('sha256').update(`${sessionId}:${pathQuestionIds.join('|')}`).digest('hex')
  }
}
