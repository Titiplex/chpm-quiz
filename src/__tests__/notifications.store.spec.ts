import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useNotificationsStore } from '@/stores/notifications'
import { notificationSubscriptionFixture } from './fixtures/api'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

describe('useNotificationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads subscriptions and computes enabled submission subscriptions', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({
      subscriptions: [
        notificationSubscriptionFixture,
        { ...notificationSubscriptionFixture, id: 'disabled', isEnabled: false },
        { ...notificationSubscriptionFixture, id: 'expired', eventType: 'invitation_expired' },
      ],
    })))

    const store = useNotificationsStore()
    await store.fetchSubscriptions()

    expect(store.status).toBe('ready')
    expect(store.subscriptions).toHaveLength(3)
    expect(store.activeSubmissionSubscriptions).toEqual([notificationSubscriptionFixture])
  })

  it('creates and updates subscriptions through the same upsert path', async () => {
    const updatedSubscription = { ...notificationSubscriptionFixture, frequency: 'immediate' as const, digestHour: 9 }
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toBe('http://localhost:3000/api/notifications/subscriptions')
      expect(init?.method).toBe('POST')
      return jsonResponse({ subscription: updatedSubscription })
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useNotificationsStore()
    store.subscriptions = [notificationSubscriptionFixture]

    const saved = await store.saveSubscription({ eventType: 'submission_received', frequency: 'immediate', digestHour: 9 })

    expect(saved).toEqual(updatedSubscription)
    expect(store.status).toBe('ready')
    expect(store.subscriptions).toEqual([updatedSubscription])
  })

  it('runs daily digest simulation and reloads preferences', async () => {
    const result = {
      processedAt: '2026-01-01T09:00:00.000Z',
      dueSubscriptionCount: 1,
      deliveredDigestCount: 1,
      dryRun: true,
      delivered: [{ subscriptionId: 'subscription-1', recipientUserId: 'user-admin', queuedEventCount: 2, publicCodes: ['ITQ-0001'] }],
    }
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/notifications/daily-digests/run')) {
        expect(init?.method).toBe('POST')
        return jsonResponse({ result })
      }

      if (String(url).endsWith('/notifications/subscriptions')) {
        return jsonResponse({ subscriptions: [notificationSubscriptionFixture] })
      }

      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useNotificationsStore()
    await expect(store.runDailyDigests()).resolves.toEqual(result)

    expect(store.lastDigestRun).toEqual(result)
    expect(store.status).toBe('ready')
    expect(store.subscriptions).toEqual([notificationSubscriptionFixture])
  })

  it('records errors for failed fetches and saves', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'Notifications indisponibles' }, 500)))

    const store = useNotificationsStore()
    await store.fetchSubscriptions()

    expect(store.status).toBe('error')
    expect(store.error).toBe('Notifications indisponibles')

    await expect(store.saveSubscription({ eventType: 'submission_received' })).rejects.toMatchObject({
      message: 'Notifications indisponibles',
    })
    expect(store.error).toBe('Notifications indisponibles')
  })
})
