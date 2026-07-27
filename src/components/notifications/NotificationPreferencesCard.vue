<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'

import { useCatalogStore } from '@/stores/catalog'
import { formatDate, t, tp } from '@/i18n'
import { useNotificationsStore } from '@/stores/notifications'
import { useSessionStore } from '@/stores/session'
import type { NotificationChannel, NotificationFrequency } from '@shared/types/api'

const catalog = useCatalogStore()
const notifications = useNotificationsStore()
const session = useSessionStore()

const form = reactive({
  questionnaireVersionId: '',
  channel: 'email' as NotificationChannel,
  frequency: 'immediate' as NotificationFrequency,
  digestHour: 8,
  isEnabled: true,
})

const publishedQuestionnaires = computed(() => catalog.publishedQuestionnaires)
const canRunDigest = computed(() => ['admin', 'technical_admin'].includes(session.user?.role ?? ''))

onMounted(async () => {
  if (catalog.status === 'idle') {
    await catalog.fetchCatalog()
  }
  await notifications.fetchSubscriptions()
  form.questionnaireVersionId = publishedQuestionnaires.value[0]?.versionId ?? ''
})

async function savePreferences(): Promise<void> {
  await notifications.saveSubscription({
    eventType: 'submission_received',
    questionnaireVersionId: form.questionnaireVersionId || undefined,
    channel: form.channel,
    frequency: form.frequency,
    digestHour: Number(form.digestHour),
    isEnabled: form.isEnabled,
  })
}

function frequencyLabel(value: NotificationFrequency): string {
  return value === 'daily'
    ? t('notifications.frequency.daily')
    : t('notifications.frequency.immediate')
}
</script>

<template>
  <div class="demo-card h-100">
    <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
      <div>
        <p class="section-eyebrow mb-2">{{ t('notifications.title') }}</p>
        <h2 class="h4 fw-bold mb-0">{{ t('notifications.preferences.title') }}</h2>
      </div>
      <span class="badge-soft" :class="form.isEnabled ? 'success' : 'danger'">
        {{ form.isEnabled ? t('notifications.state.active') : t('notifications.state.none') }}
      </span>
    </div>

    <div v-if="notifications.error" class="alert alert-danger rounded-4" role="alert">
      {{ notifications.error }}
    </div>

    <form class="row g-3" @submit.prevent="savePreferences">
      <div class="col-12">
        <label class="form-label fw-semibold" for="notification-questionnaire">{{ t('notifications.questionnaire') }}</label>
        <select
          id="notification-questionnaire"
          v-model="form.questionnaireVersionId"
          class="form-select"
          required
        >
          <option value="" disabled>{{ t('notifications.questionnaire.choosePublished') }}</option>
          <option
            v-for="questionnaire in publishedQuestionnaires"
            :key="questionnaire.versionId"
            :value="questionnaire.versionId"
          >
            {{ questionnaire.title }} · {{ t('notifications.questionnaire.version', { version: questionnaire.versionLabel }) }}
          </option>
        </select>
      </div>

      <div class="col-md-4">
        <label class="form-label fw-semibold" for="notification-frequency">{{ t('notifications.frequency.label') }}</label>
        <select id="notification-frequency" v-model="form.frequency" class="form-select">
          <option value="immediate">{{ t('notifications.frequency.immediate') }}</option>
          <option value="daily">{{ t('notifications.frequency.daily') }}</option>
        </select>
      </div>

      <div class="col-md-4">
        <label class="form-label fw-semibold" for="notification-channel">{{ t('notifications.channel.label') }}</label>
        <select id="notification-channel" v-model="form.channel" class="form-select">
          <option value="email">{{ t('notifications.channel.email') }}</option>
          <option value="internal">{{ t('notifications.channel.internal') }}</option>
        </select>
      </div>

      <div class="col-md-4">
        <label class="form-label fw-semibold" for="notification-hour">{{ t('notifications.digestHour') }}</label>
        <input
          id="notification-hour"
          v-model.number="form.digestHour"
          class="form-control"
          type="number"
          min="0"
          max="23"
          :disabled="form.frequency !== 'daily'"
        />
      </div>

      <div class="col-12">
        <div class="form-check form-switch">
          <input
            id="notification-enabled"
            v-model="form.isEnabled"
            class="form-check-input"
            type="checkbox"
          />
          <label class="form-check-label fw-semibold" for="notification-enabled">
            {{ t('notifications.enabled') }}
          </label>
        </div>
      </div>

      <div class="col-12">
        <button
          class="btn btn-primary rounded-pill"
          type="submit"
          :disabled="notifications.status === 'saving' || !form.questionnaireVersionId"
        >
          {{ notifications.status === 'saving' ? t('notifications.saving') : t('notifications.save') }}
        </button>
      </div>
    </form>

    <hr class="my-4" />

    <div v-if="!notifications.subscriptions.length" class="empty-state compact">
      <strong>{{ t('notifications.empty.title') }}</strong>
      <p class="muted mb-0">
        {{ t('notifications.empty.description') }}
      </p>
    </div>
    <div v-else class="d-grid gap-2">
      <div
        v-for="subscription in notifications.subscriptions"
        :key="subscription.id"
        class="p-3 rounded-4 border bg-white"
      >
        <div class="d-flex flex-wrap justify-content-between gap-2">
          <strong>{{
            subscription.questionnaireVersion?.questionnaire.title ?? t('notifications.allQuestionnaires')
          }}</strong>
          <span class="badge-soft" :class="subscription.isEnabled ? 'success' : 'danger'">
            {{ subscription.isEnabled ? frequencyLabel(subscription.frequency) : t('notifications.disabled') }}
          </span>
        </div>
        <p class="small muted mb-0 mt-1">
          {{
            t('notifications.subscription.summary', {
              channel:
                subscription.channel === 'email'
                  ? t('notifications.channel.email')
                  : t('notifications.channel.internal'),
              hour: subscription.digestHour,
              deliveredAt: subscription.lastDeliveredAt
                ? formatDate(subscription.lastDeliveredAt, { dateStyle: 'short', timeStyle: 'short' })
                : t('notifications.never'),
            })
          }}
        </p>
      </div>
    </div>

    <div v-if="canRunDigest" class="d-flex flex-wrap gap-2 align-items-center mt-4">
      <button
        class="btn btn-outline-primary rounded-pill"
        type="button"
        :disabled="notifications.status === 'saving'"
        @click="notifications.runDailyDigests()"
      >
        {{ t('notifications.actions.runDailyDigest') }}
      </button>
      <span v-if="notifications.lastDigestRun" class="badge-soft success">
        {{ tp('notifications.digestDelivered', notifications.lastDigestRun.deliveredDigestCount) }}
      </span>
    </div>
  </div>
</template>
