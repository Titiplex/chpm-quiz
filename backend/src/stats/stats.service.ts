import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { AuthenticatedUser } from '../auth/auth.types'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class StatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async questionnaireStats(questionnaireId: string, user: AuthenticatedUser) {
    const questionnaire = await this.prisma.questionnaire.findUnique({
      where: { id: questionnaireId },
      include: {
        versions: {
          orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            submissions: { include: { building: true } },
            invitations: {
              include: {
                building: true,
                responseSession: {
                  include: {
                    telemetryEvents: true,
                    answers: true,
                  },
                },
              },
            },
            groups: {
              include: {
                questions: {
                  include: {
                    answers: true,
                    telemetryEvents: true,
                    popupDefinitions: { include: { telemetryEvents: true } },
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!questionnaire) {
      throw new NotFoundException('Questionnaire introuvable')
    }

    const scopedVersions = questionnaire.versions.map((version: any) => ({
      ...version,
      invitations: version.invitations.filter((invitation: any) => this.isInvitationVisible(invitation, user)),
      submissions: version.submissions.filter((submission: any) => this.isSubmissionVisible(submission, user)),
    }))

    const totalInvited = scopedVersions.reduce((total: number, version: any) => total + version.invitations.length, 0)
    const totalStarted = scopedVersions.reduce(
      (total: number, version: any) => total + version.invitations.filter((invitation: any) => invitation.responseSession).length,
      0,
    )
    const totalSubmitted = scopedVersions.reduce((total: number, version: any) => total + version.submissions.length, 0)
    const totalExpired = scopedVersions.reduce(
      (total: number, version: any) => total + version.invitations.filter((invitation: any) => invitation.status === 'expired').length,
      0,
    )

    const telemetryEvents = scopedVersions.flatMap((version: any) =>
      version.invitations.flatMap((invitation: any) => invitation.responseSession?.telemetryEvents ?? []),
    )
    const visibleSessionIds = new Set<string>(
      scopedVersions.flatMap((version: any) =>
        version.invitations
          .map((invitation: any) => invitation.responseSession?.id)
          .filter((id: unknown): id is string => typeof id === 'string'),
      ),
    )
    const totalDurations = telemetryEvents
      .filter((event: any) => event.eventType === 'questionnaire_total_time')
      .map((event: any) => event.durationMs)
      .filter((duration: unknown): duration is number => typeof duration === 'number')

    return {
      questionnaire: {
        id: questionnaire.id,
        code: questionnaire.code,
        title: questionnaire.title,
      },
      threshold: this.threshold(),
      totals: {
        invited: totalInvited,
        started: totalStarted,
        submitted: totalSubmitted,
        abandoned: Math.max(totalStarted - totalSubmitted, 0),
        expired: totalExpired,
        completionRate: totalInvited === 0 ? 0 : Math.round((totalSubmitted / totalInvited) * 100),
        telemetryEvents: telemetryEvents.length,
        popupOpens: telemetryEvents.filter((event: any) => event.eventType === 'popup_open').length,
        answerChanges: telemetryEvents.filter((event: any) => event.eventType === 'answer_change').length,
        backtracks: telemetryEvents.filter((event: any) => event.eventType === 'backward_navigation').length,
        resumes: telemetryEvents.filter((event: any) => event.eventType === 'questionnaire_resume').length,
        medianTotalDurationMs: this.median(totalDurations),
      },
      versions: scopedVersions.map((version: any) => this.versionStats(version)),
      buildings: this.buildingBreakdown(scopedVersions.flatMap((version: any) => version.invitations)),
      questions: this.questionBreakdown(scopedVersions, visibleSessionIds),
    }
  }

  async submission(publicCode: string, user: AuthenticatedUser) {
    const submission = await this.prisma.submission.findFirst({
      where: {
        publicCode,
      },
      include: {
        responseSession: {
          include: {
            answers: {
              include: {
                question: true,
              },
            },
            telemetryEvents: true,
          },
        },
        building: true,
        questionnaireVersion: { include: { questionnaire: true } },
      },
    })

    if (!submission || !this.isSubmissionVisible(submission, user)) {
      throw new NotFoundException('Soumission introuvable dans votre périmètre')
    }

    return {
      publicCode: submission.publicCode,
      submittedAt: submission.submittedAt,
      answerCount: submission.answerCount,
      questionnaire: submission.questionnaireVersion.questionnaire.title,
      versionLabel: submission.questionnaireVersion.versionLabel,
      building: submission.building.label,
      answers: submission.responseSession.answers.map((answer: any) => ({
        questionCode: answer.question.code,
        questionLabel: answer.question.label,
        value: answer.value,
        warning: answer.identifiabilityWarning ? answer.warningReason : null,
      })),
      telemetryCount: submission.responseSession.telemetryEvents.length,
    }
  }

  private versionStats(version: any) {
    const invited = version.invitations.length
    const started = version.invitations.filter((invitation: any) => invitation.responseSession).length
    const submitted = version.submissions.length

    return {
      id: version.id,
      versionLabel: version.versionLabel,
      status: version.status,
      invited,
      started,
      submitted,
      completionRate: invited === 0 ? 0 : Math.round((submitted / invited) * 100),
      effectifSufficient: submitted >= this.threshold(),
    }
  }

  private buildingBreakdown(invitations: any[]) {
    const byBuilding = new Map<string, { label: string; invited: number; submitted: number; started: number }>()

    for (const invitation of invitations) {
      const row = byBuilding.get(invitation.buildingId) ?? {
        label: invitation.building.label,
        invited: 0,
        started: 0,
        submitted: 0,
      }
      row.invited += 1
      if (invitation.responseSession) row.started += 1
      if (invitation.status === 'submitted') row.submitted += 1
      byBuilding.set(invitation.buildingId, row)
    }

    return Array.from(byBuilding.entries()).map(([buildingId, row]) => {
      const effectifSufficient = row.submitted >= this.threshold()

      return {
        buildingId,
        label: row.label,
        invited: effectifSufficient ? row.invited : null,
        started: effectifSufficient ? row.started : null,
        submitted: effectifSufficient ? row.submitted : null,
        effectifSufficient,
        completionRate: effectifSufficient && row.invited > 0 ? Math.round((row.submitted / row.invited) * 100) : null,
        displayValue: effectifSufficient ? `${row.submitted} soumis` : 'effectif insuffisant',
      }
    })
  }

  private questionBreakdown(versions: any[], visibleSessionIds?: Set<string>) {
    const questions = versions.flatMap((version: any) => version.groups.flatMap((group: any) => group.questions))
    const scopedSessionIds = visibleSessionIds ?? new Set<string>()
    const hasScope = scopedSessionIds.size > 0

    return questions.map((question: any) => {
      const submittedAnswers = question.answers.filter((answer: any) => (
        !answer.isDraft && (!hasScope || scopedSessionIds.has(answer.responseSessionId))
      ))
      const questionEvents = question.telemetryEvents.filter((event: any) => (
        !hasScope || scopedSessionIds.has(event.responseSessionId)
      ))
      const popupDefinitionEvents = (question.popupDefinitions ?? [])
        .flatMap((popup: any) => popup.telemetryEvents ?? [])
        .filter((event: any) => !hasScope || scopedSessionIds.has(event.responseSessionId))
      const popupOpensFromQuestion = questionEvents.filter((event: any) => event.eventType === 'popup_open').length
      const popupOpensFromDefinitions = popupDefinitionEvents.filter((event: any) => event.eventType === 'popup_open').length
      const popupOpens = popupOpensFromQuestion || popupOpensFromDefinitions
      const responseChanges = questionEvents.filter((event: any) => event.eventType === 'answer_change').length
      const backtracks = questionEvents.filter((event: any) => event.eventType === 'backward_navigation').length
      const sessionCount = new Set([
        ...submittedAnswers.map((answer: any) => answer.responseSessionId),
        ...questionEvents.map((event: any) => event.responseSessionId),
        ...popupDefinitionEvents.map((event: any) => event.responseSessionId),
      ].filter(Boolean)).size
      const effectifSufficient = Math.max(sessionCount, submittedAnswers.length) >= this.threshold()
      const questionTimes = questionEvents
        .filter((event: any) => event.eventType === 'question_time' || event.eventType === 'page_change')
        .map((event: any) => event.durationMs)
        .filter((duration: unknown): duration is number => typeof duration === 'number')
      const medianDurationMs = this.median(questionTimes)
      const popupOpenRate = sessionCount > 0 ? Math.round((popupOpens / sessionCount) * 100) : 0
      const highMedianDuration = effectifSufficient && medianDurationMs !== null && medianDurationMs >= 60_000
      const popupOftenOpened = effectifSufficient && popupOpenRate >= 50 && popupOpens >= Math.min(this.threshold(), Math.max(sessionCount, 1))
      const frequentAnswerChanges = effectifSufficient && responseChanges >= Math.max(2, Math.ceil(Math.max(sessionCount, 1) * 0.3))
      const difficultyLabels = [
        ...(highMedianDuration ? ['temps médian élevé'] : []),
        ...(popupOftenOpened ? ['popup souvent ouverte'] : []),
        ...(frequentAnswerChanges ? ['changements de réponse'] : []),
      ]

      return {
        id: question.id,
        code: question.code,
        label: question.label,
        responseType: question.responseType,
        answerCount: effectifSufficient ? submittedAnswers.length : null,
        popupOpens: effectifSufficient ? popupOpens : null,
        popupOpenRate: effectifSufficient ? popupOpenRate : null,
        responseChanges: effectifSufficient ? responseChanges : null,
        backtracks: effectifSufficient ? backtracks : null,
        medianDurationMs: effectifSufficient ? medianDurationMs : null,
        highMedianDuration,
        popupOftenOpened,
        difficultQuestion: difficultyLabels.length > 0,
        difficultyLabels: effectifSufficient ? difficultyLabels : [],
        effectifSufficient,
        displayValue: effectifSufficient ? `${submittedAnswers.length} réponse(s)` : 'effectif insuffisant',
      }
    })
  }

  private median(values: number[]): number | null {
    if (!values.length) return null
    const sorted = [...values].sort((left, right) => left - right)
    const middle = Math.floor(sorted.length / 2)
    if (sorted.length % 2 === 0) {
      return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2)
    }

    return sorted[middle] ?? null
  }

  private isInvitationVisible(invitation: any, user: AuthenticatedUser): boolean {
    if (user.role === 'moderator') {
      return user.buildingId === invitation.buildingId
    }

    if (user.role === 'site_manager') {
      return user.siteId === invitation.building?.siteId
    }

    return true
  }

  private isSubmissionVisible(submission: any, user: AuthenticatedUser): boolean {
    if (user.role === 'moderator') {
      return user.buildingId === submission.buildingId
    }

    if (user.role === 'site_manager') {
      return user.siteId === submission.building?.siteId
    }

    return true
  }

  private isBuildingVisible(buildingId: string, user: AuthenticatedUser): boolean {
    if (user.role === 'moderator') {
      return user.buildingId === buildingId
    }

    return true
  }

  private threshold(): number {
    return Math.max(Number(this.config.get<string>('STATISTICS_MIN_GROUP_SIZE', '5')), 1)
  }
}
