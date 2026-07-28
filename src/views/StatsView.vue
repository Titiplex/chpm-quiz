<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import KpiCard from '@/components/common/KpiCard.vue'
import ModalPanel from '@/components/common/ModalPanel.vue'
import PageSectionNav from '@/components/common/PageSectionNav.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { formatDate as formatLocaleDate, formatNumber, languageText, questionTypeText, t, tp } from '@/i18n'
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

const statsSections = computed<PageSectionNavItem[]>(() => [
  { id: 'stats-overview', label: t('stats.nav.overview'), hint: t('stats.nav.overviewHint') },
  { id: 'stats-field-tracking', label: t('stats.nav.field'), hint: t('stats.nav.fieldHint') },
  { id: 'stats-segments', label: t('stats.nav.segments'), hint: t('stats.nav.segmentsHint') },
  { id: 'stats-submissions', label: t('stats.nav.submissions'), hint: t('stats.nav.submissionsHint') },
  { id: 'stats-popups', label: t('stats.nav.popups'), hint: t('stats.nav.popupsHint') },
  { id: 'stats-questions', label: t('stats.nav.questions'), hint: t('stats.nav.questionsHint') },
])

const selectedQuestionnaire = computed(
  () =>
    catalog.publishedQuestionnaires.find(
      (questionnaire) => questionnaire.id === selectedQuestionnaireId.value,
    ) ?? null,
)

const canReadSubmissions = computed(() => session.currentRole === 'analyst')
onMounted(async () => {
  await catalog.fetchCatalog()
  selectedQuestionnaireId.value = catalog.publishedQuestionnaires[0]?.id ?? ''
})

watch(
  selectedQuestionnaireId,
  async (id) => {
    if (!id) return
    await statsStore.fetchForQuestionnaire(id)
  },
  { immediate: false },
)

function formatDuration(durationMs?: number | null): string {
  if (!durationMs) return '—'
  const seconds = Math.round(durationMs / 1000)
  if (seconds < 60) return t('stats.duration.seconds', { seconds: formatNumber(seconds) })
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder
    ? t('stats.duration.minutesSeconds', { minutes: formatNumber(minutes), seconds: formatNumber(remainder) })
    : t('stats.duration.minutes', { minutes: formatNumber(minutes) })
}

function formatCount(value?: number | null): string {
  return value === null || value === undefined ? '—' : formatNumber(value)
}

function formatPercent(value?: number | null): string {
  return value === null || value === undefined ? '—' : t('stats.percent', { value: formatNumber(value) })
}

function formatDate(value?: string | Date | null): string {
  if (!value) return '—'
  return formatLocaleDate(value, { dateStyle: 'short', timeStyle: 'short' })
}

