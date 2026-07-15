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
        eyebrow="GitHub Pages statique"
        title="Point de vue modérateur limité à la démo publique"
        description="Cette vue présente uniquement la création simulée d’un accès patient, le suivi opérationnel et le lien vers le questionnaire statique. Elle n’utilise ni session, ni API, ni stockage serveur."
        badge="Aucun backend requis"
      />

      <div class="alert alert-info rounded-4" role="status">
        Le build GitHub Pages masque volontairement l’administration, les statistiques, le coffre
        email, la conformité et les terminaux avancés. Le périmètre public reste réduit à cette vue
        modérateur et au questionnaire patient.
      </div>

      <div class="row g-4">
        <div class="col-xl-5">
          <form class="demo-card h-100" @submit.prevent="generateStaticAccess">
            <p class="section-eyebrow mb-2">Invitation simulée</p>
            <h2 class="h4 fw-bold mb-4">Préparer un accès patient statique</h2>

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
              <option value="email_simulation">Email simulé</option>
              <option value="sms_simulation">SMS simulé</option>
              <option value="terminal_preview">Terminal hospitalier simulé</option>
            </select>

            <template v-if="form.deliveryMode === 'sms_simulation'">
              <label class="form-label fw-bold" for="static-respondent-phone">Téléphone masqué dans le suivi</label>
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
            <p class="small muted mb-4">
              La destination sert seulement à illustrer le point de vue modérateur. Elle n’est pas
              envoyée ni persistée.
            </p>

            <button class="btn btn-primary w-100 btn-lg" type="submit">
              Générer l’aperçu de lien patient
            </button>

            <div v-if="generated" class="alert alert-info rounded-4 mt-3 mb-0">
              <strong>Lien patient statique :</strong>
              <RouterLink class="d-block text-break" :to="{ name: 'static-patient-questionnaire' }">
                {{ patientHref }}
              </RouterLink>
              <button
                class="btn btn-sm btn-outline-primary mt-2"
                type="button"
                @click="copyPatientLink"
              >
                {{ copiedLink ? 'Lien copié' : 'Copier le lien absolu' }}
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
                <h2 class="h4 fw-bold mb-0">Invitations statiques du périmètre</h2>
              </div>
              <RouterLink
                class="btn btn-outline-primary"
                :to="{ name: 'static-patient-questionnaire' }"
              >
                Ouvrir le questionnaire patient
              </RouterLink>
            </div>

            <div class="table-card mb-4">
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

      <div class="row g-4 mt-1">
        <div class="col-lg-6">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Garanties de cette page</p>
            <h2 class="h4 fw-bold mb-3">Ce qui est volontairement figé</h2>
            <div class="d-grid gap-3">
              <div class="d-flex gap-3 align-items-start">
                <span class="badge-soft success">✓</span>
                <p class="mb-0 fw-semibold">
                  Aucune authentification interne n’est exposée sur GitHub Pages.
                </p>
              </div>
              <div class="d-flex gap-3 align-items-start">
                <span class="badge-soft success">✓</span>
                <p class="mb-0 fw-semibold">
                  Aucun endpoint backend n’est appelé pendant la navigation publique.
                </p>
              </div>
              <div class="d-flex gap-3 align-items-start">
                <span class="badge-soft success">✓</span>
                <p class="mb-0 fw-semibold">
                  Le questionnaire patient reste consultable par URL hash statique.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Hors périmètre public</p>
            <h2 class="h4 fw-bold mb-3">Ce qui reste réservé à l’application complète</h2>
            <p class="muted mb-0">
              Administration du questionnaire, RGPD, coffre email, statistiques détaillées,
              terminaux administrés et invitations réelles restent dans le build applicatif
              connecté. Le workflow GitHub Pages sert uniquement de vitrine métier sûre.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
