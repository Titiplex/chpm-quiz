import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type {
  ApiBuilding,
  ApiQuestionnaire,
  BuildingsResponse,
  CreateQuestionGroupRequest,
  CreateQuestionnaireRequest,
  CreateQuestionRequest,
  PublicationCheckResponse,
  QuestionnaireResponse,
  QuestionnairesResponse,
  VersionResponse,
  UpdateQuestionGroupRequest,
  UpdateQuestionnaireRequest,
  UpdateQuestionRequest,
} from '@shared/types/api'

type CatalogStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

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

  async function createQuestionnaire(payload: CreateQuestionnaireRequest): Promise<ApiQuestionnaire> {
    return saveMutation(() =>
      apiRequest<QuestionnaireResponse>('/questionnaires', {
        method: 'POST',
        body: payload,
      }),
    )
  }

  async function updateQuestionnaire(
    questionnaireId: string,
    payload: UpdateQuestionnaireRequest,
  ): Promise<ApiQuestionnaire> {
    return saveMutation(() =>
      apiRequest<QuestionnaireResponse>(`/questionnaires/${questionnaireId}`, {
        method: 'PATCH',
        body: payload,
      }),
    )
  }

  async function createGroup(
    questionnaireId: string,
    payload: CreateQuestionGroupRequest,
  ): Promise<ApiQuestionnaire> {
    return saveMutation(() =>
      apiRequest<QuestionnaireResponse>(`/questionnaires/${questionnaireId}/groups`, {
        method: 'POST',
        body: payload,
      }),
    )
  }

  async function updateGroup(
    questionnaireId: string,
    groupId: string,
    payload: UpdateQuestionGroupRequest,
  ): Promise<ApiQuestionnaire> {
    return saveMutation(() =>
      apiRequest<QuestionnaireResponse>(`/questionnaires/${questionnaireId}/groups/${groupId}`, {
        method: 'PATCH',
        body: payload,
      }),
    )
  }

  async function archiveGroup(questionnaireId: string, groupId: string): Promise<ApiQuestionnaire> {
    return saveMutation(() =>
      apiRequest<QuestionnaireResponse>(`/questionnaires/${questionnaireId}/groups/${groupId}`, {
        method: 'DELETE',
      }),
    )
  }

  async function createQuestion(
    questionnaireId: string,
    groupId: string,
    payload: CreateQuestionRequest,
  ): Promise<ApiQuestionnaire> {
    return saveMutation(() =>
      apiRequest<QuestionnaireResponse>(`/questionnaires/${questionnaireId}/groups/${groupId}/questions`, {
        method: 'POST',
        body: payload,
      }),
    )
  }

  async function updateQuestion(
    questionnaireId: string,
    questionId: string,
    payload: UpdateQuestionRequest,
  ): Promise<ApiQuestionnaire> {
    return saveMutation(() =>
      apiRequest<QuestionnaireResponse>(`/questionnaires/${questionnaireId}/questions/${questionId}`, {
        method: 'PATCH',
        body: payload,
      }),
    )
  }

  async function validatePublication(versionId: string): Promise<PublicationCheckResponse['report']> {
    const response = await apiRequest<PublicationCheckResponse>(`/versions/${versionId}/publication-check`)
    return response.report
  }

  async function publishVersion(versionId: string): Promise<void> {
    await apiRequest<VersionResponse>(`/versions/${versionId}/publish`, { method: 'POST' })
    await fetchCatalog()
  }

  async function archiveQuestion(questionnaireId: string, questionId: string): Promise<ApiQuestionnaire> {
    return saveMutation(() =>
      apiRequest<QuestionnaireResponse>(`/questionnaires/${questionnaireId}/questions/${questionId}`, {
        method: 'DELETE',
      }),
    )
  }

  async function saveMutation(
    request: () => Promise<QuestionnaireResponse>,
  ): Promise<ApiQuestionnaire> {
    status.value = 'saving'
    error.value = null

    try {
      const response = await request()
      upsertQuestionnaire(response.questionnaire)
      status.value = 'ready'
      return response.questionnaire
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Sauvegarde impossible.'
      throw caught
    }
  }

  function upsertQuestionnaire(questionnaire: ApiQuestionnaire): void {
    const index = questionnaires.value.findIndex((candidate) => candidate.id === questionnaire.id)

    if (index >= 0) {
      questionnaires.value.splice(index, 1, questionnaire)
      return
    }

    questionnaires.value.unshift(questionnaire)
  }

  return {
    buildings,
    questionnaires,
    publishedQuestionnaires,
    status,
    error,
    fetchCatalog,
    createQuestionnaire,
    updateQuestionnaire,
    createGroup,
    updateGroup,
    archiveGroup,
    createQuestion,
    updateQuestion,
    archiveQuestion,
    validatePublication,
    publishVersion,
  }
})
