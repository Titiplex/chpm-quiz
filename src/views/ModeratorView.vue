<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import NotificationPreferencesCard from '@/components/notifications/NotificationPreferencesCard.vue'
import { appConfig } from '@/config/env'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useModerationStore } from '@/stores/moderation'
import type { ApiInvitation } from '@shared/types/api'
import type { InvitationStatus } from '@shared/types/domain'

const catalog = useCatalogStore()
const moderation = useModerationStore()
const copiedLink = ref(false)

const form = reactive({
  questionnaireVersionId: '',
  buildingId: '',
  email: 'personne.exemple@domaine.org',
  notifyModerator: true,
  notifyAdmins: false,
})

onMounted(async () => {
  await catalog.fetchCatalog()
  await moderation.fetchInvitations()

  form.questionnaireVersionId = questionnaires.value[0]?.versionId ?? ''
  form.buildingId = catalog.buildings[0]?.id ?? ''
})

const questionnaires = computed(() =>
  catalog.publishedQuestionnaires.filter((questionnaire) => isQuestionnaireOpen(questionnaire.openFrom, questionnaire.openUntil)),
)
const total = computed(() => moderation.totals)
const responseRate = computed(() => {
  if (total.value.sent === 0) return '0 %'
  return `${Math.round((total.value.submitted / total.value.sent) * 100)} %`
})

async function submitInvitation() {
  copiedLink.value = false
  await moderation.createInvitation({
    questionnaireVersionId: form.questionnaireVersionId,
    buildingId: form.buildingId,
    email: form.email,
    notifyModerator: form.notifyModerator,
    notifyAdmins: form.notifyAdmins,
  })
}

async function copyGeneratedLink(): Promise<void> {
  if (!moderation.lastCreatedLink) return

  await navigator.clipboard?.writeText(moderation.lastCreatedLink)
  copiedLink.value = true
}

async function resend(invitation: ApiInvitation): Promise<void> {
  await moderation.resendInvitation(invitation.id)
}

function isQuestionnaireOpen(openFrom?: string | null, openUntil?: string | null): boolean {
  const now = Date.now()
  const startsAt = openFrom ? new Date(openFrom).getTime() : Number.NEGATIVE_INFINITY
  const endsAt = openUntil ? new Date(openUntil).getTime() : Number.POSITIVE_INFINITY
  return startsAt <= now && endsAt >= now
}

function statusLabel(status: InvitationStatus): string {
  const labels: Record<InvitationStatus, string> = {
    pending: 'En attente',
    sent: 'Envoyée',
    opened: 'Ouverte',
    in_progress: 'En cours',
    draft: 'Brouillon',
    submitted: 'Soumise',
    expired: 'Expirée',
    blocked: 'Bloquée',
    cancelled: 'Annulée',
  }

  return labels[status] ?? status
}

function statusTone(status: InvitationStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'submitted') return 'success'
  if (['expired', 'blocked', 'cancelled'].includes(status)) return 'danger'
  if (['opened', 'in_progress', 'draft'].includes(status)) return 'warning'
  return 'neutral'
}

