import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { RespondentService } from './respondent.service'

function makeQuestionnaireVersion() {
  return {
    id: 'version-1',
    versionLabel: '1.0',
    language: 'fr',
    description: 'Description',
    finality: 'Finalité',
    questionnaire: {
      id: 'questionnaire-1',
      title: 'Questionnaire fonctionnel',
      description: 'Questionnaire de test',
      finality: 'Finalité questionnaire',
    },
    conditionalRules: [
      {
        trigger: { questionCode: 'Q1', equals: 'non' },
        effect: { action: 'hide_question', questionId: 'q2' },
      },
    ],
    groups: [
      {
        id: 'g1',
        title: 'Groupe 1',
        description: null,
        questionsPerPage: 1,
        randomize: false,
        conditionExpression: null,
        questions: [
          {
            id: 'q1',
            code: 'Q1',
            label: 'Question filtre',
            helperText: null,
            responseType: 'single_choice',
            isRequired: true,
            displayOrder: 10,
            conditionExpression: null,
            likertScale: null,
            answerOptions: [
              { id: 'o1', value: 'oui', label: 'Oui', displayOrder: 10 },
              { id: 'o2', value: 'non', label: 'Non', displayOrder: 20 },
            ],
            popupDefinitions: [],
          },
          {
            id: 'q2',
            code: 'Q2',
            label: 'Question conditionnelle',
            helperText: null,
            responseType: 'free_text_short',
            isRequired: true,
            displayOrder: 20,
            conditionExpression: null,
            likertScale: null,
            answerOptions: [],
            popupDefinitions: [],
          },
        ],
      },
    ],
  }
}

function makeInvitation(responseSession: any) {
  return {
    id: 'invitation-1',
    publicCode: 'CODE-1',
    tokenHash: 'token-hash',
    status: 'opened',
    expiresAt: new Date(Date.now() + 86_400_000),
    openedAt: new Date(),
    startedAt: new Date(),
    questionnaireVersionId: 'version-1',
    buildingId: 'building-1',
    building: { id: 'building-1', label: 'Bâtiment A' },
    responseSession: responseSession
      ? { questionnaireVersionId: 'version-1', buildingId: 'building-1', ...responseSession }
      : responseSession,
    questionnaireVersion: makeQuestionnaireVersion(),
  }
}

function makeService(invitation: any) {
  const tx = {
    answer: {
      upsert: vi.fn(async ({ create }) => ({ id: 'answer-created', ...create })),
      updateMany: vi.fn(async () => ({ count: 1 })),
      count: vi.fn(async () => 1),
    },
    responseSession: {
      create: vi.fn(async ({ data }) => ({ id: 'session-created', ...data, answers: [], submission: null, currentPage: 1 })),
      update: vi.fn(async ({ data }) => ({ ...data })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    invitation: {
      update: vi.fn(async ({ data }) => ({ ...invitation, ...data })),
    },
    telemetryEvent: {
      create: vi.fn(async ({ data }) => ({ id: 'telemetry-1', ...data })),
    },
    submission: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }) => ({ id: 'submission-1', submittedAt: new Date(), ...data })),
    },
  }

  const prisma = {
    invitation: {
      findUnique: vi.fn(async () => invitation),
      update: tx.invitation.update,
    },
    answer: {
      count: vi.fn(async () => 1),
    },
    $transaction: vi.fn(async (callback: (transaction: typeof tx) => unknown) => callback(tx)),
  }

  const accessToken = {
    verify: vi.fn(() => ({ publicCode: 'CODE-1', tokenHash: 'token-hash' })),
  }
  const audit = {
    log: vi.fn(async () => undefined),
  }
  const notifications = {
    notifySubmissionReceived: vi.fn(async () => undefined),
  }

  return {
    service: new RespondentService(prisma as any, accessToken as any, audit as any, notifications as any),
    prisma,
    tx,
    audit,
    notifications,
  }
}

