import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import NotificationPreferencesCard from '@/components/notifications/NotificationPreferencesCard.vue'
import { useSessionStore } from '@/stores/session'
import { adminUserFixture, buildingFixture, notificationSubscriptionFixture, questionnaireFixture } from './fixtures/api'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

describe('NotificationPreferencesCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads editable notification preferences and saves the selected policy', async () => {
    const calls: Array<{ url: string; method?: string; body: unknown }> = []
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : null
      calls.push({ url: String(url), method: init?.method, body })

      if (String(url).endsWith('/buildings')) {
        return jsonResponse({ buildings: [buildingFixture] })
      }
      if (String(url).endsWith('/questionnaires')) {
        return jsonResponse({ questionnaires: [questionnaireFixture] })
      }
      if (String(url).endsWith('/notifications/subscriptions') && init?.method === 'POST') {
        return jsonResponse({ subscription: { ...notificationSubscriptionFixture, frequency: 'immediate' } })
      }
      if (String(url).endsWith('/notifications/subscriptions')) {
        return jsonResponse({ subscriptions: [notificationSubscriptionFixture] })
      }

      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const pinia = createPinia()
    const session = useSessionStore(pinia)
    session.user = adminUserFixture

    const wrapper = mount(NotificationPreferencesCard, {
      global: { plugins: [pinia] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Préférences par utilisateur et questionnaire')
    expect(wrapper.text()).toContain('International Trauma Questionnaire · version 1.0')
    expect(wrapper.text()).toContain('quotidienne')
    expect(wrapper.text()).toContain('Exécuter le digest quotidien simulé')

    await wrapper.get<HTMLSelectElement>('#notification-frequency').setValue('immediate')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const saveCall = calls.find((call) => call.method === 'POST' && call.url.endsWith('/notifications/subscriptions'))
    expect(saveCall?.body).toEqual({
      eventType: 'submission_received',
      questionnaireVersionId: 'version-1',
      channel: 'email',
      frequency: 'immediate',
      digestHour: 8,
      isEnabled: true,
    })
  })

  it('shows the empty state and hides digest execution for a moderator', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).endsWith('/buildings')) {
        return jsonResponse({ buildings: [buildingFixture] })
      }
      if (String(url).endsWith('/questionnaires')) {
        return jsonResponse({ questionnaires: [] })
      }
      if (String(url).endsWith('/notifications/subscriptions')) {
        return jsonResponse({ subscriptions: [] })
      }
      return jsonResponse({ message: 'unexpected route' }, 500)
    }))

    const wrapper = mount(NotificationPreferencesCard, {
      global: { plugins: [createPinia()] },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Aucune préférence enregistrée.')
    expect(wrapper.text()).not.toContain('Exécuter le digest quotidien simulé')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('runs daily digests and displays the returned delivery count', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/buildings')) {
        return jsonResponse({ buildings: [buildingFixture] })
      }
      if (String(url).endsWith('/questionnaires')) {
        return jsonResponse({ questionnaires: [questionnaireFixture] })
      }
      if (String(url).endsWith('/notifications/daily-digests/run') && init?.method === 'POST') {
        return jsonResponse({
          result: {
            processedAt: '2026-01-01T08:00:00.000Z',
            dueSubscriptionCount: 1,
            deliveredDigestCount: 2,
            dryRun: true,
            delivered: [],
          },
        })
      }
      if (String(url).endsWith('/notifications/subscriptions')) {
        return jsonResponse({ subscriptions: [notificationSubscriptionFixture] })
      }
      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const pinia = createPinia()
    const session = useSessionStore(pinia)
    session.user = adminUserFixture
    const wrapper = mount(NotificationPreferencesCard, { global: { plugins: [pinia] } })

    await flushPromises()
    await wrapper.findAll('button').find((button) => button.text().includes('digest quotidien'))?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('2 digest(s) livré(s)')
  })
})
