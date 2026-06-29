<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { appConfig } from '@/config/env'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { useStatsStore } from '@/stores/stats'

const catalog = useCatalogStore()
const session = useSessionStore()
const statsStore = useStatsStore()
const selectedQuestionnaireId = ref('')

const selectedQuestionnaire = computed(() => (
  catalog.publishedQuestionnaires.find((questionnaire) => questionnaire.id === selectedQuestionnaireId.value) ?? null
))

const canReadSubmissions = computed(() => ['admin', 'analyst', 'dpo'].includes(session.currentRole))

onMounted(async () => {
  await catalog.fetchCatalog()
  selectedQuestionnaireId.value = catalog.publishedQuestionnaires[0]?.id ?? ''
})

watch(selectedQuestionnaireId, async (id) => {
  if (id) await statsStore.fetchForQuestionnaire(id)
}, { immediate: false })

function formatDuration(durationMs?: number | null): string {
  if (!durationMs) return '—'
  const seconds = Math.round(durationMs / 1000)
  if (seconds < 60) return `${seconds} s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes} min ${remainder} s` : `${minutes} min`
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Statistiques pseudonymisées"
        title="Dashboard administrateur sans exposition email"
        :description="appConfig.demoMode ? 'Indicateurs simulés pour démonstration métier : volumes, taux, temps, groupes, Likert, soumissions par code et coffre email séparé.' : 'Indicateurs calculés depuis les invitations, réponses, soumissions et événements PostgreSQL. Les ventilations faibles restent masquées par seuil d’agrégation.'"
        :badge="appConfig.demoMode ? 'Données simulées' : 'Données réelles'"
      />
      <RoleGateInfo class="mb-4" />

      <div class="demo-card mb-4">
        <div class="row g-3 align-items-end">
          <div class="col-lg-7">
            <label class="form-label fw-semibold" for="questionnaire-select">Questionnaire publié</label>
            <select id="questionnaire-select" v-model="selectedQuestionnaireId" class="form-select form-select-lg rounded-4">
              <option v-for="questionnaire in catalog.publishedQuestionnaires" :key="questionnaire.id" :value="questionnaire.id">
                {{ questionnaire.title }} · {{ questionnaire.versionLabel }}
              </option>
            </select>
          </div>
          <div class="col-lg-5">
            <div class="alert alert-info rounded-4 mb-0">
              <strong>Identifiant opérationnel :</strong>
              code unique uniquement. Aucun email ni identité directe n’est affiché dans ce dashboard.
            </div>
          </div>
        </div>
      </div>

      <div v-if="statsStore.status === 'error'" class="alert alert-danger rounded-4" role="alert">
        {{ statsStore.error }}
      </div>

      <div v-if="statsStore.status === 'loading'" class="demo-card text-center py-5">
        Chargement des statistiques…
      </div>

      <template v-if="statsStore.stats">
        <div class="alert alert-info rounded-4">
          Seuil d’agrégation actif : n ≥ {{ statsStore.stats.threshold }}. En dessous, les détails par bâtiment, groupe ou question affichent “effectif insuffisant”.
        </div>

        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <KpiCard label="Invitations" :value="String(statsStore.stats.totals.invited)" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Ouverture" :value="`${statsStore.stats.totals.openingRate} %`" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Démarrage" :value="`${statsStore.stats.totals.startRate} %`" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Soumission" :value="`${statsStore.stats.totals.submissionRate} %`" tone="success" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Abandon" :value="`${statsStore.stats.totals.abandonmentRate} %`" tone="warning" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Temps médian total" :value="formatDuration(statsStore.stats.totals.medianTotalDurationMs)" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Popups ouvertes" :value="String(statsStore.stats.totals.popupOpens)" tone="warning" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Changements / reprises" :value="`${statsStore.stats.totals.answerChanges} / ${statsStore.stats.totals.resumes}`" />
          </div>
        </div>

        <div class="row g-4">
          <div class="col-xl-6">
            <div class="demo-card h-100">
              <p class="section-eyebrow mb-2">Versions</p>
              <h2 class="h4 fw-bold mb-4">Comparaison de campagne</h2>
              <div class="table-card">
                <table class="table align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Version</th>
                      <th>Invités</th>
                      <th>Ouverts</th>
                      <th>Démarrés</th>
                      <th>Soumis</th>
                      <th>Abandon</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="version in statsStore.stats.versions" :key="version.id">
                      <td class="fw-semibold">{{ version.versionLabel }}</td>
                      <td>{{ version.invited }}</td>
                      <td>{{ version.openingRate }} %</td>
                      <td>{{ version.startRate }} %</td>
                      <td>{{ version.submissionRate }} %</td>
                      <td>{{ version.abandonmentRate }} %</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-xl-6">
            <div class="demo-card h-100">
              <p class="section-eyebrow mb-2">Canaux de passation</p>
              <h2 class="h4 fw-bold mb-4">Email vs terminal hospitalier</h2>
              <div class="table-card">
                <table class="table align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Canal</th>
                      <th>Invités</th>
                      <th>Ouverts</th>
                      <th>Démarrés</th>
                      <th>Soumis</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="mode in statsStore.stats.deliveryModes" :key="mode.mode">
                      <td class="fw-semibold">{{ mode.label }}</td>
                      <td>{{ mode.invited }}</td>
                      <td>{{ mode.openingRate }} %</td>
                      <td>{{ mode.startRate }} %</td>
                      <td><span class="badge-soft success">{{ mode.submissionRate }} %</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p class="small muted mt-3 mb-0">
                Le canal terminal permet d’inclure les répondants sans email ni appareil personnel, sans exposer une session staff.
              </p>
            </div>
          </div>

          <div class="col-xl-6">
            <div class="demo-card h-100">
              <p class="section-eyebrow mb-2">Bâtiments</p>
              <h2 class="h4 fw-bold mb-4">Ventilation seuillée</h2>
              <div class="table-card">
                <table class="table align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Bâtiment</th>
                      <th>Invités</th>
                      <th>Ouverture</th>
                      <th>Démarrage</th>
                      <th>Soumission</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="building in statsStore.stats.buildings" :key="building.buildingId">
                      <td class="fw-semibold">{{ building.label }}</td>
                      <td>{{ building.invited ?? '—' }}</td>
                      <td>{{ building.openingRate === null ? '—' : `${building.openingRate} %` }}</td>
                      <td>{{ building.startRate === null ? '—' : `${building.startRate} %` }}</td>
                      <td>
                        <span class="badge-soft" :class="{ success: building.effectifSufficient, warning: !building.effectifSufficient }">
                          {{ building.effectifSufficient ? `${building.submissionRate} %` : building.displayValue }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-xl-5">
            <div class="demo-card h-100">
              <p class="section-eyebrow mb-2">Groupes</p>
              <h2 class="h4 fw-bold mb-4">Temps et popups par bloc</h2>
              <div class="table-card">
                <table class="table align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Groupe</th>
                      <th>Questions</th>
                      <th>Répondants</th>
                      <th>Temps médian</th>
                      <th>Popups</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="group in statsStore.stats.groups" :key="group.id">
                      <td class="fw-semibold">{{ group.title }}</td>
                      <td>{{ group.questionCount }}</td>
                      <td>{{ group.respondentCount ?? group.displayValue }}</td>
                      <td>{{ formatDuration(group.medianDurationMs) }}</td>
                      <td>{{ group.popupOpens ?? '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="col-xl-7">
            <div class="demo-card h-100">
              <p class="section-eyebrow mb-2">Soumissions pseudonymisées</p>
              <h2 class="h4 fw-bold mb-4">Liste par code unique</h2>
              <div class="table-card">
                <table class="table align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Code</th>
                      <th>Bâtiment</th>
                      <th>Statut</th>
                      <th>Temps</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="submission in statsStore.stats.submissions" :key="submission.publicCode">
                      <td class="fw-semibold">{{ submission.publicCode }}</td>
                      <td>{{ submission.building }}</td>
                      <td><span class="badge-soft success">{{ submission.status }}</span></td>
                      <td>{{ formatDuration(submission.totalDurationMs) }}</td>
                      <td>
                        <button
                          class="btn btn-sm btn-outline-primary rounded-pill"
                          type="button"
                          :disabled="!canReadSubmissions || statsStore.submissionStatus === 'loading'"
                          @click="statsStore.fetchSubmission(submission.publicCode)"
                        >
                          Voir sans email
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-if="!canReadSubmissions" class="small muted mt-3 mb-0">
                Votre rôle voit les indicateurs agrégés mais pas le détail individuel des soumissions.
              </p>
            </div>
          </div>

          <div class="col-12">
            <div class="demo-card">
              <div class="d-flex flex-wrap justify-content-between gap-2 mb-4">
                <div>
                  <p class="section-eyebrow mb-2">Questions, Likert et popups</p>
                  <h2 class="h4 fw-bold mb-0">Signaux de compréhension</h2>
                </div>
                <span class="badge-soft warning">{{ statsStore.stats.totals.popupOpens }} ouverture(s) popup</span>
              </div>
              <div class="table-card">
                <table class="table align-middle">
                  <thead class="table-light">
                    <tr>
                      <th>Question</th>
                      <th>Réponses</th>
                      <th>Temps médian</th>
                      <th>Likert</th>
                      <th>Libre</th>
                      <th>Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="question in statsStore.stats.questions" :key="question.id">
                      <td style="min-width: 260px">
                        <strong>{{ question.code }}</strong>
                        <div class="small muted">{{ question.label }}</div>
                        <div class="small muted">{{ question.responseType }}</div>
                      </td>
                      <td>{{ question.answerCount ?? question.displayValue }}</td>
                      <td>
                        <span class="badge-soft" :class="{ warning: question.highMedianDuration }">
                          {{ formatDuration(question.medianDurationMs) }}
                        </span>
                      </td>
                      <td style="min-width: 280px">
                        <div v-if="question.likertDistribution" class="d-grid gap-1">
                          <div v-for="bucket in question.likertDistribution" :key="`${question.id}-${bucket.value}`" class="small">
                            <strong>{{ bucket.value }}</strong> · {{ bucket.count }} réponse(s) · {{ bucket.rate }} %
                            <span class="muted">{{ bucket.label }}</span>
                          </div>
                        </div>
                        <span v-else class="muted">—</span>
                      </td>
                      <td style="min-width: 260px">
                        <div v-if="question.freeTextResponses.length" class="d-grid gap-2">
                          <blockquote v-for="response in question.freeTextResponses.slice(0, 2)" :key="`${question.id}-${response.publicCode}`" class="small border-start ps-2 mb-0">
                            <span class="badge-soft me-1">{{ response.publicCode }}</span>
                            {{ response.value }}
                            <span v-if="response.warning" class="badge-soft warning ms-1">alerte PII</span>
                          </blockquote>
                        </div>
                        <span v-else-if="question.freeTextAccess === 'forbidden'" class="badge-soft warning">permission requise</span>
                        <span v-else class="muted">—</span>
                      </td>
                      <td>
                        <div class="d-flex flex-wrap gap-1">
                          <span class="badge-soft" :class="{ danger: question.difficultQuestion, success: question.effectifSufficient && !question.difficultQuestion, warning: !question.effectifSufficient }">
                            {{ question.difficultQuestion ? 'question difficile' : question.displayValue }}
                          </span>
                          <span v-for="label in question.difficultyLabels" :key="label" class="badge-soft warning">
                            {{ label }}
                          </span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div v-if="statsStore.submissionError" class="alert alert-danger rounded-4 mt-4">
          {{ statsStore.submissionError }}
        </div>

        <div v-if="statsStore.selectedSubmission" class="demo-card mt-4">
          <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
            <div>
              <p class="section-eyebrow mb-2">Soumission individuelle pseudonymisée</p>
              <h2 class="h4 fw-bold mb-0">Code {{ statsStore.selectedSubmission.publicCode }}</h2>
            </div>
            <button class="btn btn-outline-secondary rounded-pill" type="button" @click="statsStore.clearSubmission()">
              Fermer
            </button>
          </div>
          <div class="row g-3 mb-4">
            <div class="col-md-3"><strong>Bâtiment</strong><div class="muted">{{ statsStore.selectedSubmission.building }}</div></div>
            <div class="col-md-3"><strong>Soumis le</strong><div class="muted">{{ formatDate(statsStore.selectedSubmission.submittedAt) }}</div></div>
            <div class="col-md-3"><strong>Temps total</strong><div class="muted">{{ formatDuration(statsStore.selectedSubmission.totalDurationMs) }}</div></div>
            <div class="col-md-3"><strong>Télémétrie</strong><div class="muted">{{ statsStore.selectedSubmission.telemetry.totalEvents }} événement(s)</div></div>
          </div>
          <div class="table-card">
            <table class="table align-middle">
              <thead class="table-light">
                <tr>
                  <th>Question</th>
                  <th>Réponse</th>
                  <th>Alerte</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="answer in statsStore.selectedSubmission.answers" :key="answer.questionCode">
                  <td>
                    <strong>{{ answer.questionCode }}</strong>
                    <div class="small muted">{{ answer.questionLabel }}</div>
                  </td>
                  <td>{{ formatAnswer(answer.value) }}</td>
                  <td>{{ answer.warning ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="alert alert-success rounded-4 mt-3 mb-0">
            Vérification : aucune adresse email n’est fournie par cette vue. La correspondance code-email reste dans le coffre identité.
          </div>
        </div>
      </template>

      <div v-if="selectedQuestionnaire && statsStore.status === 'ready'" class="small muted mt-4">
        Questionnaire courant : {{ selectedQuestionnaire.code }} · {{ selectedQuestionnaire.title }}.
      </div>
    </div>
  </section>
</template>
