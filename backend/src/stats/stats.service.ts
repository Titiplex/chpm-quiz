import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { AuthenticatedUser } from '../auth/auth.types'
import { assertCanAccessQuestionnaire, sameOrganizationOrUnscoped } from '../common/access-scope'
import { PrismaService } from '../prisma/prisma.service'

const freeTextTypes = new Set(['free_text', 'free_text_short', 'free_text_long'])
const openedStatuses = new Set(['opened', 'in_progress', 'draft', 'submitted'])
const startedStatuses = new Set(['in_progress', 'draft', 'submitted'])

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
            submissions: {
              include: {
                building: true,
                responseSession: {
                  include: {
                    telemetryEvents: true,
                  },
                },
              },
            },
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
              orderBy: { displayOrder: 'asc' },
              include: {
                questions: {
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    likertScale: true,
                    answers: {
                      include: {
                        responseSession: {
                          select: {
                            id: true,
                            publicCode: true,
                            status: true,
                          },
                        },
                      },
                    },
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

    this.assertCanReadQuestionnaireStats(questionnaire, user)

    const scopedVersions = questionnaire.versions.map((version: any) => ({
      ...version,
      invitations: version.invitations.filter((invitation: any) => this.isInvitationVisible(invitation, user)),
      submissions: version.submissions.filter((submission: any) => this.isSubmissionVisible(submission, user)),
    }))

    const visibleSessionIds = new Set<string>(
      scopedVersions.flatMap((version: any) => [
        ...version.invitations
          .map((invitation: any) => invitation.responseSession?.id)
          .filter((id: unknown): id is string => typeof id === 'string'),
        ...version.submissions
          .map((submission: any) => submission.responseSessionId)
          .filter((id: unknown): id is string => typeof id === 'string'),
      ]),
    )

    const scopedInvitations = scopedVersions.flatMap((version: any) => version.invitations)
    const scopedSubmissions = scopedVersions.flatMap((version: any) => version.submissions)
    const totalInvited = scopedInvitations.length
    const totalOpened = scopedInvitations.filter((invitation: any) => this.isOpened(invitation)).length
    const totalStarted = scopedInvitations.filter((invitation: any) => this.isStarted(invitation)).length
    const totalSubmitted = scopedSubmissions.length
    const totalExpired = scopedInvitations.filter((invitation: any) => invitation.status === 'expired').length
    const telemetryEvents = scopedInvitations.flatMap((invitation: any) => invitation.responseSession?.telemetryEvents ?? [])
    const totalDurations = telemetryEvents
      .filter((event: any) => event.eventType === 'questionnaire_total_time')
      .map((event: any) => event.durationMs)
      .filter((duration: unknown): duration is number => typeof duration === 'number')
    const abandoned = Math.max(totalStarted - totalSubmitted, 0)

    return {
      questionnaire: {
        id: questionnaire.id,
        code: questionnaire.code,
        title: questionnaire.title,
      },
      threshold: this.threshold(),
      totals: {
        invited: totalInvited,
        opened: totalOpened,
        started: totalStarted,
        submitted: totalSubmitted,
        abandoned,
        expired: totalExpired,
        openingRate: this.percent(totalOpened, totalInvited),
        startRate: this.percent(totalStarted, totalInvited),
        submissionRate: this.percent(totalSubmitted, totalInvited),
        completionRate: this.percent(totalSubmitted, totalInvited),
        abandonmentRate: this.percent(abandoned, totalStarted),
        telemetryEvents: telemetryEvents.length,
        popupOpens: telemetryEvents.filter((event: any) => event.eventType === 'popup_open').length,
        answerChanges: telemetryEvents.filter((event: any) => event.eventType === 'answer_change').length,
        backtracks: telemetryEvents.filter((event: any) => event.eventType === 'backward_navigation').length,
        resumes: telemetryEvents.filter((event: any) => event.eventType === 'questionnaire_resume').length,
        medianTotalDurationMs: this.median(totalDurations),
      },
      versions: scopedVersions.map((version: any) => this.versionStats(version)),
      buildings: this.buildingBreakdown(scopedInvitations),
      deliveryModes: this.deliveryModeBreakdown(scopedInvitations),
      groups: this.groupBreakdown(scopedVersions, visibleSessionIds),
      questions: this.questionBreakdown(scopedVersions, visibleSessionIds, user),
      submissions: this.submissionBreakdown(scopedVersions),
    }
  }

  async questionStats(questionId: string, user: AuthenticatedUser) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        group: {
          include: {
            questionnaireVersion: {
              include: {
                questionnaire: true,
              },
            },
          },
        },
      },
    })

    if (!question) {
      throw new NotFoundException('Question introuvable')
    }

    const questionnaireStats = await this.questionnaireStats(question.group.questionnaireVersion.questionnaire.id, user)
    const row = questionnaireStats.questions.find((candidate: any) => candidate.id === questionId)

    if (!row) {
      throw new NotFoundException('Question introuvable dans votre périmètre')
    }

    return {
      questionnaire: questionnaireStats.questionnaire,
      group: {
        id: question.group.id,
        title: question.group.title,
      },
      question: row,
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
              orderBy: { createdAt: 'asc' },
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

    const totalDurationMs = this.firstDuration(submission.responseSession.telemetryEvents, 'questionnaire_total_time')

    return {
      publicCode: submission.publicCode,
      status: submission.status,
      submittedAt: submission.submittedAt,
      startedAt: submission.responseSession.startedAt,
      totalDurationMs,
      answerCount: submission.answerCount,
      questionnaire: submission.questionnaireVersion.questionnaire.title,
      versionLabel: submission.questionnaireVersion.versionLabel,
      building: submission.building.label,
      answers: submission.responseSession.answers.map((answer: any) => ({
        questionCode: answer.question.code,
        questionLabel: answer.question.label,
        responseType: answer.question.responseType,
        value: answer.value,
        warning: answer.identifiabilityWarning ? answer.warningReason : null,
      })),
      telemetry: {
        totalEvents: submission.responseSession.telemetryEvents.length,
        popupOpens: submission.responseSession.telemetryEvents.filter((event: any) => event.eventType === 'popup_open').length,
        answerChanges: submission.responseSession.telemetryEvents.filter((event: any) => event.eventType === 'answer_change').length,
        backtracks: submission.responseSession.telemetryEvents.filter((event: any) => event.eventType === 'backward_navigation').length,
        resumes: submission.responseSession.telemetryEvents.filter((event: any) => event.eventType === 'questionnaire_resume').length,
      },
    }
  }


  private assertCanReadQuestionnaireStats(questionnaire: any, user: AuthenticatedUser): void {
    if (user.role === 'site_manager') {
      if (!sameOrganizationOrUnscoped(user, questionnaire.organizationId)) {
        throw new NotFoundException('Questionnaire introuvable dans votre périmètre')
      }
      return
    }

    assertCanAccessQuestionnaire(user, questionnaire)
  }

  private versionStats(version: any) {
    const invited = version.invitations.length
    const opened = version.invitations.filter((invitation: any) => this.isOpened(invitation)).length
    const started = version.invitations.filter((invitation: any) => this.isStarted(invitation)).length
    const submitted = version.submissions.length
    const abandoned = Math.max(started - submitted, 0)

    return {
      id: version.id,
      versionLabel: version.versionLabel,
      status: version.status,
      invited,
      opened,
      started,
      submitted,
      abandoned,
      openingRate: this.percent(opened, invited),
      startRate: this.percent(started, invited),
      submissionRate: this.percent(submitted, invited),
      completionRate: this.percent(submitted, invited),
      abandonmentRate: this.percent(abandoned, started),
      effectifSufficient: submitted >= this.threshold(),
    }
  }

  private buildingBreakdown(invitations: any[]) {
    const byBuilding = new Map<string, { label: string; invited: number; opened: number; submitted: number; started: number }>()

    for (const invitation of invitations) {
      const row = byBuilding.get(invitation.buildingId) ?? {
        label: invitation.building.label,
        invited: 0,
        opened: 0,
        started: 0,
        submitted: 0,
      }
      row.invited += 1
      if (this.isOpened(invitation)) row.opened += 1
      if (this.isStarted(invitation)) row.started += 1
      if (invitation.status === 'submitted') row.submitted += 1
      byBuilding.set(invitation.buildingId, row)
    }

    return Array.from(byBuilding.entries()).map(([buildingId, row]) => {
      const effectifSufficient = row.submitted >= this.threshold()

      return {
        buildingId,
        label: row.label,
        invited: effectifSufficient ? row.invited : null,
        opened: effectifSufficient ? row.opened : null,
        started: effectifSufficient ? row.started : null,
        submitted: effectifSufficient ? row.submitted : null,
        effectifSufficient,
        openingRate: effectifSufficient ? this.percent(row.opened, row.invited) : null,
        startRate: effectifSufficient ? this.percent(row.started, row.invited) : null,
        submissionRate: effectifSufficient ? this.percent(row.submitted, row.invited) : null,
        completionRate: effectifSufficient ? this.percent(row.submitted, row.invited) : null,
        displayValue: effectifSufficient ? `${row.submitted} soumis` : 'effectif insuffisant',
      }
    })
  }

  private deliveryModeBreakdown(invitations: any[]) {
    const labels: Record<string, string> = {
      email: 'Email réel',
      email_simulation: 'Email simulé',
      onsite_terminal: 'Terminal hospitalier',
    }

    const byMode = new Map<string, { invited: number; opened: number; started: number; submitted: number }>()

    for (const invitation of invitations) {
      const mode = invitation.deliveryMode ?? 'email_simulation'
      const row = byMode.get(mode) ?? { invited: 0, opened: 0, started: 0, submitted: 0 }
      row.invited += 1
      if (this.isOpened(invitation)) row.opened += 1
      if (this.isStarted(invitation)) row.started += 1
      if (invitation.status === 'submitted') row.submitted += 1
      byMode.set(mode, row)
    }

    return Array.from(byMode.entries()).map(([mode, row]) => ({
      mode,
      label: labels[mode] ?? mode,
      invited: row.invited,
      opened: row.opened,
      started: row.started,
      submitted: row.submitted,
      openingRate: this.percent(row.opened, row.invited),
      startRate: this.percent(row.started, row.invited),
      submissionRate: this.percent(row.submitted, row.invited),
    }))
  }

  private groupBreakdown(versions: any[], visibleSessionIds?: Set<string>) {
    const scopedSessionIds = visibleSessionIds ?? new Set<string>()
    const hasScope = scopedSessionIds.size > 0

    return versions.flatMap((version: any) => version.groups.map((group: any) => {
      const questions = group.questions ?? []
      const answers = questions.flatMap((question: any) => question.answers ?? [])
        .filter((answer: any) => !answer.isDraft && (!hasScope || scopedSessionIds.has(answer.responseSessionId)))
      const events = questions.flatMap((question: any) => [
        ...(question.telemetryEvents ?? []),
        ...(question.popupDefinitions ?? []).flatMap((popup: any) => popup.telemetryEvents ?? []),
      ]).filter((event: any) => !hasScope || scopedSessionIds.has(event.responseSessionId))
      const sessionCount = new Set(answers.map((answer: any) => answer.responseSessionId).filter(Boolean)).size
      const effectifSufficient = sessionCount >= this.threshold()
      const durations = events
        .filter((event: any) => event.eventType === 'question_time' || event.eventType === 'page_change')
        .map((event: any) => event.durationMs)
        .filter((duration: unknown): duration is number => typeof duration === 'number')
      const popupOpens = events.filter((event: any) => event.eventType === 'popup_open').length

      return {
        id: group.id,
        title: group.title,
        versionId: version.id,
        versionLabel: version.versionLabel,
        questionCount: questions.length,
        answerCount: effectifSufficient ? answers.length : null,
        respondentCount: effectifSufficient ? sessionCount : null,
        popupOpens: effectifSufficient ? popupOpens : null,
        medianDurationMs: effectifSufficient ? this.median(durations) : null,
        effectifSufficient,
        displayValue: effectifSufficient ? `${sessionCount} répondant(s)` : 'effectif insuffisant',
      }
    }))
  }

  private questionBreakdown(versions: any[], visibleSessionIds: Set<string> | undefined, user: AuthenticatedUser) {
    const questions = versions.flatMap((version: any) => version.groups.flatMap((group: any) => group.questions))
    const scopedSessionIds = visibleSessionIds ?? new Set<string>()
    const hasScope = scopedSessionIds.size > 0
    const canReadFreeText = this.canReadFreeText(user)

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
      const popupOpenRate = sessionCount > 0 ? this.percent(popupOpens, sessionCount) : 0
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
        likertDistribution: effectifSufficient ? this.likertDistribution(question, submittedAnswers) : null,
        freeTextResponses: effectifSufficient && canReadFreeText && freeTextTypes.has(question.responseType)
          ? this.freeTextResponses(submittedAnswers)
          : [],
        freeTextAccess: freeTextTypes.has(question.responseType)
          ? (canReadFreeText ? 'granted' : 'forbidden')
          : 'not_applicable',
        highMedianDuration,
        popupOftenOpened,
        difficultQuestion: difficultyLabels.length > 0,
        difficultyLabels: effectifSufficient ? difficultyLabels : [],
        effectifSufficient,
        displayValue: effectifSufficient ? `${submittedAnswers.length} réponse(s)` : 'effectif insuffisant',
      }
    })
  }

  private submissionBreakdown(versions: any[]) {
    return versions
      .flatMap((version: any) => version.submissions.map((submission: any) => {
        const totalDurationMs = this.firstDuration(submission.responseSession?.telemetryEvents ?? [], 'questionnaire_total_time')

        return {
          publicCode: submission.publicCode,
          building: submission.building?.label ?? 'Bâtiment inconnu',
          status: submission.status,
          startedAt: submission.responseSession?.startedAt ?? null,
          submittedAt: submission.submittedAt,
          answerCount: submission.answerCount,
          totalDurationMs,
          telemetryEvents: submission.responseSession?.telemetryEvents?.length ?? 0,
          versionLabel: version.versionLabel,
        }
      }))
      .sort((left: any, right: any) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime())
  }

  private likertDistribution(question: any, answers: any[]) {
    if (question.responseType !== 'likert') {
      return null
    }

    const scale = question.likertScale
    const minValue = scale?.minValue ?? 1
    const points = scale?.points ?? 5
    const counts = new Map<number, number>()

    for (let value = minValue; value < minValue + points; value += 1) {
      counts.set(value, 0)
    }

    for (const answer of answers) {
      const value = this.toNumber(answer.value)
      if (value !== null) {
        counts.set(value, (counts.get(value) ?? 0) + 1)
      }
    }

    return Array.from(counts.entries()).map(([value, count]) => ({
      value,
      label: this.likertLabel(value, minValue, points, scale),
      count,
      rate: this.percent(count, answers.length),
    }))
  }

  private freeTextResponses(answers: any[]) {
    return answers.slice(0, 25).map((answer: any) => ({
      publicCode: answer.responseSession?.publicCode ?? null,
      value: this.stringifyAnswer(answer.value),
      warning: answer.identifiabilityWarning ? answer.warningReason : null,
    }))
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    return null
  }

  private likertLabel(value: number, minValue: number, points: number, scale: any): string {
    if (value === minValue) return scale?.leftAnchor ?? String(value)
    if (value === minValue + points - 1) return scale?.rightAnchor ?? String(value)
    if (scale?.neutralLabel && value === minValue + Math.floor(points / 2)) return scale.neutralLabel
    return String(value)
  }

  private stringifyAnswer(value: unknown): string {
    if (typeof value === 'string') return value
    if (value === null || value === undefined) return ''
    return JSON.stringify(value)
  }

  private firstDuration(events: any[], eventType: string): number | null {
    const event = events.find((candidate: any) => candidate.eventType === eventType && typeof candidate.durationMs === 'number')
    return event?.durationMs ?? null
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

  private percent(numerator: number, denominator: number): number {
    return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100)
  }

  private isOpened(invitation: any): boolean {
    return Boolean(invitation.openedAt) || openedStatuses.has(invitation.status)
  }

  private isStarted(invitation: any): boolean {
    return Boolean(invitation.responseSession) || Boolean(invitation.startedAt) || startedStatuses.has(invitation.status)
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

  private canReadFreeText(user?: AuthenticatedUser): boolean {
    return ['admin', 'analyst', 'dpo'].includes(user?.role ?? '')
  }

  private threshold(): number {
    return Math.max(Number(this.config.get<string>('STATISTICS_MIN_GROUP_SIZE', '5')), 1)
  }
}