function formatAnswer(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
    return String(value)
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
        :title="t('stats.title')"
        :description="t('stats.description')"
      />
      <RoleGateInfo />

      <!-- Questionnaire selector -->
      <div class="demo-card mb-4">
        <div class="row g-3 align-items-end">
          <div class="col-lg-8">
            <label class="form-label fw-semibold" for="questionnaire-select">{{ t('common.questionnaire') }}</label>
            <select
              id="questionnaire-select"
              v-model="selectedQuestionnaireId"
              class="form-select form-select-lg"
            >
              <option
                v-for="questionnaire in catalog.publishedQuestionnaires"
                :key="questionnaire.id"
                :value="questionnaire.id"
              >
                {{ questionnaire.title }} · {{ questionnaire.versionLabel }}
              </option>
            </select>
          </div>
          <div class="col-lg-4">
            <p class="small mb-0" style="color: var(--chm-muted)">
              {{ t('stats.privacyNotice') }}
            </p>
          </div>
        </div>
      </div>

      <div v-if="statsStore.status === 'error'" class="alert alert-danger rounded-3" role="alert">
        {{ statsStore.error }}
      </div>

      <div
        v-if="statsStore.status === 'loading'"
        class="demo-card text-center py-5"
        style="color: var(--chm-muted)"
      >{{ t('stats.loading') }}</div>

      <template v-if="statsStore.stats">
        <div class="page-workspace">
          <PageSectionNav :title="t('stats.navigation')" :sections="statsSections" />
          <div class="page-workspace-main">
            <!-- Suppression-threshold information -->
            <div id="stats-overview" class="page-section d-flex align-items-center gap-2 mb-4">
              <span class="badge-soft warning">{{ t('stats.threshold', { value: statsStore.stats.threshold }) }}</span>
              <span class="small" style="color: var(--chm-muted)"
                >{{ t('stats.thresholdHelp') }}</span
              >
            </div>

            <!-- Main KPIs -->
            <div class="row g-3 mb-4">
              <div class="col-md-3">
                <KpiCard
                  :label="t('stats.kpi.invitations')"
                  :value="formatCount(statsStore.stats.totals.invited)"
                  icon="📨"
                />
              </div>
              <div class="col-md-3">
                <KpiCard
                  :label="t('stats.kpi.openingRate')"
                  :value="formatPercent(statsStore.stats.totals.openingRate)"
                  icon="📬"
                />
              </div>
              <div class="col-md-3">
                <KpiCard
                  :label="t('stats.kpi.submissionRate')"
                  :value="formatPercent(statsStore.stats.totals.submissionRate)"
                  tone="success"
                  icon="✅"
                />
              </div>
              <div class="col-md-3">
                <KpiCard
                  :label="t('stats.kpi.abandonmentRate')"
                  :value="formatPercent(statsStore.stats.totals.abandonmentRate)"
                  tone="warning"
                  icon="⚠️"
                />
              </div>
              <div class="col-md-3">
                <KpiCard
                  :label="t('stats.kpi.refusals')"
                  :value="formatCount(statsStore.stats.fieldTracking.refused)"
                  tone="danger"
                />
              </div>
              <div class="col-md-3">
                <KpiCard
                  :label="t('stats.kpi.expired')"
                  :value="formatCount(statsStore.stats.totals.expired)"
                  tone="warning"
                />
              </div>
              <div class="col-md-3">
                <KpiCard :label="t('stats.kpi.startRate')" :value="formatPercent(statsStore.stats.totals.startRate)" />
              </div>
              <div class="col-md-3">
                <KpiCard
                  :label="t('stats.kpi.medianTime')"
                  :value="formatDuration(statsStore.stats.totals.medianTotalDurationMs)"
                  icon="⏱️"
                />
              </div>
              <div class="col-md-3">
                <KpiCard
                  :label="t('stats.kpi.popupOpens')"
                  :value="formatCount(statsStore.stats.totals.popupOpens)"
                  tone="warning"
                  icon="💬"
                />
              </div>
              <div class="col-md-3">
                <KpiCard :label="t('stats.kpi.resumes')" :value="formatCount(statsStore.stats.totals.resumes)" />
              </div>
            </div>

            <div id="stats-field-tracking" class="page-section demo-card mb-4">
              <div class="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <h2 class="page-header-title mb-1" style="font-size: 1rem">{{ t('stats.field.title') }}</h2>
                  <p class="small mb-0" style="color: var(--chm-muted)">
                    {{ t('stats.field.description') }}
                  </p>
                </div>
                <span class="badge-soft warning">{{ t('stats.field.noDigitalFormula') }}</span>
              </div>
              <div class="row g-3">
                <div class="col-md-3">
                  <KpiCard
                    :label="t('stats.field.approached')"
                    :value="formatCount(statsStore.stats.fieldTracking.approached)"
                  />
                </div>
                <div class="col-md-3">
                  <KpiCard
                    :label="t('stats.field.refusals')"
                    :value="formatCount(statsStore.stats.fieldTracking.refused)"
                    tone="danger"
                  />
                </div>
                <div class="col-md-3">
                  <KpiCard
                    :label="t('stats.field.refusalRate')"
                    :value="formatPercent(statsStore.stats.fieldTracking.refusalRate)"
                    tone="warning"
                  />
                </div>
                <div class="col-md-3">
                  <KpiCard
                    :label="t('stats.field.noDigitalContact')"
                    :value="formatCount(statsStore.stats.fieldTracking.noDigitalContact)"
                    tone="warning"
                  />
                </div>
              </div>
              <div class="row g-3 mt-1">
                <div class="col-md-3">
                  <KpiCard
                    :label="t('stats.field.terminals')"
                    :value="formatCount(statsStore.stats.fieldTracking.onsiteTerminal)"
                  />
                </div>
                <div class="col-md-3">
                  <KpiCard
                    :label="t('stats.field.paper')"
                    :value="formatCount(statsStore.stats.fieldTracking.paperForms)"
                  />
                </div>
                <div class="col-md-3">
                  <KpiCard
                    :label="t('stats.field.digital')"
                    :value="formatCount(statsStore.stats.fieldTracking.digitalContact)"
                  />
                </div>
                <div class="col-md-3">
                  <KpiCard
                    :label="t('stats.field.pendingNoDigital')"
                    :value="formatCount(statsStore.stats.fieldTracking.pendingWithoutDigitalContact)"
                    tone="warning"
                  />
                </div>
              </div>
            </div>

            <div id="stats-segments" class="page-section row g-4">
              <!-- Versions -->
              <div class="col-xl-6">
                <div class="demo-card h-100">
                  <h2 class="page-header-title mb-4" style="font-size: 1rem">{{ t('stats.section.versions') }}</h2>
                  <div class="table-card table-card-scroll">
                    <table class="table align-middle">
                      <thead>
                        <tr>
                          <th>{{ t('common.version') }}</th>
                          <th>{{ t('stats.table.invited') }}</th>
                          <th>{{ t('stats.table.opened') }}</th>
                          <th>{{ t('stats.table.started') }}</th>
                          <th>{{ t('stats.table.submitted') }}</th>
                          <th>{{ t('stats.table.abandonment') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="version in statsStore.stats.versions" :key="version.id">
                          <td class="fw-semibold">{{ version.versionLabel }}</td>
                          <td>{{ formatCount(version.invited) }}</td>
                          <td>{{ formatPercent(version.openingRate) }}</td>
                          <td>{{ formatPercent(version.startRate) }}</td>
                          <td>
                            <span class="badge-soft" :class="version.effectifSufficient ? 'success' : 'warning'">
                              {{ version.effectifSufficient ? formatPercent(version.submissionRate) : version.displayValue }}
                            </span>
                          </td>
                          <td>{{ formatPercent(version.abandonmentRate) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Delivery channels -->
              <div class="col-xl-6">
                <div class="demo-card h-100">
                  <h2 class="page-header-title mb-4" style="font-size: 1rem">{{ t('stats.section.channels') }}</h2>
                  <div class="table-card table-card-scroll">
                    <table class="table align-middle">
                      <thead>
                        <tr>
                          <th>{{ t('common.channel') }}</th>
                          <th>{{ t('stats.table.invited') }}</th>
                          <th>{{ t('stats.table.opened') }}</th>
                          <th>{{ t('stats.table.started') }}</th>
                          <th>{{ t('stats.table.submitted') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="mode in statsStore.stats.deliveryModes" :key="mode.mode">
                          <td class="fw-semibold">{{ mode.label }}</td>
                          <td>{{ formatCount(mode.invited) }}</td>
                          <td>{{ formatPercent(mode.openingRate) }}</td>
                          <td>{{ formatPercent(mode.startRate) }}</td>
                          <td>
                            <span class="badge-soft" :class="mode.effectifSufficient ? 'success' : 'warning'">
                              {{ mode.effectifSufficient ? formatPercent(mode.submissionRate) : mode.displayValue }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Sites -->
              <div class="col-xl-6">
                <div class="demo-card h-100">
                  <h2 class="page-header-title mb-4" style="font-size: 1rem">{{ t('stats.section.sites') }}</h2>
                  <div class="table-card table-card-scroll">
                    <table class="table align-middle">
                      <thead>
                        <tr>
                          <th>{{ t('common.site') }}</th>
                          <th>{{ t('stats.table.invited') }}</th>
                          <th>{{ t('stats.table.opening') }}</th>
                          <th>{{ t('stats.table.start') }}</th>
                          <th>{{ t('stats.table.submission') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="site in statsStore.stats.sites ?? []" :key="site.siteId">
                          <td class="fw-semibold">{{ site.label }}</td>
                          <td>{{ formatCount(site.invited) }}</td>
                          <td>{{ formatPercent(site.openingRate) }}</td>
                          <td>{{ formatPercent(site.startRate) }}</td>
                          <td>
                            <span class="badge-soft" :class="site.effectifSufficient ? 'success' : 'warning'">
                              {{ site.effectifSufficient ? formatPercent(site.submissionRate) : site.displayValue }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Languages -->
              <div class="col-xl-6">
                <div class="demo-card h-100">
                  <h2 class="page-header-title mb-4" style="font-size: 1rem">{{ t('stats.section.languages') }}</h2>
                  <div class="table-card table-card-scroll">
                    <table class="table align-middle">
                      <thead>
                        <tr>
                          <th>{{ t('common.language') }}</th>
                          <th>{{ t('stats.section.versions') }}</th>
                          <th>{{ t('stats.table.invited') }}</th>
                          <th>{{ t('stats.table.submitted') }}</th>
                          <th>{{ t('stats.table.rate') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="language in statsStore.stats.languages ?? []"
                          :key="language.language"
                        >
                          <td class="fw-semibold">{{ languageText(language.language) }}</td>
                          <td>{{ language.versionCount }}</td>
                          <td>{{ formatCount(language.invited) }}</td>
                          <td>{{ formatCount(language.submitted) }}</td>
                          <td>
                            <span class="badge-soft" :class="language.effectifSufficient ? 'success' : 'warning'">
                              {{ language.effectifSufficient ? formatPercent(language.submissionRate) : language.displayValue }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Buildings -->
              <div class="col-xl-6">
                <div class="demo-card h-100">
                  <h2 class="page-header-title mb-4" style="font-size: 1rem">{{ t('stats.section.buildings') }}</h2>
                  <div class="table-card table-card-scroll">
                    <table class="table align-middle">
                      <thead>
                        <tr>
                          <th>{{ t('common.building') }}</th>
                          <th>{{ t('stats.table.invited') }}</th>
                          <th>{{ t('stats.table.opening') }}</th>
                          <th>{{ t('stats.table.start') }}</th>
                          <th>{{ t('stats.table.submission') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="building in statsStore.stats.buildings"
                          :key="building.buildingId"
                        >
                          <td class="fw-semibold">{{ building.label }}</td>
                          <td>{{ building.invited ?? '—' }}</td>
                          <td>
                            {{ formatPercent(building.openingRate) }}
                          </td>
                          <td>
                            {{ formatPercent(building.startRate) }}
                          </td>
                          <td>
                            <span
                              class="badge-soft"
                              :class="{
                                success: building.effectifSufficient,
                                warning: !building.effectifSufficient,
                              }"
                            >
                              {{
                                building.effectifSufficient
                                  ? formatPercent(building.submissionRate)
                                  : building.displayValue
                              }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <!-- Groups -->
              <div class="col-xl-6">
                <div class="demo-card h-100">
                  <h2 class="page-header-title mb-4" style="font-size: 1rem">{{ t('stats.section.groups') }}</h2>
                  <div class="table-card table-card-scroll">
                    <table class="table align-middle">
                      <thead>
                        <tr>
                          <th>{{ t('common.group') }}</th>
                          <th>{{ t('common.questions') }}</th>
                          <th>{{ t('stats.table.respondents') }}</th>
                          <th>{{ t('stats.kpi.medianTime') }}</th>
                          <th>{{ t('stats.nav.popups') }}</th>
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

              <!-- Pseudonymized submissions -->
              <div id="stats-submissions" class="page-section col-12">
                <CollapsibleSection
                  :title="t('stats.submissions.title')"
                  :badge="tp('stats.submissions.codes', statsStore.stats.submissions.length)"
                  :default-open="false"
                  body-class="compact"
                >
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <p class="muted mb-0">
                      {{ t('stats.submissions.description') }}
                    </p>
                    <span class="badge-soft warning">{{ t('stats.submissions.noEmail') }}</span>
                  </div>
                  <div class="table-card table-card-scroll table-card-scroll-lg stats-table-card">
                    <table class="table align-middle">
                      <thead>
                        <tr>
                          <th>{{ t('common.code') }}</th>
                          <th>{{ t('common.building') }}</th>
                          <th>{{ t('common.status') }}</th>
                          <th>{{ t('stats.table.time') }}</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="submission in statsStore.stats.submissions"
                          :key="submission.publicCode"
                        >
                          <td
                            class="fw-semibold"
                            style="font-family: monospace; font-size: 0.88rem"
                          >
                            {{ submission.publicCode }}
                          </td>
                          <td>{{ submission.building }}</td>
                          <td>
                            <span class="badge-soft success">{{ submission.status }}</span>
                          </td>
                          <td>{{ formatDuration(submission.totalDurationMs) }}</td>
                          <td>
                            <button
                              class="btn btn-sm btn-outline-primary"
                              type="button"
                              :disabled="
                                !canReadSubmissions || statsStore.submissionStatus === 'loading'
                              "
                              @click="statsStore.fetchSubmission(submission.publicCode)"
                            >{{ t('common.view') }}</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="stats-list-actions">
                    <span class="small" style="color: var(--chm-muted)">
                      {{ tp('stats.submissions.completeList', statsStore.stats.submissions.length) }}
                    </span>
                  </div>
                  <p
                    v-if="!canReadSubmissions"
                    class="small mt-3 mb-0"
                    style="color: var(--chm-muted)"
                  >{{ t('stats.submissions.aggregatesOnly') }}</p>
                </CollapsibleSection>
              </div>

              <!-- Popups -->
              <div id="stats-popups" class="page-section col-12">
                <CollapsibleSection
                  :title="t('stats.popups.title')"
                  badge-tone="warning"
                  :badge="t('stats.threshold', { value: statsStore.stats.threshold })"
                  body-class="compact"
                >
                  <div class="table-card table-card-scroll table-card-scroll-lg stats-table-card">
                    <table class="table align-middle">
                      <thead>
                        <tr>
                          <th>{{ t('stats.table.term') }}</th>
                          <th>{{ t('common.question') }}</th>
                          <th>{{ t('common.group') }}</th>
                          <th>{{ t('common.version') }}</th>
                          <th>{{ t('stats.table.opens') }}</th>
                          <th>{{ t('stats.table.respondents') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="popup in statsStore.stats.popups ?? []" :key="popup.id">
                          <td>
                            <strong>{{ popup.title }}</strong>
                            <div
                              class="small"
                              style="color: var(--chm-muted); font-family: monospace"
                            >
                              {{ popup.termKey }}
                            </div>
                          </td>
                          <td>{{ popup.questionCode }}</td>
                          <td>{{ popup.groupTitle }}</td>
                          <td>{{ popup.versionLabel }}</td>
                          <td>{{ popup.openedCount ?? popup.displayValue }}</td>
                          <td>
                            <span
                              class="badge-soft"
                              :class="{
                                success: popup.effectifSufficient,
                                warning: !popup.effectifSufficient,
                              }"
                            >
                              {{ popup.respondentCount ?? popup.displayValue }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="stats-list-actions">
                    <span class="small" style="color: var(--chm-muted)">
                      {{ t('stats.popups.completeList', { terms: formatCount(statsStore.stats.popups?.length ?? 0), opens: formatCount(statsStore.stats.totals.popupOpens) }) }}
                    </span>
                  </div>
                </CollapsibleSection>
              </div>

              <!-- Detailed questions -->
              <div id="stats-questions" class="page-section col-12">
                <CollapsibleSection
                  :title="t('stats.questions.title')"
                  badge-tone="warning"
                  :badge="t('stats.questions.popupOpens', { count: formatCount(statsStore.stats.totals.popupOpens) })"
                  :default-open="false"
                  body-class="compact"
                >
                  <div
                    class="table-card table-card-scroll table-card-scroll-lg stats-table-card stats-table-card-wide"
                  >
                    <table class="table align-middle">
                      <thead>
                        <tr>
                          <th>{{ t('common.question') }}</th>
                          <th>{{ t('stats.table.responses') }}</th>
                          <th>{{ t('stats.kpi.medianTime') }}</th>
                          <th>{{ t('stats.table.likert') }}</th>
                          <th>{{ t('stats.table.freeText') }}</th>
                          <th>{{ t('stats.table.signal') }}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="question in statsStore.stats.questions" :key="question.id">
                          <td style="min-width: 220px">
                            <strong>{{ question.code }}</strong>
                            <div class="small" style="color: var(--chm-muted)">
                              {{ question.label }}
                            </div>
                            <div class="small" style="color: var(--chm-muted)">
                              {{ questionTypeText(question.responseType) }}
                            </div>
                          </td>
                          <td>{{ question.answerCount ?? question.displayValue }}</td>
                          <td>
                            <span
                              class="badge-soft"
                              :class="{ warning: question.highMedianDuration }"
                            >
                              {{ formatDuration(question.medianDurationMs) }}
                            </span>
                          </td>
                          <td style="min-width: 240px">
                            <div v-if="question.likertDistribution" class="d-grid gap-1">
                              <div
                                v-for="bucket in question.likertDistribution"
                                :key="`${question.id}-${bucket.value}`"
                                class="small"
                              >
                                <strong>{{ bucket.value }}</strong> · {{ t('stats.questions.bucket', { count: formatCount(bucket.count), rate: formatCount(bucket.rate) }) }}
                                <span style="color: var(--chm-muted)">{{ bucket.label }}</span>
                              </div>
                            </div>
                            <span v-else style="color: var(--chm-muted)">—</span>
                          </td>
                          <td style="min-width: 220px">
                            <details
                              v-if="question.freeTextResponses.length"
                              class="free-text-response-list"
                            >
                              <summary>
                                {{ tp('stats.questions.freeTextResponses', question.freeTextResponses.length) }}
                              </summary>
                              <div class="d-grid gap-2 mt-2 content-scroll content-scroll-sm">
                                <blockquote
                                  v-for="response in question.freeTextResponses"
                                  :key="`${question.id}-${response.publicCode}-${response.value}`"
                                  class="small border-start ps-2 mb-0"
                                >
                                  <span class="badge-soft me-1">{{ response.publicCode }}</span>
                                  {{ response.value }}
                                  <span v-if="response.warning" class="badge-soft warning ms-1"
                                    >{{ t('stats.question.piiAlert') }}</span
                                  >
                                </blockquote>
                              </div>
                            </details>
                            <span
                              v-else-if="question.freeTextAccess === 'forbidden'"
                              class="badge-soft warning"
                              >{{ t('stats.question.permissionRequired') }}</span
                            >
                            <span v-else style="color: var(--chm-muted)">—</span>
                          </td>
                          <td>
                            <div class="d-flex flex-wrap gap-1">
                              <span
                                class="badge-soft"
                                :class="{
                                  danger: question.difficultQuestion,
                                  success:
                                    question.effectifSufficient && !question.difficultQuestion,
                                  warning: !question.effectifSufficient,
                                }"
                              >
                                {{
                                  question.difficultQuestion ? t('stats.questions.difficult') : question.displayValue
                                }}
                              </span>
                              <span
                                v-for="label in question.difficultyLabels"
                                :key="label"
                                class="badge-soft warning"
                              >
                                {{ label }}
                              </span>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="stats-list-actions">
                    <span class="small" style="color: var(--chm-muted)">
                      {{ t('stats.questions.completeList', { questions: formatCount(statsStore.stats.questions.length), opens: formatCount(statsStore.stats.totals.popupOpens) }) }}
                    </span>
                  </div>
                </CollapsibleSection>
              </div>
            </div>

            <div v-if="statsStore.submissionError" class="alert alert-danger rounded-3 mt-4">
              {{ statsStore.submissionError }}
            </div>

            <!-- Individual submission -->
            <ModalPanel
              :model-value="Boolean(statsStore.selectedSubmission)"
              :title="
                statsStore.selectedSubmission
                  ? t('stats.detail.titleWithCode', { code: statsStore.selectedSubmission.publicCode })
                  : t('stats.detail.title')
              "
              :eyebrow="t('stats.detail.eyebrow')"
              :description="t('stats.detail.description')"
              size="xl"
              @update:model-value="closeSubmissionDetail"
              @close="closeSubmissionDetail"
            >
              <template v-if="statsStore.selectedSubmission">
                <div class="row g-3 mb-4">
                  <div class="col-md-3">
                    <strong>{{ t('common.building') }}</strong>
                    <div style="color: var(--chm-muted)">
                      {{ statsStore.selectedSubmission.building }}
                    </div>
                  </div>
                  <div class="col-md-3">
                    <strong>{{ t('stats.detail.submittedAt') }}</strong>
                    <div style="color: var(--chm-muted)">
                      {{ formatDate(statsStore.selectedSubmission.submittedAt) }}
                    </div>
                  </div>
                  <div class="col-md-3">
                    <strong>{{ t('stats.detail.totalTime') }}</strong>
                    <div style="color: var(--chm-muted)">
                      {{ formatDuration(statsStore.selectedSubmission.totalDurationMs) }}
                    </div>
                  </div>
                  <div class="col-md-3">
                    <strong>{{ t('stats.detail.events') }}</strong>
                    <div style="color: var(--chm-muted)">
                      {{ statsStore.selectedSubmission.telemetry.totalEvents }}
                    </div>
                  </div>
                </div>
                <div class="table-card table-card-scroll table-card-scroll-lg">
                  <table class="table align-middle">
                    <thead>
                      <tr>
                        <th>{{ t('common.question') }}</th>
                        <th>{{ t('common.response') }}</th>
                        <th>{{ t('common.alert') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="answer in statsStore.selectedSubmission.answers"
                        :key="answer.questionCode"
                      >
                        <td>
                          <strong>{{ answer.questionCode }}</strong>
                          <div class="small" style="color: var(--chm-muted)">
                            {{ answer.questionLabel }}
                          </div>
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

      <div
        v-if="selectedQuestionnaire && statsStore.status === 'ready'"
        class="small mt-4"
        style="color: var(--chm-muted)"
      >
        {{ selectedQuestionnaire.code }} · {{ selectedQuestionnaire.title }}
      </div>
    </div>
  </section>
</template>
