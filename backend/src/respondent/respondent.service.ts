import { createHash, randomBytes } from 'node:crypto'

import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import { AccessTokenService } from '../security/access-token.service'
import type { SaveAnswersDto } from './dto/save-answers.dto'
import type { TelemetryDto } from './dto/telemetry.dto'

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

    const allowedQuestionIds = new Set(
      invitation.questionnaireVersion.groups.flatMap((group: any) => group.questions.map((question: any) => question.id)),
    )

    for (const answer of dto.answers) {
      if (!allowedQuestionIds.has(answer.questionId)) {
        throw new BadRequestException('La question ne fait pas partie du questionnaire assigné')
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
    const { responseSession } = await this.resolveOrCreateSession(dto.token)
    const event = await this.prisma.telemetryEvent.create({
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

    return { event }
  }

  async submit(token: string) {
    const { invitation, responseSession } = await this.resolveOrCreateSession(token)
    this.assertWritable(responseSession)

    const answerCount = await this.prisma.answer.count({ where: { responseSessionId: responseSession.id } })
    const pathFingerprint = this.pathFingerprint(responseSession.id, answerCount)

    const submission = await this.prisma.$transaction(async (tx: any) => {
      const created = await tx.submission.create({
        data: {
          responseSessionId: responseSession.id,
          publicCode: responseSession.publicCode,
          questionnaireVersionId: responseSession.questionnaireVersionId,
          buildingId: responseSession.buildingId,
          answerCount,
          pathFingerprint,
        },
      })

      await tx.answer.updateMany({
        where: { responseSessionId: responseSession.id },
        data: { isDraft: false },
      })

      await tx.responseSession.update({
        where: { id: responseSession.id },
        data: {
          status: 'locked',
          submittedAt: new Date(),
          lockedAt: new Date(),
          pathFingerprint,
        },
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'submitted',
          submittedAt: new Date(),
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
      metadata: { answerCount },
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
    const answerByQuestionId = new Map((responseSession.answers ?? []).map((answer: any) => [answer.questionId, answer]))
    const version = invitation.questionnaireVersion

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
        groups: version.groups.map((group: any) => ({
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

  private assertWritable(responseSession: any): void {
    if (responseSession.status === 'submitted' || responseSession.status === 'locked' || responseSession.submission) {
      throw new BadRequestException('La soumission est définitive et verrouillée')
    }
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

  private pathFingerprint(sessionId: string, answerCount: number): string {
    return createHash('sha256').update(`${sessionId}:${answerCount}`).digest('hex')
  }
}
