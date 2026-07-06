import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useStatsStore } from '@/stores/stats'
import { statsFixture, submissionFixture } from './fixtures/api'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

describe('useStatsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads questionnaire-level statistics and clears the selected submission', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      expect(String(url)).toBe('http://localhost:3000/api/stats/questionnaires/questionnaire-1')
      return jsonResponse({ stats: statsFixture })
    }))

    const store = useStatsStore()
    store.selectedSubmission = submissionFixture
    await store.fetchForQuestionnaire('questionnaire-1')

    expect(store.status).toBe('ready')
    expect(store.stats).toEqual(statsFixture)
    expect(store.selectedSubmission).toBeNull()
  })

  it('loads and clears one pseudonymized submission detail record', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      expect(String(url)).toBe('http://localhost:3000/api/stats/submissions/ITQ-0001%2F2026')
      return jsonResponse({ submission: submissionFixture })
    }))

    const store = useStatsStore()
    await store.fetchSubmission('ITQ-0001/2026')

    expect(store.submissionStatus).toBe('ready')
    expect(store.selectedSubmission).toEqual(submissionFixture)

    store.clearSubmission()

    expect(store.selectedSubmission).toBeNull()
    expect(store.submissionStatus).toBe('idle')
    expect(store.submissionError).toBeNull()
  })

  it('keeps independent error channels for aggregate stats and submission details', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Statistiques indisponibles' }, 500)))

    const store = useStatsStore()
    await store.fetchForQuestionnaire('questionnaire-1')
    await store.fetchSubmission('ITQ-0001')

    expect(store.status).toBe('error')
    expect(store.error).toBe('Statistiques indisponibles')
    expect(store.submissionStatus).toBe('error')
    expect(store.submissionError).toBe('Statistiques indisponibles')
  })
})
