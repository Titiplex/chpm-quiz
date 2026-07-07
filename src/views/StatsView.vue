<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import KpiCard from '@/components/common/KpiCard.vue'
import ModalPanel from '@/components/common/ModalPanel.vue'
import PageSectionNav from '@/components/common/PageSectionNav.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { appConfig } from '@/config/env'
import { useCatalogStore } from '@/stores/catalog'
import { useSessionStore } from '@/stores/session'
import { useStatsStore } from '@/stores/stats'


type PageSectionNavItem = {
  id: string
  label: string
  hint?: string
}

const catalog = useCatalogStore()
const session = useSessionStore()
const statsStore = useStatsStore()
const selectedQuestionnaireId = ref('')
const visibleSubmissionCount = ref(10)
const visiblePopupCount = ref(8)
const visibleQuestionCount = ref(6)

const statsSections: PageSectionNavItem[] = [
  { id: 'stats-overview', label: 'Synthèse', hint: 'KPI et seuil' },
  { id: 'stats-segments', label: 'Segments', hint: 'Versions, sites, bâtiments' },
  { id: 'stats-submissions', label: 'Soumissions', hint: 'Codes pseudonymisés' },
  { id: 'stats-popups', label: 'Popups', hint: 'Termes ouverts' },
  { id: 'stats-questions', label: 'Questions', hint: 'Temps et signaux' },
]

const selectedQuestionnaire = computed(() => (
  catalog.publishedQuestionnaires.find((questionnaire) => questionnaire.id === selectedQuestionnaireId.value) ?? null
))

const canReadSubmissions = computed(() => ['admin', 'analyst', 'dpo'].includes(session.currentRole))

const visibleSubmissions = computed(() => statsStore.stats?.submissions.slice(0, visibleSubmissionCount.value) ?? [])
const visiblePopups = computed(() => statsStore.stats?.popups?.slice(0, visiblePopupCount.value) ?? [])
const visibleQuestions = computed(() => statsStore.stats?.questions.slice(0, visibleQuestionCount.value) ?? [])

const hiddenSubmissionCount = computed(() => Math.max((statsStore.stats?.submissions.length ?? 0) - visibleSubmissionCount.value, 0))
const hiddenPopupCount = computed(() => Math.max((statsStore.stats?.popups?.length ?? 0) - visiblePopupCount.value, 0))
const hiddenQuestionCount = computed(() => Math.max((statsStore.stats?.questions.length ?? 0) - visibleQuestionCount.value, 0))

function resetVisibleStatsLists(): void {
  visibleSubmissionCount.value = 10
  visiblePopupCount.value = 8
  visibleQuestionCount.value = 6
}

function showMoreSubmissions(): void {
  visibleSubmissionCount.value += 10
}

function showMorePopups(): void {
  visiblePopupCount.value += 8
}

function showMoreQuestions(): void {
  visibleQuestionCount.value += 6
}

onMounted(async () => {
  await catalog.fetchCatalog()
  selectedQuestionnaireId.value = catalog.publishedQuestionnaires[0]?.id ?? ''
})

