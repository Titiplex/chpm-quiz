import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

import RespondentView from '@/views/RespondentView.vue'
import { makeRespondentSession } from './fixtures/respondent'

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/r/:token', component: RespondentView }],
  })
}

describe('RespondentView functional flow', () => {
  it('loads a signed respondent link, records page telemetry and saves a Likert answer', async () => {
    const calls: Array<{ url: string; body: unknown; method?: string }> = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null
      calls.push({ url: String(url), method: init?.method, body })

      if (String(url).includes('/respondent/session')) {
        return new Response(JSON.stringify(makeRespondentSession()), { status: 200 })
      }

      if (String(url).endsWith('/respondent/telemetry')) {
        return new Response(JSON.stringify({ event: { id: 'event-1' } }), { status: 201 })
      }

      if (String(url).endsWith('/respondent/answers')) {
        expect(body).toEqual({
          token: 'token-demo',
          answers: [{ questionId: 'question-p1', value: 0 }],
        })
        return new Response(
          JSON.stringify({
            savedAnswers: [{ id: 'answer-1', questionId: 'question-p1', value: 0 }],
            warnings: [],
          }),
          { status: 200 },
        )
      }

      return new Response(JSON.stringify({ message: 'unexpected route' }), { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const router = makeRouter()
    router.push('/r/token-demo')
    await router.isReady()

    const wrapper = mount(RespondentView, {
      global: {
        plugins: [createPinia(), router],
        stubs: {
          RouterLink: true,
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('International Trauma Questionnaire')
    expect(wrapper.text()).toContain('Avoir des rêves perturbants ?')
    expect(wrapper.text()).toContain('Page 1 / 2')
    expect(wrapper.findAll('.likert-choice-label').map((label) => label.text())).toEqual([
      'Pas du tout',
      'Vers « Pas du tout »',
      'Modérément',
      'Vers « Extrêmement »',
      'Extrêmement',
    ])

    const pageViewCall = calls.find((call) => call.url.endsWith('/respondent/telemetry') && (call.body as any)?.eventType === 'page_view')
    expect(pageViewCall?.body).toMatchObject({ token: 'token-demo', eventType: 'page_view', currentPage: 1 })
    expect(calls.some((call) => call.url.endsWith('/respondent/telemetry') && (call.body as any)?.eventType === 'questionnaire_start')).toBe(true)

    const infoButton = wrapper.findAll('button').find((button) => button.text().includes('Rêves perturbants'))
    expect(infoButton).toBeTruthy()
    await infoButton?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Rêves en lien clair avec l’expérience.')
    expect(calls.some((call) => call.url.endsWith('/respondent/telemetry') && (call.body as any)?.eventType === 'popup_open')).toBe(true)

    const zeroButton = wrapper.findAll('button').find((button) => button.text().trim() === '0')
    expect(zeroButton).toBeTruthy()
    await zeroButton?.trigger('click')
    await flushPromises()

    expect(calls.some((call) => call.url.endsWith('/respondent/telemetry') && (call.body as any)?.eventType === 'answer_change')).toBe(true)
    expect(calls.some((call) => call.url.endsWith('/respondent/answers') && call.method === 'PUT')).toBe(true)
  })
})
