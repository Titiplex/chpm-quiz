<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import KpiCard from '@/components/common/KpiCard.vue'
import { formatDate, formatPercent, t } from '@/i18n'
import PageHeader from '@/components/common/PageHeader.vue'
import {
  staticBuildings,
  staticInvitations,
  staticQuestionnaire,
  type StaticDeliveryChannel,
  type StaticInvitationStatus,
} from '@/data/staticPagesDemo'

const router = useRouter()
const copiedLink = ref(false)
const generated = ref(false)

const form = reactive({
  questionnaire: staticQuestionnaire.versionLabel,
  buildingId: staticBuildings[0]?.id ?? '',
  email: 'patient.demo@example.org',
  phone: '+33600000000',
  deliveryMode: 'email_simulation',
})

const patientHref = computed(() => router.resolve({ name: 'static-patient-questionnaire' }).href)
const selectedBuilding = computed(
  () => staticBuildings.find((building) => building.id === form.buildingId) ?? staticBuildings[0],
)
const totals = computed(() => ({
  invitations: staticInvitations.length,
  submitted: staticInvitations.filter((invitation) => invitation.status === 'submitted').length,
  active: staticInvitations.filter((invitation) =>
    ['sent', 'opened', 'in_progress'].includes(invitation.status),
  ).length,
  terminal: staticInvitations.filter((invitation) => invitation.channel === 'terminal')
    .length,
}))
const responseRate = computed(
  () => formatPercent(totals.value.submitted / Math.max(1, totals.value.invitations)),
)

function generateStaticAccess(): void {
  generated.value = true
  copiedLink.value = false
}

async function copyPatientLink(): Promise<void> {
  const absoluteUrl = `${window.location.origin}${window.location.pathname}${patientHref.value}`
  await navigator.clipboard?.writeText(absoluteUrl)
  copiedLink.value = true
}

function channelLabel(channel: StaticDeliveryChannel): string {
  return t(`common.channel.${channel}`)
}

function statusLabel(status: StaticInvitationStatus): string {
  return {
    sent: t('moderation.status.sent'),
    opened: t('moderation.status.opened'),
    in_progress: t('moderation.status.inProgress'),
    submitted: t('moderation.status.submitted'),
  }[status]
}