watch(selectedQuestionnaireId, async (id) => {
  if (!id) return
  resetVisibleStatsLists()
  await statsStore.fetchForQuestionnaire(id)
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

function closeSubmissionDetail(): void {
  statsStore.clearSubmission()
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        title="Statistiques"
        description="Indicateurs de participation et signaux de compréhension — sans exposition d'identité."
        :badge="appConfig.demoMode ? 'Données simulées' : 'Données réelles'"
        :badge-tone="appConfig.demoMode ? 'warning' : 'success'"
      />
      <RoleGateInfo />

      <!-- Sélecteur questionnaire -->
      <div class="demo-card mb-4">
        <div class="row g-3 align-items-end">
          <div class="col-lg-8">
            <label class="form-label fw-semibold" for="questionnaire-select">Questionnaire</label>
            <select id="questionnaire-select" v-model="selectedQuestionnaireId" class="form-select form-select-lg">
              <option v-for="questionnaire in catalog.publishedQuestionnaires" :key="questionnaire.id" :value="questionnaire.id">
                {{ questionnaire.title }} · {{ questionnaire.versionLabel }}
              </option>
            </select>
          </div>
          <div class="col-lg-4">
            <p class="small mb-0" style="color: var(--chm-muted);">
              Les données affichées sont pseudonymisées — aucun email ni identité directe n'apparaît ici.
            </p>
          </div>
        </div>
      </div>

      <div v-if="statsStore.status === 'error'" class="alert alert-danger rounded-3" role="alert">
        {{ statsStore.error }}
      </div>

      <div v-if="statsStore.status === 'loading'" class="demo-card text-center py-5" style="color: var(--chm-muted);">
        Chargement des statistiques…
      </div>

      <template v-if="statsStore.stats">
        <div class="page-workspace">
          <PageSectionNav title="Navigation statistiques" :sections="statsSections" />
          <div class="page-workspace-main">
        <!-- Info seuil -->
        <div id="stats-overview" class="page-section d-flex align-items-center gap-2 mb-4">
          <span class="badge-soft warning">Seuil n ≥ {{ statsStore.stats.threshold }}</span>
          <span class="small" style="color: var(--chm-muted);">En dessous, les détails sont masqués pour préserver la confidentialité.</span>
        </div>

        <!-- KPIs principaux -->
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <KpiCard label="Invitations" :value="String(statsStore.stats.totals.invited)" icon="📨" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Taux d'ouverture" :value="`${statsStore.stats.totals.openingRate} %`" icon="📬" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Taux de soumission" :value="`${statsStore.stats.totals.submissionRate} %`" tone="success" icon="✅" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Taux d'abandon" :value="`${statsStore.stats.totals.abandonmentRate} %`" tone="warning" icon="⚠️" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Démarrage" :value="`${statsStore.stats.totals.startRate} %`" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Temps médian" :value="formatDuration(statsStore.stats.totals.medianTotalDurationMs)" icon="⏱️" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Popups ouvertes" :value="String(statsStore.stats.totals.popupOpens)" tone="warning" icon="💬" />
          </div>
          <div class="col-md-3">
            <KpiCard label="Reprises" :value="String(statsStore.stats.totals.resumes)" />
          </div>
        </div>

        <div id="stats-segments" class="page-section row g-4">
          <!-- Versions -->
          <div class="col-xl-6">
            <div class="demo-card h-100">
              <h2 class="page-header-title mb-4" style="font-size:1rem;">Versions</h2>
              <div class="table-card table-card-scroll">
                <table class="table align-middle">
                  <thead>
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
                      <td><span class="badge-soft success">{{ version.submissionRate }} %</span></td>
                      <td>{{ version.abandonmentRate }} %</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Canaux -->
          <div class="col-xl-6">
            <div class="demo-card h-100">
              <h2 class="page-header-title mb-4" style="font-size:1rem;">Canaux de passation</h2>
              <div class="table-card table-card-scroll">
                <table class="table align-middle">
                  <thead>
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
            </div>
          </div>

          <!-- Sites -->
          <div class="col-xl-6">
            <div class="demo-card h-100">
              <h2 class="page-header-title mb-4" style="font-size:1rem;">Sites</h2>
              <div class="table-card table-card-scroll">
                <table class="table align-middle">
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Invités</th>
                      <th>Ouverture</th>
                      <th>Démarrage</th>
                      <th>Soumission</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="site in statsStore.stats.sites ?? []" :key="site.siteId">
                      <td class="fw-semibold">{{ site.label }}</td>
                      <td>{{ site.invited }}</td>
                      <td>{{ site.openingRate }} %</td>
                      <td>{{ site.startRate }} %</td>
                      <td><span class="badge-soft success">{{ site.submissionRate }} %</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Langues -->
          <div class="col-xl-6">
            <div class="demo-card h-100">
              <h2 class="page-header-title mb-4" style="font-size:1rem;">Langues</h2>
              <div class="table-card table-card-scroll">
                <table class="table align-middle">
                  <thead>
                    <tr>
                      <th>Langue</th>
                      <th>Versions</th>
                      <th>Invités</th>
                      <th>Soumis</th>
                      <th>Taux</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="language in statsStore.stats.languages ?? []" :key="language.language">
                      <td class="fw-semibold text-uppercase">{{ language.language }}</td>
                      <td>{{ language.versionCount }}</td>
                      <td>{{ language.invited }}</td>
                      <td>{{ language.submitted }}</td>
                      <td><span class="badge-soft success">{{ language.submissionRate }} %</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Bâtiments -->
          <div class="col-xl-6">
            <div class="demo-card h-100">
              <h2 class="page-header-title mb-4" style="font-size:1rem;">Bâtiments</h2>
              <div class="table-card table-card-scroll">
                <table class="table align-middle">
                  <thead>
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

          <!-- Groupes -->
          <div class="col-xl-6">
            <div class="demo-card h-100">
              <h2 class="page-header-title mb-4" style="font-size:1rem;">Groupes de questions</h2>
              <div class="table-card table-card-scroll">
                <table class="table align-middle">
                  <thead>
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

          <!-- Soumissions pseudonymisées -->
          <div id="stats-submissions" class="page-section col-12">
            <CollapsibleSection
              title="Soumissions pseudonymisées"
              :badge="`${statsStore.stats.submissions.length} code(s)`"
              :default-open="false"
              body-class="compact"
            >
              <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                <p class="muted mb-0">Table déplacée en section déroulante : elle sert au support ponctuel, pas au pilotage quotidien.</p>
                <span class="badge-soft warning">Pas d’email affiché</span>
              </div>
              <div class="table-card stats-table-card">
                <table class="table align-middle">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Bâtiment</th>
                      <th>Statut</th>
                      <th>Temps</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="submission in visibleSubmissions" :key="submission.publicCode">
                      <td class="fw-semibold" style="font-family:monospace; font-size:0.88rem;">{{ submission.publicCode }}</td>
                      <td>{{ submission.building }}</td>
                      <td><span class="badge-soft success">{{ submission.status }}</span></td>
                      <td>{{ formatDuration(submission.totalDurationMs) }}</td>
                      <td>
                        <button
                          class="btn btn-sm btn-outline-primary"
                          type="button"
                          :disabled="!canReadSubmissions || statsStore.submissionStatus === 'loading'"
                          @click="statsStore.fetchSubmission(submission.publicCode)"
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="stats-list-actions">
                <span class="small" style="color: var(--chm-muted);">
                  {{ visibleSubmissions.length }} / {{ statsStore.stats.submissions.length }} soumission(s) affichée(s)
                </span>
                <div class="d-flex flex-wrap gap-2">
                  <button
                    v-if="hiddenSubmissionCount > 0"
                    class="btn btn-sm btn-outline-primary"
                    type="button"
                    @click="showMoreSubmissions"
                  >
                    Afficher 10 de plus
                  </button>
                  <button
                    v-if="visibleSubmissionCount > 10"
                    class="btn btn-sm btn-outline-secondary"
                    type="button"
                    @click="visibleSubmissionCount = 10"
                  >
                    Réduire
                  </button>
                </div>
              </div>
              <p v-if="!canReadSubmissions" class="small mt-3 mb-0" style="color: var(--chm-muted);">
                Votre rôle accède aux indicateurs agrégés uniquement.
              </p>
            </CollapsibleSection>
          </div>

          <!-- Popups -->
          <div id="stats-popups" class="page-section col-12">
            <CollapsibleSection
              title="Termes nécessitant une explication"
              badge-tone="warning"
              :badge="`Seuil n ≥ ${statsStore.stats.threshold}`"
              body-class="compact"
            >
              <div class="table-card stats-table-card">
                <table class="table align-middle">
                  <thead>
                    <tr>
                      <th>Terme</th>
                      <th>Question</th>
                      <th>Groupe</th>
                      <th>Version</th>
                      <th>Ouvertures</th>
                      <th>Répondants</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="popup in visiblePopups" :key="popup.id">
                      <td>
                        <strong>{{ popup.title }}</strong>
                        <div class="small" style="color:var(--chm-muted); font-family:monospace;">{{ popup.termKey }}</div>
                      </td>
                      <td>{{ popup.questionCode }}</td>
                      <td>{{ popup.groupTitle }}</td>
                      <td>{{ popup.versionLabel }}</td>
                      <td>{{ popup.openedCount ?? popup.displayValue }}</td>
                      <td>
                        <span class="badge-soft" :class="{ success: popup.effectifSufficient, warning: !popup.effectifSufficient }">
                          {{ popup.respondentCount ?? popup.displayValue }}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="stats-list-actions">
                <span class="small" style="color: var(--chm-muted);">
                  {{ visiblePopups.length }} / {{ statsStore.stats.popups?.length ?? 0 }} terme(s) affiché(s)
                </span>
                <div class="d-flex flex-wrap gap-2">
                  <button
                    v-if="hiddenPopupCount > 0"
                    class="btn btn-sm btn-outline-primary"
                    type="button"
                    @click="showMorePopups"
                  >
                    Afficher 8 de plus
                  </button>
                  <button
                    v-if="visiblePopupCount > 8"
                    class="btn btn-sm btn-outline-secondary"
                    type="button"
                    @click="visiblePopupCount = 8"
                  >
                    Réduire
                  </button>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          <!-- Questions détaillées -->
          <div id="stats-questions" class="page-section col-12">
            <CollapsibleSection
              title="Signaux de compréhension par question"
              badge-tone="warning"
              :badge="`${statsStore.stats.totals.popupOpens} ouverture(s) popup`"
              :default-open="false"
              body-class="compact"
            >
              <div class="table-card stats-table-card stats-table-card-wide">
                <table class="table align-middle">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Réponses</th>
                      <th>Temps médian</th>
                      <th>Likert</th>
                      <th>Texte libre</th>
                      <th>Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="question in visibleQuestions" :key="question.id">
                      <td style="min-width: 220px">
                        <strong>{{ question.code }}</strong>
                        <div class="small" style="color:var(--chm-muted);">{{ question.label }}</div>
                        <div class="small" style="color:var(--chm-muted);">{{ question.responseType }}</div>
                      </td>
                      <td>{{ question.answerCount ?? question.displayValue }}</td>
                      <td>
                        <span class="badge-soft" :class="{ warning: question.highMedianDuration }">
                          {{ formatDuration(question.medianDurationMs) }}
                        </span>
                      </td>
                      <td style="min-width: 240px">
                        <div v-if="question.likertDistribution" class="d-grid gap-1">
                          <div v-for="bucket in question.likertDistribution" :key="`${question.id}-${bucket.value}`" class="small">
                            <strong>{{ bucket.value }}</strong> · {{ bucket.count }} rép. · {{ bucket.rate }} %
                            <span style="color:var(--chm-muted)">{{ bucket.label }}</span>
                          </div>
                        </div>
                        <span v-else style="color:var(--chm-muted)">—</span>
                      </td>
                      <td style="min-width: 220px">
                        <div v-if="question.freeTextResponses.length" class="d-grid gap-2">
                          <blockquote v-for="response in question.freeTextResponses.slice(0, 2)" :key="`${question.id}-${response.publicCode}`" class="small border-start ps-2 mb-0">
                            <span class="badge-soft me-1">{{ response.publicCode }}</span>
                            {{ response.value }}
                            <span v-if="response.warning" class="badge-soft warning ms-1">alerte PII</span>
                          </blockquote>
                        </div>
                        <span v-else-if="question.freeTextAccess === 'forbidden'" class="badge-soft warning">permission requise</span>
                        <span v-else style="color:var(--chm-muted)">—</span>
                      </td>
                      <td>
                        <div class="d-flex flex-wrap gap-1">
                          <span class="badge-soft" :class="{ danger: question.difficultQuestion, success: question.effectifSufficient && !question.difficultQuestion, warning: !question.effectifSufficient }">
                            {{ question.difficultQuestion ? 'difficile' : question.displayValue }}
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
              <div class="stats-list-actions">
                <span class="small" style="color: var(--chm-muted);">
                  {{ visibleQuestions.length }} / {{ statsStore.stats.questions.length }} question(s) affichée(s)
                </span>
                <div class="d-flex flex-wrap gap-2">
                  <button
                    v-if="hiddenQuestionCount > 0"
                    class="btn btn-sm btn-outline-primary"
                    type="button"
                    @click="showMoreQuestions"
                  >
                    Afficher 6 de plus
                  </button>
                  <button
                    v-if="visibleQuestionCount > 6"
                    class="btn btn-sm btn-outline-secondary"
                    type="button"
                    @click="visibleQuestionCount = 6"
                  >
                    Réduire
                  </button>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>

        <div v-if="statsStore.submissionError" class="alert alert-danger rounded-3 mt-4">
          {{ statsStore.submissionError }}
        </div>

        <!-- Soumission individuelle -->
        <ModalPanel
          :model-value="Boolean(statsStore.selectedSubmission)"
          :title="statsStore.selectedSubmission ? `Détail — Code ${statsStore.selectedSubmission.publicCode}` : 'Détail de soumission'"
          eyebrow="Soumission pseudonymisée"
          description="Ouverture ponctuelle en fenêtre dédiée pour éviter un bloc massif dans le tableau de bord."
          size="xl"
          @update:model-value="closeSubmissionDetail"
          @close="closeSubmissionDetail"
        >
          <template v-if="statsStore.selectedSubmission">
            <div class="row g-3 mb-4">
              <div class="col-md-3"><strong>Bâtiment</strong><div style="color:var(--chm-muted);">{{ statsStore.selectedSubmission.building }}</div></div>
              <div class="col-md-3"><strong>Soumis le</strong><div style="color:var(--chm-muted);">{{ formatDate(statsStore.selectedSubmission.submittedAt) }}</div></div>
              <div class="col-md-3"><strong>Temps total</strong><div style="color:var(--chm-muted);">{{ formatDuration(statsStore.selectedSubmission.totalDurationMs) }}</div></div>
              <div class="col-md-3"><strong>Événements</strong><div style="color:var(--chm-muted);">{{ statsStore.selectedSubmission.telemetry.totalEvents }}</div></div>
            </div>
            <div class="table-card table-card-scroll table-card-scroll-lg">
              <table class="table align-middle">
                <thead>
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
                      <div class="small" style="color:var(--chm-muted);">{{ answer.questionLabel }}</div>
                    </td>
                    <td>{{ formatAnswer(answer.value) }}</td>
                    <td>{{ answer.warning ?? '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </ModalPanel>
          </div>
        </div>
      </template>

      <div v-if="selectedQuestionnaire && statsStore.status === 'ready'" class="small mt-4" style="color: var(--chm-muted);">
        {{ selectedQuestionnaire.code }} · {{ selectedQuestionnaire.title }}
      </div>
    </div>
  </section>
</template>