function canResend(invitation: ApiInvitation): boolean {
  return !['submitted', 'cancelled', 'blocked', 'expired'].includes(invitation.status)
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Modération conforme CDC"
        title="Créer des invitations par email sans exposer les réponses"
        :description="appConfig.demoMode ? 'La démo simule la génération de liens, les statuts d’invitation et le parcours répondant directement dans le navigateur.' : 'Le backend génère un code public non prédictible, un jeton signé, une identité email isolée logiquement et un journal d’audit. Le modérateur reste limité à son périmètre bâtiment.'"
        :badge="appConfig.demoMode ? 'Invitations simulées' : 'Invitations réelles'"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="catalog.status === 'error' || moderation.status === 'error'" class="alert alert-danger rounded-4" role="alert">
        {{ catalog.error || moderation.error }}
      </div>
      <div v-else class="alert alert-success rounded-4" role="status">
        {{ appConfig.demoMode
          ? 'Mode GitHub Pages : questionnaires, bâtiments et invitations sont simulés localement. Le lien répondant utilise `#/r/<token>` et ne contient aucun email.'
          : 'Les questionnaires publiés et ouverts, bâtiments et invitations viennent de PostgreSQL. Le lien répondant utilise `/r/<token>` et ne contient aucun email.' }}
      </div>

      <div class="row g-4">
        <div class="col-xl-5">
          <form class="demo-card h-100" @submit.prevent="submitInvitation">
            <p class="section-eyebrow mb-2">Nouvelle invitation</p>
            <h2 class="h4 fw-bold mb-4">Créer un lien nominatif d’accès</h2>

            <label class="form-label fw-bold" for="questionnaire-select">Questionnaire publié et ouvert</label>
            <select id="questionnaire-select" v-model="form.questionnaireVersionId" class="form-select mb-3" required>
              <option value="" disabled>Choisir un questionnaire</option>
              <option v-for="questionnaire in questionnaires" :key="questionnaire.versionId" :value="questionnaire.versionId">
                {{ questionnaire.title }} · version {{ questionnaire.versionLabel }}
              </option>
            </select>
            <p v-if="!questionnaires.length" class="small text-danger mb-3">
              Aucun questionnaire publié et ouvert n’est disponible dans le périmètre courant.
            </p>

            <label class="form-label fw-bold" for="building-select">Bâtiment / site</label>
            <select id="building-select" v-model="form.buildingId" class="form-select mb-3" required>
              <option value="" disabled>Choisir un bâtiment</option>
              <option v-for="building in catalog.buildings" :key="building.id" :value="building.id">
                {{ building.label }} · {{ building.country }}
              </option>
            </select>

            <label class="form-label fw-bold" for="respondent-email">Adresse email du répondant</label>
            <input id="respondent-email" v-model="form.email" class="form-control mb-3" type="email" required />
            <p class="small muted mb-3">
              {{ appConfig.demoMode
                ? 'En démo statique, l’email est seulement masqué côté navigateur. En production, il sera chiffré et séparé des réponses.'
                : 'L’email est chiffré et stocké dans la base identité. La table opérationnelle ne conserve que le code public, le hash de jeton et les statuts.' }}
            </p>

            <div class="row g-3 mb-4">
              <div class="col-md-6">
                <div class="form-check form-switch">
                  <input id="notifyModerator" v-model="form.notifyModerator" class="form-check-input" type="checkbox" />
                  <label class="form-check-label fw-semibold" for="notifyModerator">
                    Notifier le modérateur à la réponse
                  </label>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-check form-switch">
                  <input id="notifyAdmin" v-model="form.notifyAdmins" class="form-check-input" type="checkbox" />
                  <label class="form-check-label fw-semibold" for="notifyAdmin">
                    Notifier les administrateurs
                  </label>
                </div>
              </div>
            </div>

            <button class="btn btn-primary w-100 btn-lg" :disabled="moderation.status === 'creating' || !questionnaires.length">
              {{ moderation.status === 'creating' ? 'Création…' : 'Envoyer le lien sécurisé' }}
            </button>

            <div v-if="moderation.lastCreatedLink" class="alert alert-info rounded-4 mt-3 mb-0">
              <strong>Lien de développement généré :</strong>
              <a class="d-block text-break" :href="moderation.lastCreatedLink">{{ moderation.lastCreatedLink }}</a>
              <span class="small d-block mb-2">En production, ce lien sera envoyé par le service email, pas affiché.</span>
              <button class="btn btn-sm btn-outline-primary" type="button" @click="copyGeneratedLink">
                {{ copiedLink ? 'Lien copié' : 'Copier le lien pour la démo' }}
              </button>
              <p v-if="moderation.lastCreatedInvitation" class="small muted mt-2 mb-0">
                Code public : {{ moderation.lastCreatedInvitation.publicCode }} · Statut : {{ statusLabel(moderation.lastCreatedInvitation.status) }}
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
              <button class="btn btn-outline-primary" type="button" @click="moderation.fetchInvitations">
                Actualiser
              </button>
            </div>

            <div class="table-card mb-4">
              <table class="table align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Email masqué</th>
                    <th>Questionnaire</th>
                    <th>Bâtiment</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="invitation in moderation.invitations" :key="invitation.id">
                    <td class="fw-semibold">{{ invitation.publicCode }}</td>
                    <td>{{ invitation.maskedEmail ?? 'masqué' }}</td>
                    <td>{{ invitation.questionnaireTitle }} v{{ invitation.versionLabel }}</td>
                    <td>{{ invitation.building.label }}</td>
                    <td>
                      <span class="badge-soft" :class="statusTone(invitation.status)">
                        {{ statusLabel(invitation.status) }}
                      </span>
                    </td>
                    <td>
                      <button
                        v-if="canResend(invitation)"
                        class="btn btn-sm btn-outline-primary"
                        type="button"
                        @click="resend(invitation)"
                      >
                        Relancer
                      </button>
                    </td>
                  </tr>
                  <tr v-if="!moderation.invitations.length">
                    <td colspan="6" class="text-center muted py-4">Aucune invitation dans ce périmètre.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="row g-3">
              <div class="col-md-3">
                <KpiCard label="Invitations" :value="String(total.sent)" />
              </div>
              <div class="col-md-3">
                <KpiCard label="Soumis" :value="String(total.submitted)" tone="success" />
              </div>
              <div class="col-md-3">
                <KpiCard label="En cours" :value="String(total.pending)" tone="warning" />
              </div>
              <div class="col-md-3">
                <KpiCard label="Taux" :value="responseRate" />
              </div>
            </div>

            <div class="mt-4 p-3 rounded-4 bg-light border">
              <strong>Garantie appliquée :</strong>
              <p class="muted mb-0 mt-1">
                la table opérationnelle d’invitation ne stocke pas l’email en clair ; l’interface affiche seulement un email masqué et les réponses restent invisibles pour le modérateur.
              </p>
            </div>
          </div>
        </div>

      </div>

      <div class="row g-4 mt-1">
        <div class="col-12">
          <NotificationPreferencesCard />
        </div>
      </div>
    </div>
  </section>
</template>
