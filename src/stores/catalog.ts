import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type {
  ApiBuilding,
  ApiQuestionnaire,
  BuildingsResponse,
  QuestionnairesResponse,
} from '@shared/types/api'

type CatalogStatus = 'idle' | 'loading' | 'ready' | 'error'

export const useCatalogStore = defineStore('catalog', () => {
  const buildings = ref<ApiBuilding[]>([])
  const questionnaires = ref<ApiQuestionnaire[]>([])
  const status = ref<CatalogStatus>('idle')
  const error = ref<string | null>(null)

  const publishedQuestionnaires = computed(() =>
    questionnaires.value.filter((questionnaire) => questionnaire.isPublished),
  )

  async function fetchCatalog(): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      const [buildingResponse, questionnaireResponse] = await Promise.all([
        apiRequest<BuildingsResponse>('/buildings'),
        apiRequest<QuestionnairesResponse>('/questionnaires'),
      ])

      buildings.value = buildingResponse.buildings
      questionnaires.value = questionnaireResponse.questionnaires
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Chargement des données impossible.'
    }
  }

  return {
    buildings,
    questionnaires,
    publishedQuestionnaires,
    status,
    error,
    fetchCatalog,
  }
})
