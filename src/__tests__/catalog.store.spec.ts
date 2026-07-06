import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useCatalogStore } from '@/stores/catalog'
import { buildingFixture, draftQuestionnaireFixture, questionnaireFixture } from './fixtures/api'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

describe('useCatalogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads buildings and questionnaires and filters published questionnaires', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/buildings')) {
        return jsonResponse({ buildings: [buildingFixture] })
      }
      if (String(url).endsWith('/questionnaires')) {
        return jsonResponse({ questionnaires: [questionnaireFixture, draftQuestionnaireFixture] })
      }
      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useCatalogStore()
    await store.fetchCatalog()

    expect(store.status).toBe('ready')
    expect(store.buildings).toEqual([buildingFixture])
    expect(store.questionnaires).toHaveLength(2)
    expect(store.publishedQuestionnaires).toEqual([questionnaireFixture])
  })

  it('upserts questionnaire mutations and preserves a ready status', async () => {
    const created = { ...draftQuestionnaireFixture, id: 'questionnaire-created', title: 'Nouveau questionnaire' }
    const updated = { ...created, title: 'Questionnaire renommé' }
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/questionnaires') && init?.method === 'POST') {
        expect(JSON.parse(String(init.body))).toEqual({ code: 'NEW', title: 'Nouveau questionnaire' })
        return jsonResponse({ questionnaire: created })
      }

      if (String(url).endsWith('/questionnaires/questionnaire-created') && init?.method === 'PATCH') {
        return jsonResponse({ questionnaire: updated })
      }

      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useCatalogStore()
    const first = await store.createQuestionnaire({ code: 'NEW', title: 'Nouveau questionnaire' })
    const second = await store.updateQuestionnaire('questionnaire-created', { title: 'Questionnaire renommé' })

    expect(first.id).toBe('questionnaire-created')
    expect(second.title).toBe('Questionnaire renommé')
    expect(store.status).toBe('ready')
    expect(store.questionnaires).toHaveLength(1)
    expect(store.questionnaires[0]?.title).toBe('Questionnaire renommé')
  })

  it('calls builder endpoints for groups, questions and publication checks', async () => {
    const calls: Array<{ url: string; method?: string }> = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), method: init?.method })

      if (String(url).endsWith('/versions/version-1/publication-check')) {
        return jsonResponse({ report: { canPublish: true, errors: [] } })
      }

      if (String(url).endsWith('/versions/version-1/publish')) {
        return jsonResponse({ version: { id: 'version-1', versionLabel: '1.0', status: 'published' } })
      }

      if (String(url).endsWith('/buildings')) {
        return jsonResponse({ buildings: [buildingFixture] })
      }

      if (String(url).endsWith('/questionnaires') && !init?.method) {
        return jsonResponse({ questionnaires: [questionnaireFixture] })
      }

      return jsonResponse({ questionnaire: questionnaireFixture })
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useCatalogStore()

    await store.createGroup('questionnaire-1', { title: 'Groupe' })
    await store.updateGroup('questionnaire-1', 'group-1', { title: 'Groupe modifié' })
    await store.archiveGroup('questionnaire-1', 'group-1')
    await store.createQuestion('questionnaire-1', 'group-1', { code: 'Q1', label: 'Question', responseType: 'free_text' })
    await store.updateQuestion('questionnaire-1', 'question-1', { label: 'Question modifiée' })
    await store.archiveQuestion('questionnaire-1', 'question-1')
    await expect(store.validatePublication('version-1')).resolves.toEqual({ canPublish: true, errors: [] })
    await store.publishVersion('version-1')

    expect(calls.map((call) => `${call.method ?? 'GET'} ${call.url.replace('http://localhost:3000/api', '')}`)).toEqual([
      'POST /questionnaires/questionnaire-1/groups',
      'PATCH /questionnaires/questionnaire-1/groups/group-1',
      'DELETE /questionnaires/questionnaire-1/groups/group-1',
      'POST /questionnaires/questionnaire-1/groups/group-1/questions',
      'PATCH /questionnaires/questionnaire-1/questions/question-1',
      'DELETE /questionnaires/questionnaire-1/questions/question-1',
      'GET /versions/version-1/publication-check',
      'POST /versions/version-1/publish',
      'GET /buildings',
      'GET /questionnaires',
    ])
  })

  it('records loading and saving errors without losing the API message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Erreur API' }, 500)))

    const store = useCatalogStore()

    await store.fetchCatalog()
    expect(store.status).toBe('error')
    expect(store.error).toBe('Erreur API')

    await expect(store.createQuestionnaire({ code: 'FAIL', title: 'Erreur' })).rejects.toMatchObject({
      message: 'Erreur API',
    })
    expect(store.status).toBe('error')
    expect(store.error).toBe('Erreur API')
  })
})
