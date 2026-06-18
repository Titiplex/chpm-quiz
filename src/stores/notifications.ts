import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type {
  ApiNotificationSubscription,
  NotificationsResponse,
  UpsertNotificationSubscriptionRequest,
} from '@shared/types/api'

type NotificationStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

export const useNotificationsStore = defineStore('notifications', () => {
  const subscriptions = ref<ApiNotificationSubscription[]>([])
  const status = ref<NotificationStatus>('idle')
  const error = ref<string | null>(null)

  const activeSubmissionSubscriptions = computed(() =>
    subscriptions.value.filter((subscription) => subscription.eventType === 'submission_received' && subscription.isEnabled),
  )

  async function fetchSubscriptions(): Promise<void> {
    status.value = 'loading'
    error.value = null

    try {
      const response = await apiRequest<NotificationsResponse>('/notifications/subscriptions')
      subscriptions.value = response.subscriptions
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Chargement des préférences de notification impossible.'
    }
  }

  async function saveSubscription(payload: UpsertNotificationSubscriptionRequest): Promise<ApiNotificationSubscription> {
    status.value = 'saving'
    error.value = null

    try {
      const response = await apiRequest<{ subscription: ApiNotificationSubscription }>('/notifications/subscriptions', {
        method: 'POST',
        body: payload,
      })
      upsert(response.subscription)
      status.value = 'ready'
      return response.subscription
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Sauvegarde des préférences impossible.'
      throw caught
    }
  }

  function upsert(subscription: ApiNotificationSubscription): void {
    const index = subscriptions.value.findIndex((candidate) => candidate.id === subscription.id)
    if (index >= 0) {
      subscriptions.value.splice(index, 1, subscription)
      return
    }
    subscriptions.value.unshift(subscription)
  }

  return {
    subscriptions,
    activeSubmissionSubscriptions,
    status,
    error,
    fetchSubscriptions,
    saveSubscription,
  }
})
