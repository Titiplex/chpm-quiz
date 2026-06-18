<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'

import { useCatalogStore } from '@/stores/catalog'
import { useNotificationsStore } from '@/stores/notifications'
import type { NotificationChannel, NotificationFrequency } from '@shared/types/api'

const catalog = useCatalogStore()
const notifications = useNotificationsStore()

const form = reactive({
  questionnaireVersionId: '',
  channel: 'email' as NotificationChannel,
  frequency: 'immediate' as NotificationFrequency,
  digestHour: 8,
  isEnabled: true,
})

const publishedQuestionnaires = computed(() => catalog.publishedQuestionnaires)

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
  return value === 'daily' ? 'quotidienne' : 'à chaque soumission'
}
</script>

<template>
  <div class="demo-card h-100">
    <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
      <div>
        <p class="section-eyebrow mb-2">Notifications</p>
        <h2 class="h4 fw-bold mb-0">Préférences par utilisateur et questionnaire</h2>
      </div>
      <span class="badge-soft" :class="form.isEnabled ? 'success' : 'danger'">
        {{ form.isEnabled ? 'active' : 'aucune notification' }}
      </span>
    </div>

    <div v-if="notifications.error" class="alert alert-danger rounded-4" role="alert">
      {{ notifications.error }}
    </div>

    <form class="row g-3" @submit.prevent="savePreferences">
      <div class="col-12">
        <label class="form-label fw-semibold" for="notification-questionnaire">Questionnaire</label>
        <select id="notification-questionnaire" v-model="form.questionnaireVersionId" class="form-select" required>
          <option value="" disabled>Choisir une version publiée</option>
          <option v-for="questionnaire in publishedQuestionnaires" :key="questionnaire.versionId" :value="questionnaire.versionId">
            {{ questionnaire.title }} · version {{ questionnaire.versionLabel }}
          </option>
        </select>
      </div>

      <div class="col-md-4">
        <label class="form-label fw-semibold" for="notification-frequency">Rythme</label>
        <select id="notification-frequency" v-model="form.frequency" class="form-select">
          <option value="immediate">À chaque soumission</option>
          <option value="daily">Quotidienne</option>
        </select>
      </div>

      <div class="col-md-4">
        <label class="form-label fw-semibold" for="notification-channel">Canal</label>
        <select id="notification-channel" v-model="form.channel" class="form-select">
          <option value="email">Email simulé</option>
          <option value="internal">Notification interne</option>
        </select>
      </div>

      <div class="col-md-4">
        <label class="form-label fw-semibold" for="notification-hour">Heure digest</label>
        <input id="notification-hour" v-model.number="form.digestHour" class="form-control" type="number" min="0" max="23" :disabled="form.frequency !== 'daily'" />
      </div>

      <div class="col-12">
        <div class="form-check form-switch">
          <input id="notification-enabled" v-model="form.isEnabled" class="form-check-input" type="checkbox" />
          <label class="form-check-label fw-semibold" for="notification-enabled">
            Recevoir les notifications de soumission
          </label>
        </div>
      </div>

      <div class="col-12">
        <button class="btn btn-primary rounded-pill" type="submit" :disabled="notifications.status === 'saving' || !form.questionnaireVersionId">
          {{ notifications.status === 'saving' ? 'Sauvegarde…' : 'Enregistrer les préférences' }}
        </button>
      </div>
    </form>

    <hr class="my-4" />

    <div v-if="!notifications.subscriptions.length" class="empty-state compact">
      <strong>Aucune préférence enregistrée.</strong>
      <p class="muted mb-0">Le choix “aucune notification” est obtenu en désactivant la préférence.</p>
    </div>
    <div v-else class="d-grid gap-2">
      <div v-for="subscription in notifications.subscriptions" :key="subscription.id" class="p-3 rounded-4 border bg-white">
        <div class="d-flex flex-wrap justify-content-between gap-2">
          <strong>{{ subscription.questionnaireVersion?.questionnaire.title ?? 'Tous questionnaires' }}</strong>
          <span class="badge-soft" :class="subscription.isEnabled ? 'success' : 'danger'">
            {{ subscription.isEnabled ? frequencyLabel(subscription.frequency) : 'désactivée' }}
          </span>
        </div>
        <p class="small muted mb-0 mt-1">
          Canal {{ subscription.channel === 'email' ? 'email simulé' : 'interne' }} · digest {{ subscription.digestHour }}h · dernière livraison {{ subscription.lastDeliveredAt ? new Date(subscription.lastDeliveredAt).toLocaleString() : 'jamais' }}.
        </p>
      </div>
    </div>
  </div>
</template>
