<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import {
  staticBuildings,
  staticInvitations,
  staticQuestionnaire,
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
  terminal: staticInvitations.filter((invitation) => invitation.channel === 'Terminal hospitalier')
    .length,
}))
const responseRate = computed(
  () => `${Math.round((totals.value.submitted / Math.max(1, totals.value.invitations)) * 100)} %`,
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

function statusLabel(status: StaticInvitationStatus): string {
  return {
    sent: 'Envoyée',
    opened: 'Ouverte',
    in_progress: 'En cours',
    submitted: 'Soumise',
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
        title="Modération"
        description="Préparez les accès patient et suivez les questionnaires de votre périmètre."
      />

      <div class="row g-4">
        <div class="col-xl-5">
          <form class="demo-card h-100" @submit.prevent="generateStaticAccess">
            <h2 class="h4 fw-bold mb-4">Préparer un accès patient</h2>

            <label class="form-label fw-bold" for="static-questionnaire-select"
              >Questionnaire publié</label
            >
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

            <label class="form-label fw-bold" for="static-building-select">Bâtiment / site</label>
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

            <label class="form-label fw-bold" for="static-delivery-mode">Canal de passation</label>
            <select
              id="static-delivery-mode"
              v-model="form.deliveryMode"
              class="form-select mb-3"
              required
            >
              <option value="email_simulation">Email</option>
              <option value="sms_simulation">SMS</option>
              <option value="terminal_preview">Terminal hospitalier</option>
            </select>

            <template v-if="form.deliveryMode === 'sms_simulation'">
              <label class="form-label fw-bold" for="static-respondent-phone"
                >Téléphone masqué dans le suivi</label
              >
              <input
                id="static-respondent-phone"
                v-model="form.phone"
                class="form-control mb-3"
                type="tel"
                required
              />
            </template>
            <template v-else>
              <label class="form-label fw-bold" for="static-respondent-email"
                >Adresse email masquée dans le suivi</label
              >
              <input
                id="static-respondent-email"
                v-model="form.email"
                class="form-control mb-3"
                type="email"
                required
              />
            </template>
            <button class="btn btn-primary w-100 btn-lg" type="submit">
              Générer le lien patient
            </button>

            <div v-if="generated" class="alert alert-info rounded-4 mt-3 mb-0">
              <strong>Lien patient :</strong>
              <RouterLink class="d-block text-break" :to="{ name: 'static-patient-questionnaire' }">
                {{ patientHref }}
              </RouterLink>
              <button
                class="btn btn-sm btn-outline-primary mt-2"
                type="button"
                @click="copyPatientLink"
              >
                {{ copiedLink ? 'Lien copié' : 'Copier le lien' }}
              </button>
              <p class="small muted mt-2 mb-0">
                Code public : {{ staticQuestionnaire.publicCode }} · Bâtiment :
                {{ selectedBuilding?.label }}
              </p>
            </div>
          </form>
        </div>

        <div class="col-xl-7">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-2 mb-4">
              <div>
                <p class="section-eyebrow mb-2">Suivi opérationnel</p>
                <h2 class="h4 fw-bold mb-0">Invitations du périmètre</h2>
              </div>
              <RouterLink
                class="btn btn-outline-primary"
                :to="{ name: 'static-patient-questionnaire' }"
              >
                Ouvrir le questionnaire patient
              </RouterLink>
            </div>

            <div class="table-card table-card-scroll table-card-scroll-lg mb-4">
              <table class="table align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Canal</th>
                    <th>Destination</th>
                    <th>Questionnaire</th>
                    <th>Bâtiment</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="invitation in staticInvitations" :key="invitation.publicCode">
                    <td class="fw-semibold">{{ invitation.publicCode }}</td>
                    <td>{{ invitation.channel }}</td>
                    <td>{{ invitation.destination }}</td>
                    <td>
                      {{ invitation.questionnaireTitle }}<br /><span class="small muted">{{
                        invitation.sentAt
                      }}</span>
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
                <KpiCard label="Invitations" :value="String(totals.invitations)" />
              </div>
              <div class="col-md-3">
                <KpiCard label="Soumises" :value="String(totals.submitted)" tone="success" />
              </div>
              <div class="col-md-3">
                <KpiCard label="Actives" :value="String(totals.active)" tone="warning" />
              </div>
              <div class="col-md-3"><KpiCard label="Taux" :value="responseRate" /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
