import { ref } from 'vue'
import { defineStore } from 'pinia'

import { t } from '@/i18n'

import { apiRequest } from '@/services/api'
import type { StatsResponse, SubmissionDetailsResponse } from '@shared/types/api'

type StatsStatus = 'idle' | 'loading' | 'ready' | 'error'
type SubmissionStatus = 'idle' | 'loading' | 'ready' | 'error'

export const useStatsStore = defineStore('stats', () => {
  const stats = ref<StatsResponse['stats'] | null>(null)
  const selectedSubmission = ref<SubmissionDetailsResponse['submission'] | null>(null)
  const status = ref<StatsStatus>('idle')
  const submissionStatus = ref<SubmissionStatus>('idle')
  const error = ref<string | null>(null)
  const submissionError = ref<string | null>(null)

  async function fetchForQuestionnaire(questionnaireId: string): Promise<void> {
    status.value = 'loading'
    error.value = null
    selectedSubmission.value = null

    try {
      const response = await apiRequest<StatsResponse>(`/stats/questionnaires/${questionnaireId}`)
      stats.value = response.stats
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : t('store.stats.loadError')
    }
  }

  async function fetchSubmission(publicCode: string): Promise<void> {
    submissionStatus.value = 'loading'
    submissionError.value = null

    try {
      const response = await apiRequest<SubmissionDetailsResponse>(`/stats/submissions/${encodeURIComponent(publicCode)}`)
      selectedSubmission.value = response.submission
      submissionStatus.value = 'ready'
    } catch (caught) {
      submissionStatus.value = 'error'
      submissionError.value = caught instanceof Error ? caught.message : t('store.stats.submissionError')
    }
  }

  function clearSubmission(): void {
    selectedSubmission.value = null
    submissionStatus.value = 'idle'
    submissionError.value = null
  }

  return {
    stats,
    selectedSubmission,
    status,
    submissionStatus,
    error,
    submissionError,
    fetchForQuestionnaire,
    fetchSubmission,
    clearSubmission,
  }
})
