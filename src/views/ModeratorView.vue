<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'

import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useModerationStore } from '@/stores/moderation'

const catalog = useCatalogStore()
const moderation = useModerationStore()

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

  form.questionnaireVersionId = catalog.publishedQuestionnaires[0]?.versionId ?? ''
  form.buildingId = catalog.buildings[0]?.id ?? ''
})

const questionnaires = computed(() => catalog.publishedQuestionnaires)
const total = computed(() => moderation.totals)
const responseRate = computed(() => {
  if (total.value.sent === 0) return '0 %'
  return `${Math.round((total.value.submitted / total.value.sent) * 100)} %`
})

async function submitInvitation() {
  await moderation.createInvitation({
    questionnaireVersionId: form.questionnaireVersionId,
    buildingId: form.buildingId,
    email: form.email,
    notifyModerator: form.notifyModerator,
    notifyAdmins: form.notifyAdmins,
  })
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Modération conforme CDC"
        title="Créer des invitations par email sans exposer les réponses"
        description="Le backend génère un code public non prédictible, un jeton signé, une identité email isolée logiquement et un journal d’audit. Le modérateur reste limité à son périmètre bâtiment."
        badge="Invitations réelles"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="catalog.status === 'error' || moderation.status === 'error'" class="alert alert-danger rounded-4" role="alert">
        {{ catalog.error || moderation.error }}
      </div>
      <div v-else class="alert alert-success rounded-4" role="status">
        Les questionnaires publiés, bâtiments et invitations viennent de PostgreSQL. Le lien répondant utilise `/r/&lt;token&gt;` et ne contient aucun email.
      </div>

      <div class="row g-4">
        <div class="col-xl-5">
          <form class="demo-card h-100" @submit.prevent="submitInvitation">
            <p class="section-eyebrow mb-2">Nouvelle invitation</p>
            <h2 class="h4 fw-bold mb-4">Créer un lien nominatif d’accès</h2>

            <label class="form-label fw-bold" for="questionnaire-select">Questionnaire publié</label>
            <select id="questionnaire-select" v-model="form.questionnaireVersionId" class="form-select mb-3" required>
              <option value="" disabled>Choisir un questionnaire</option>
              <option v-for="questionnaire in questionnaires" :key="questionnaire.versionId" :value="questionnaire.versionId">
                {{ questionnaire.title }} · version {{ questionnaire.versionLabel }}
              </option>
            </select>

            <label class="form-label fw-bold" for="building-select">Bâtiment / site</label>
            <select id="building-select" v-model="form.buildingId" class="form-select mb-3" required>
              <option value="" disabled>Choisir un bâtiment</option>
              <option v-for="building in catalog.buildings" :key="building.id" :value="building.id">
                {{ building.label }} · {{ building.country }}
              </option>
            </select>

            <label class="form-label fw-bold" for="respondent-email">Adresse email du répondant</label>
            <input id="respondent-email" v-model="form.email" class="form-control mb-3" type="email" required />

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

            <button class="btn btn-primary w-100 btn-lg" :disabled="moderation.status === 'creating'">
              {{ moderation.status === 'creating' ? 'Création…' : 'Envoyer le lien sécurisé' }}
            </button>

            <div v-if="moderation.lastCreatedLink" class="alert alert-info rounded-4 mt-3 mb-0">
              <strong>Lien de développement généré :</strong>
              <a class="d-block text-break" :href="moderation.lastCreatedLink">{{ moderation.lastCreatedLink }}</a>
              <span class="small">En production, ce lien sera envoyé par le service email, pas affiché.</span>
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
                      <span class="badge-soft" :class="{ success: invitation.status === 'submitted', warning: invitation.status !== 'submitted' }">
                        {{ invitation.status }}
                      </span>
                    </td>
                    <td>
                      <button
                        v-if="invitation.status !== 'submitted'"
                        class="btn btn-sm btn-outline-primary"
                        type="button"
                        @click="moderation.resendInvitation(invitation.id)"
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
    </div>
  </section>
</template>
