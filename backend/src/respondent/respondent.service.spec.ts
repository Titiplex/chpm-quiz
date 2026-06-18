import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { RespondentService } from './respondent.service'

function makeService() {
  return new RespondentService({} as any, {} as any, {} as any, { notifySubmissionReceived: vi.fn() } as any) as any
}

describe('RespondentService unit rules', () => {
  it('evaluates nested conditional expressions by question code and value', () => {
    const service = makeService()
    const context = {
      answerByQuestionId: new Map([['q1', 3]]),
      answersByCode: new Map([['P1', 3], ['LANGUE', 'fr']]),
    }

    expect(service.evaluateCondition({ questionCode: 'p1', operator: 'gte', value: 2 }, context)).toBe(true)
    expect(service.evaluateCondition({ all: [{ questionCode: 'P1', operator: 'gte', value: 2 }, { questionCode: 'LANGUE', equals: 'fr' }] }, context)).toBe(true)
    expect(service.evaluateCondition({ any: [{ questionCode: 'P1', operator: 'lt', value: 2 }, { questionCode: 'LANGUE', equals: 'fr' }] }, context)).toBe(true)
    expect(service.evaluateCondition({ not: { questionCode: 'LANGUE', equals: 'en' } }, context)).toBe(true)
  })

  it('renders active respondent path with stable randomization and hide_question rules', () => {
    const service = makeService()
    const version = {
      conditionalRules: [
        {
          trigger: { questionCode: 'Q1', equals: 'non' },
          effect: { action: 'hide_question', questionId: 'q3' },
        },
      ],
      groups: [
        {
          id: 'g1',
          randomize: true,
          conditionExpression: null,
          questions: [
            { id: 'q1', code: 'Q1', conditionExpression: null },
            { id: 'q2', code: 'Q2', conditionExpression: null },
            { id: 'q3', code: 'Q3', conditionExpression: null },
          ],
        },
      ],
    }
    const responseSession = {
      id: 'session-1',
      randomizationSeed: 'fixed-seed',
      answers: [{ questionId: 'q1', value: 'non' }],
    }

    const firstRender = service.renderVersion(version, responseSession)
    const secondRender = service.renderVersion(version, responseSession)

    expect(firstRender.pathQuestionIds).not.toContain('q3')
    expect(firstRender.pathQuestionIds).toEqual(secondRender.pathQuestionIds)
    expect(firstRender.pathQuestionIds.sort()).toEqual(['q1', 'q2'])
  })

  it('locks submitted sessions, validates required answers and detects directly identifying free-text content', () => {
    const service = makeService()

    expect(() => service.assertWritable({ status: 'locked' })).toThrow(BadRequestException)
    expect(service.hasUsableAnswer({ responseType: 'free_text_long' }, { value: '  ' })).toBe(false)
    expect(service.hasUsableAnswer({ responseType: 'multiple_choice' }, { value: [] })).toBe(false)
    expect(service.hasUsableAnswer({ responseType: 'number' }, { value: 4 })).toBe(true)
    expect(service.detectIdentifyingData('Contactez moi à john@example.org')).toBe('Adresse email détectée dans une réponse libre')
    expect(service.detectIdentifyingData('Téléphone +33 6 12 34 56 78')).toBe('Numéro de téléphone potentiel détecté dans une réponse libre')
    expect(service.detectIdentifyingData('Réponse clinique sans identifiant')).toBeNull()
  })
})