function statusTone(status: StaticInvitationStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'submitted') return 'success'
  if (status === 'opened' || status === 'in_progress') return 'warning'
  return 'neutral'
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        :title="t('moderation.title')"
        :description="t('staticModerator.description')"
      />

      <div class="row g-4">
        <div class="col-xl-5">
          <form class="demo-card h-100" @submit.prevent="generateStaticAccess">
            <h2 class="h4 fw-bold mb-4">{{ t('staticModerator.prepare') }}</h2>

            <label class="form-label fw-bold" for="static-questionnaire-select">{{ t('staticModerator.publishedQuestionnaire') }}</label>
            <select
              id="static-questionnaire-select"
              v-model="form.questionnaire"
              class="form-select mb-3"
              required
            >
              <option :value="staticQuestionnaire.versionLabel">
                {{ staticQuestionnaire.title }} · {{ staticQuestionnaire.versionLabel }}
              </option>
            </select>

            <label class="form-label fw-bold" for="static-building-select">{{ t('staticModerator.buildingSite') }}</label>
            <select
              id="static-building-select"
              v-model="form.buildingId"
              class="form-select mb-3"
              required
            >
              <option v-for="building in staticBuildings" :key="building.id" :value="building.id">
                {{ building.label }} · {{ building.country }}
              </option>
            </select>

            <label class="form-label fw-bold" for="static-delivery-mode">{{ t('staticModerator.deliveryMode') }}</label>
            <select
              id="static-delivery-mode"
              v-model="form.deliveryMode"
              class="form-select mb-3"
              required
            >
              <option value="email_simulation">{{ t('moderation.delivery.email') }}</option>
              <option value="sms_simulation">{{ t('moderation.delivery.sms') }}</option>
              <option value="terminal_preview">{{ t('moderation.delivery.terminal') }}</option>
            </select>

            <template v-if="form.deliveryMode === 'sms_simulation'">
              <label class="form-label fw-bold" for="static-respondent-phone">{{ t('staticModerator.maskedPhone') }}</label>
              <input
                id="static-respondent-phone"
                v-model="form.phone"
                class="form-control mb-3"
                type="tel"
                required
              />
            </template>
            <template v-else>
              <label class="form-label fw-bold" for="static-respondent-email">{{ t('staticModerator.maskedEmail') }}</label>
              <input
                id="static-respondent-email"
                v-model="form.email"
                class="form-control mb-3"
                type="email"
                required
              />
            </template>
            <button class="btn btn-primary w-100 btn-lg" type="submit">
              {{ t('staticModerator.generateLink') }}
            </button>

            <div v-if="generated" class="alert alert-info rounded-4 mt-3 mb-0">
              <strong>{{ t('staticModerator.patientLink') }}</strong>
              <RouterLink class="d-block text-break" :to="{ name: 'static-patient-questionnaire' }">
                {{ patientHref }}
              </RouterLink>
              <button
                class="btn btn-sm btn-outline-primary mt-2"
                type="button"
                @click="copyPatientLink"
              >
                {{ copiedLink ? t('staticModerator.linkCopied') : t('common.copyLink') }}
              </button>
              <p class="small muted mt-2 mb-0">
                {{ t('moderation.paper.publicCode', { code: staticQuestionnaire.publicCode }) }} · {{ t('common.building') }} :
                {{ selectedBuilding?.label }}
              </p>
            </div>
          </form>
        </div>

        <div class="col-xl-7">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-4">
              <div>
                <p class="section-eyebrow mb-2">{{ t('staticModerator.trackingEyebrow') }}</p>
                <h2 class="h4 fw-bold mb-0">{{ t('staticModerator.invitationsTitle') }}</h2>
              </div>
              <RouterLink
                class="btn btn-outline-primary"
                :to="{ name: 'static-patient-questionnaire' }"
              >
                {{ t('staticModerator.openPatientQuestionnaire') }}
              </RouterLink>
            </div>

            <div class="table-card table-card-scroll table-card-scroll-lg mb-4">
              <table class="table align-middle">
                <thead class="table-light">
                  <tr>
                    <th>{{ t('common.code') }}</th>
                    <th>{{ t('common.channel') }}</th>
                    <th>{{ t('common.destination') }}</th>
                    <th>{{ t('common.questionnaire') }}</th>
                    <th>{{ t('common.building') }}</th>
                    <th>{{ t('common.status') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="invitation in staticInvitations" :key="invitation.publicCode">
                    <td class="fw-semibold">{{ invitation.publicCode }}</td>
                    <td>{{ channelLabel(invitation.channel) }}</td>
                    <td>{{ invitation.destination }}</td>
                    <td>
                      {{ invitation.questionnaireTitle }}<br /><span class="small muted">{{ formatDate(invitation.sentAt, { dateStyle: 'short', timeStyle: 'short' }) }}</span>
                    </td>
                    <td>{{ invitation.buildingLabel }}</td>
                    <td>
                      <span class="badge-soft" :class="statusTone(invitation.status)">{{
                        statusLabel(invitation.status)
                      }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="row g-3">
              <div class="col-md-3">
                <KpiCard :label="t('moderation.kpi.invitations')" :value="String(totals.invitations)" />
              </div>
              <div class="col-md-3">
                <KpiCard :label="t('moderation.kpi.submitted')" :value="String(totals.submitted)" tone="success" />
              </div>
              <div class="col-md-3">
                <KpiCard :label="t('staticModerator.active')" :value="String(totals.active)" tone="warning" />
              </div>
              <div class="col-md-3"><KpiCard :label="t('moderation.kpi.rate')" :value="responseRate" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
