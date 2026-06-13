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
            submissions: true,
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
      submissions: version.submissions.filter((submission: any) => this.isBuildingVisible(submission.buildingId, user)),
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
      },
      versions: scopedVersions.map((version: any) => this.versionStats(version)),
      buildings: this.buildingBreakdown(scopedVersions.flatMap((version: any) => version.invitations)),
      questions: this.questionBreakdown(scopedVersions),
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

    if (!submission || !this.isBuildingVisible(submission.buildingId, user)) {
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

    return Array.from(byBuilding.entries()).map(([buildingId, row]) => ({
      buildingId,
      label: row.label,
      invited: row.invited,
      started: row.started,
      submitted: row.submitted,
      effectifSufficient: row.submitted >= this.threshold(),
      completionRate: row.invited === 0 ? 0 : Math.round((row.submitted / row.invited) * 100),
      displayValue: row.submitted >= this.threshold() ? `${row.submitted} soumis` : 'effectif insuffisant',
    }))
  }

  private questionBreakdown(versions: any[]) {
    const questions = versions.flatMap((version: any) => version.groups.flatMap((group: any) => group.questions))

    return questions.map((question: any) => {
      const submittedAnswers = question.answers.filter((answer: any) => !answer.isDraft)
      const popupOpens = question.popupDefinitions.reduce(
        (total: number, popup: any) => total + popup.telemetryEvents.filter((event: any) => event.eventType === 'popup_open').length,
        0,
      )

      return {
        id: question.id,
        code: question.code,
        label: question.label,
        responseType: question.responseType,
        answerCount: submittedAnswers.length,
        popupOpens,
        effectifSufficient: submittedAnswers.length >= this.threshold(),
      }
    })
  }

  private isInvitationVisible(invitation: any, user: AuthenticatedUser): boolean {
    return this.isBuildingVisible(invitation.buildingId, user)
  }

  private isBuildingVisible(buildingId: string, user: AuthenticatedUser): boolean {
    if (user.role === 'moderator') {
      return user.buildingId === buildingId
    }

    if (user.role === 'site_manager') {
      return true
    }

    return true
  }

  private threshold(): number {
    return Math.max(Number(this.config.get<string>('STATISTICS_MIN_GROUP_SIZE', '5')), 1)
  }
}