describe('RespondentService functional flow', () => {
  it('creates a respondent session from a valid signed invitation link', async () => {
    const invitation = makeInvitation(null)
    const { service, tx } = makeService(invitation)

    const response = await service.getSession('token')

    expect(tx.responseSession.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        invitationId: 'invitation-1',
        publicCode: 'CODE-1',
        status: 'draft',
      }),
    }))
    expect(response.responseSession.publicCode).toBe('CODE-1')
    expect(response.questionnaire.groups[0].questions.map((question: any) => question.id)).toEqual(['q1', 'q2'])
  })

  it('refuses to save an answer for a question hidden by the active conditional path', async () => {
    const invitation = makeInvitation({
      id: 'session-1',
      publicCode: 'CODE-1',
      status: 'draft',
      currentPage: 1,
      randomizationSeed: 'seed',
      answers: [{ id: 'answer-q1', questionId: 'q1', value: 'non' }],
      submission: null,
    })
    const { service } = makeService(invitation)

    await expect(service.saveAnswers({ token: 'token', answers: [{ questionId: 'q2', value: 'texte' }] })).rejects.toThrow(BadRequestException)
  })

  it('saves active answers and marks directly identifying content as a warning', async () => {
    const invitation = makeInvitation({
      id: 'session-1',
      publicCode: 'CODE-1',
      status: 'draft',
      currentPage: 1,
      randomizationSeed: 'seed',
      answers: [],
      submission: null,
    })
    const { service, tx } = makeService(invitation)

    const response = await service.saveAnswers({
      token: 'token',
      answers: [{ questionId: 'q1', value: 'contact@example.org' }],
    })

    expect(tx.answer.upsert).toHaveBeenCalledOnce()
    expect(response.warnings).toEqual([{ questionId: 'q1', reason: 'Adresse email détectée dans une réponse libre' }])
    expect(tx.responseSession.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'session-1' },
      data: expect.objectContaining({ status: 'draft', pathFingerprint: expect.any(String) }),
    }))
  })



  it('refuses final submission when a required visible answer is empty', async () => {
    const invitation = makeInvitation({
      id: 'session-1',
      publicCode: 'CODE-1',
      status: 'draft',
      currentPage: 1,
      randomizationSeed: 'seed',
      answers: [{ id: 'answer-q1', questionId: 'q1', value: '' }],
      submission: null,
    })
    const { service, tx } = makeService(invitation)

    await expect(service.submit('token')).rejects.toThrow(BadRequestException)
    expect(tx.submission.create).not.toHaveBeenCalled()
  })

  it('locks a final submission and refuses telemetry once locked', async () => {
    const invitation = makeInvitation({
      id: 'session-1',
      publicCode: 'CODE-1',
      status: 'draft',
      currentPage: 1,
      randomizationSeed: 'seed',
      answers: [
        { id: 'answer-q1', questionId: 'q1', value: 'oui' },
        { id: 'answer-q2', questionId: 'q2', value: 'Réponse libre' },
      ],
      submission: null,
    })
    const { service, tx, notifications } = makeService(invitation)

    const response = await service.submit('token')
    expect(response.submission.publicCode).toBe('CODE-1')
    expect(tx.responseSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'locked', submittedAt: expect.any(Date), lockedAt: expect.any(Date) }),
    }))
    expect(tx.answer.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { isDraft: false } }))
    expect(notifications.notifySubmissionReceived).toHaveBeenCalledWith(expect.objectContaining({
      publicCode: 'CODE-1',
      invitationId: 'invitation-1',
      questionnaireVersionId: 'version-1',
      buildingId: 'building-1',
      answerCount: 1,
    }))

    invitation.responseSession.status = 'locked'
    await expect(service.recordTelemetry({ token: 'token', eventType: 'page_view' })).rejects.toThrow(BadRequestException)
  })

  it('refuses expired invitations before creating or updating a respondent session', async () => {
    const invitation = makeInvitation(null)
    invitation.expiresAt = new Date(Date.now() - 1_000)
    const { service, tx } = makeService(invitation)

    await expect(service.getSession('token')).rejects.toThrow(ForbiddenException)
    expect(tx.responseSession.create).not.toHaveBeenCalled()
  })
})
