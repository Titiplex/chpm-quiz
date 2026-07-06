import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useRespondentSessionStore } from '@/stores/respondentSession'
import { makeRespondentSession } from './fixtures/respondent'

describe('useRespondentSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    window.localStorage.clear()
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

  it('submits a loaded session and records telemetry with the terminal token', async () => {
    window.localStorage.setItem('chpm_terminal_access_token', 'terminal-token')
    const calls: Array<{ url: string; method?: string; body: unknown }> = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null
      calls.push({ url: String(url), method: init?.method, body })

      if (String(url).includes('/respondent/session')) {
        return new Response(JSON.stringify(makeRespondentSession()), { status: 200 })
      }
      if (String(url).endsWith('/respondent/telemetry')) {
        return new Response(JSON.stringify({ event: { id: 'event-1' } }), { status: 201 })
      }
      if (String(url).endsWith('/respondent/submit')) {
        return new Response(JSON.stringify({ submission: { id: 'submission-1', publicCode: 'ITQ-0001', submittedAt: '2026-01-01T10:00:00.000Z', answerCount: 2 } }), { status: 200 })
      }
      return new Response(JSON.stringify({ message: 'unexpected route' }), { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useRespondentSessionStore()
    await store.load('respondent-token')
    await store.telemetry({ eventType: 'answer_change', questionId: 'question-p1' })
    await store.submit()

    expect(store.status).toBe('submitted')
    expect(calls.find((call) => call.url.endsWith('/respondent/telemetry'))?.body).toMatchObject({
      token: 'respondent-token',
      terminalToken: 'terminal-token',
      eventType: 'answer_change',
      questionId: 'question-p1',
    })
    expect(calls.find((call) => call.url.endsWith('/respondent/submit'))?.body).toEqual({
      token: 'respondent-token',
      terminalToken: 'terminal-token',
    })
  })

  it('does not send telemetry before a token exists or after the session is locked', async () => {
    const lockedSession = makeRespondentSession()
    lockedSession.responseSession.status = 'locked'
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(lockedSession), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const store = useRespondentSessionStore()
    await store.telemetry({ eventType: 'page_view' })
    await store.load('locked-token')
    await store.telemetry({ eventType: 'answer_change' })

    expect(store.status).toBe('submitted')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('keeps respondent errors local to the store', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'Lien expiré' }), { status: 410 })))

    const store = useRespondentSessionStore()
    await store.load('expired-token')
    expect(store.status).toBe('error')
    expect(store.error).toBe('Lien expiré')

    store.token = 'expired-token'
    await expect(store.save('question-p1', 2)).rejects.toMatchObject({ message: 'Lien expiré' })
    expect(store.status).toBe('error')

    await expect(store.submit()).rejects.toMatchObject({ message: 'Lien expiré' })
    expect(store.error).toBe('Lien expiré')
  })

})
