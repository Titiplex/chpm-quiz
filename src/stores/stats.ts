import { ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type { StatsResponse } from '@shared/types/api'

type StatsStatus = 'idle' | 'loading' | 'ready' | 'error'

export const useStatsStore = defineStore('stats', () => {
  const stats = ref<StatsResponse['stats'] | null>(null)
  const status = ref<StatsStatus>('idle')
  const error = ref<string | null>(null)

  async function fetchForQuestionnaire(questionnaireId: string): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      const response = await apiRequest<StatsResponse>(`/stats/questionnaires/${questionnaireId}`)
      stats.value = response.stats
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Chargement des statistiques impossible.'
    }
  }

  return {
    stats,
    status,
    error,
    fetchForQuestionnaire,
  }
})
