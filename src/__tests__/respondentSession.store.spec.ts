import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useRespondentSessionStore } from '@/stores/respondentSession'
import { makeRespondentSession } from './fixtures/respondent'

describe('useRespondentSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads a respondent session and computes progress from saved answers', async () => {
    const session = makeRespondentSession()
    session.questionnaire.groups[0]!.questions[0]!.answer = {
      id: 'answer-1',
      questionId: 'question-p1',
      value: 2,
    }

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(session), { status: 200 })))

    const store = useRespondentSessionStore()
    await store.load('token-123')

    expect(store.status).toBe('ready')
    expect(store.session?.responseSession.publicCode).toBe('ITQ-0001')
    expect(store.questions).toHaveLength(2)
    expect(store.answeredCount).toBe(1)
    expect(store.progress).toBe(50)
  })

  it('saves an answer, stores warnings and refreshes the session', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/respondent/session?token=token-123')) {
        return new Response(JSON.stringify(makeRespondentSession()), { status: 200 })
      }

      if (String(url).endsWith('/respondent/answers')) {
        expect(init?.method).toBe('PUT')
        expect(JSON.parse(String(init?.body))).toEqual({
          token: 'token-123',
          answers: [{ questionId: 'question-p1', value: 4 }],
        })

        return new Response(
          JSON.stringify({
            savedAnswers: [{ id: 'answer-1', questionId: 'question-p1', value: 4 }],
            warnings: [{ questionId: 'question-p1', reason: 'test' }],
          }),
          { status: 200 },
        )
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useRespondentSessionStore()
    await store.load('token-123')
    await store.save('question-p1', 4)

    expect(store.status).toBe('ready')
    expect(store.warnings).toEqual([{ questionId: 'question-p1', reason: 'test' }])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
