import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import { TERMINAL_TOKEN_STORAGE_KEY } from '@/stores/terminal'
import type {
  RespondentSessionResponse,
  SaveAnswersResponse,
  SubmitResponse,
  TelemetryRequest,
} from '@shared/types/api'

type RespondentStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'submitted' | 'error'

export const useRespondentSessionStore = defineStore('respondentSession', () => {
  const token = ref<string | null>(null)
  const terminalToken = ref<string | null>(null)
  const session = ref<RespondentSessionResponse | null>(null)
  const status = ref<RespondentStatus>('idle')
  const error = ref<string | null>(null)
  const warnings = ref<Array<{ questionId: string; reason: string | null }>>([])

  const questions = computed(() =>
    session.value?.questionnaire.groups.flatMap((group) => group.questions) ?? [],
  )
  const isLocked = computed(() => session.value?.responseSession.status === 'locked')
  const answeredCount = computed(() => questions.value.filter((question) => question.answer).length)
  const progress = computed(() => {
    if (!questions.value.length) return 0
    return Math.round((answeredCount.value / questions.value.length) * 100)
  })

  async function load(rawToken: string): Promise<void> {
    token.value = rawToken
    terminalToken.value = resolveTerminalToken()
    status.value = 'loading'
    error.value = null

    try {
      const terminalQuery = terminalToken.value ? `&terminalToken=${encodeURIComponent(terminalToken.value)}` : ''
      session.value = await apiRequest<RespondentSessionResponse>(`/respondent/session?token=${encodeURIComponent(rawToken)}${terminalQuery}`)
      status.value = session.value.responseSession.status === 'locked' ? 'submitted' : 'ready'
    } catch (caught) {
      session.value = null
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Lien répondant invalide ou expiré.'
    }
  }

  async function save(questionId: string, value: unknown): Promise<void> {
    if (!token.value) return
    status.value = 'saving'
    error.value = null

    try {
      const response = await apiRequest<SaveAnswersResponse>('/respondent/answers', {
        method: 'PUT',
        body: {
          token: token.value,
          terminalToken: terminalToken.value ?? undefined,
          answers: [{ questionId, value }],
        },
      })
      warnings.value = response.warnings
      await load(token.value)
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Sauvegarde impossible.'
      throw caught
    }
  }

  async function telemetry(payload: Omit<TelemetryRequest, 'token'>): Promise<void> {
    if (!token.value || isLocked.value) return

    try {
      await apiRequest('/respondent/telemetry', {
        method: 'POST',
        body: { ...payload, token: token.value, terminalToken: terminalToken.value ?? undefined },
      })
    } catch {
      // Telemetry is deliberately best-effort and must never block the respondent workflow.
    }
  }

  async function submit(): Promise<void> {
    if (!token.value) return

    status.value = 'saving'
    error.value = null

    try {
      const response = await apiRequest<SubmitResponse>('/respondent/submit', {
        method: 'POST',
        body: { token: token.value, terminalToken: terminalToken.value ?? undefined },
      })
      await load(token.value)
      status.value = 'submitted'
      return void response
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Soumission impossible.'
      throw caught
    }
  }

  function resolveTerminalToken(): string | null {
    const params = new URLSearchParams(window.location.search)
    return params.get('terminalToken') || window.localStorage.getItem(TERMINAL_TOKEN_STORAGE_KEY)
  }

  return {
    token,
    terminalToken,
    session,
    status,
    error,
    warnings,
    questions,
    isLocked,
    answeredCount,
    progress,
    load,
    save,
    telemetry,
    submit,
  }
})
