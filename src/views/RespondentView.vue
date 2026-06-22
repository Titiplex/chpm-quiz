<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import KpiCard from '@/components/common/KpiCard.vue'
import { useRespondentSessionStore } from '@/stores/respondentSession'
import type { ApiPopupDefinition, RespondentQuestion, RespondentQuestionGroup } from '@shared/types/api'

const route = useRoute()
const respondent = useRespondentSessionStore()
const answers = reactive<Record<string, unknown>>({})
const textAutosaveTimers = new Map<string, number>()
const pendingTextQuestionIds = new Set<string>()
const questionStartedAt = new Map<string, number>()


const token = computed(() => String(route.params.token ?? ''))
const hasToken = computed(() => Boolean(token.value))
const groups = computed(() => respondent.session?.questionnaire.groups ?? [])
const pageIndex = ref(0)
const pageStartedAt = ref(Date.now())
const activePopup = ref<{ questionId: string; popupDefinitionId: string; termKey: string; language: string; openedAt: number } | null>(null)
const showSubmitConfirmation = ref(false)
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)
const consentAccepted = ref(false)
const sessionStartedAtMs = ref(Date.now())

const textAutosaveDelayMs = 650

type RespondentPage = {
  group: RespondentQuestionGroup
  questions: RespondentQuestion[]
}

const pages = computed<RespondentPage[]>(() =>
  groups.value.flatMap((group) => {
    const questionsPerPage = Math.max(1, group.questionsPerPage || group.questions.length || 1)
    const chunks: RespondentPage[] = []

    for (let index = 0; index < group.questions.length; index += questionsPerPage) {
      chunks.push({
        group,
        questions: group.questions.slice(index, index + questionsPerPage),
      })
    }

    return chunks
  }),
)

const currentPage = computed(() => pages.value[Math.min(pageIndex.value, Math.max(pages.value.length - 1, 0))] ?? null)
const currentPageNumber = computed(() => (pages.value.length ? pageIndex.value + 1 : 0))
const isFirstPage = computed(() => pageIndex.value <= 0)
const isLastPage = computed(() => pageIndex.value >= pages.value.length - 1)
const unansweredRequiredQuestions = computed(() =>
  respondent.questions.filter((question) => question.isRequired && !hasAnswerValue(questionValue(question))),
)
const missingConsent = computed(() => !respondent.isLocked && !consentAccepted.value)
const canSubmit = computed(() => !respondent.isLocked && consentAccepted.value && unansweredRequiredQuestions.value.length === 0 && respondent.status !== 'saving')

watch(
  pages,
  (availablePages) => {
    if (!availablePages.length) {
      pageIndex.value = 0
      return
    }

    if (pageIndex.value > availablePages.length - 1) {
      pageIndex.value = availablePages.length - 1
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (hasToken.value) {
    await respondent.load(token.value)
    pageIndex.value = Math.max(0, (respondent.session?.responseSession.currentPage ?? 1) - 1)
    hydrateLocalAnswers()
    sessionStartedAtMs.value = Date.parse(String(respondent.session?.responseSession.startedAt ?? '')) || Date.now()
    startQuestionTimers()
    await recordLifecycleTelemetry()
    await recordPageTelemetry('page_view')
  }
})

onBeforeUnmount(() => {
  void flushPendingAutosaves()
  void closeActivePopup('popup_close')
  void recordQuestionTelemetry('question_time')
  void recordPageTelemetry('page_leave')
  void recordAbandonTelemetry()
  clearAutosaveTimers()
})

function hydrateLocalAnswers(): void {
  for (const question of respondent.questions) {
    if (question.answer) {
      answers[question.id] = question.answer.value
    }
  }
}

function questionValue(question: RespondentQuestion): unknown {
  return answers[question.id] ?? question.answer?.value ?? null
}

function hasAnswerValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

async function save(question: RespondentQuestion, value: unknown) {
  const previous = questionValue(question)
  answers[question.id] = value

  if (!areValuesEqual(previous, value)) {
    await respondent.telemetry({
      questionId: question.id,
      eventType: 'answer_change',
      currentPage: currentPageNumber.value,
      eventPayload: {
        questionCode: question.code,
        previousShape: valueShape(previous),
        nextShape: valueShape(value),
        page: currentPageNumber.value,
      },
      occurredAt: new Date().toISOString(),
    })
  }

  await respondent.save(question.id, value)
  hydrateLocalAnswers()
  startQuestionTimers()
}

function queueTextAutosave(question: RespondentQuestion, value: string): void {
  answers[question.id] = value
  pendingTextQuestionIds.add(question.id)

  const existingTimer = textAutosaveTimers.get(question.id)
  if (existingTimer) {
    window.clearTimeout(existingTimer)
  }

  const timer = window.setTimeout(() => {
    void flushQuestionAutosave(question)
  }, textAutosaveDelayMs)

  textAutosaveTimers.set(question.id, timer)
}

async function flushQuestionAutosave(question: RespondentQuestion): Promise<void> {
  const timer = textAutosaveTimers.get(question.id)
  if (timer) {
    window.clearTimeout(timer)
    textAutosaveTimers.delete(question.id)
  }

  if (!pendingTextQuestionIds.has(question.id) || respondent.isLocked) return

  pendingTextQuestionIds.delete(question.id)
  const previous = question.answer?.value ?? null
  const next = answers[question.id] ?? ''

  if (!areValuesEqual(previous, next)) {
    await respondent.telemetry({
      questionId: question.id,
      eventType: 'answer_change',
      currentPage: currentPageNumber.value,
      eventPayload: {
        questionCode: question.code,
        previousShape: valueShape(previous),
        nextShape: valueShape(next),
        page: currentPageNumber.value,
      },
      occurredAt: new Date().toISOString(),
    })
  }

  await respondent.save(question.id, next)
  hydrateLocalAnswers()
  startQuestionTimers()
}

async function flushPendingAutosaves(): Promise<void> {
  const pendingQuestions = respondent.questions.filter((question) => pendingTextQuestionIds.has(question.id))
  for (const question of pendingQuestions) {
    await flushQuestionAutosave(question)
  }
}

function clearAutosaveTimers(): void {
  for (const timer of textAutosaveTimers.values()) {
    window.clearTimeout(timer)
  }
  textAutosaveTimers.clear()
}

function isOptionSelected(question: RespondentQuestion, value: string): boolean {
  const current = questionValue(question)
  return Array.isArray(current) && current.includes(value)
}

async function toggleMultipleChoice(question: RespondentQuestion, value: string): Promise<void> {
  const currentValue = questionValue(question)
  const current = Array.isArray(currentValue) ? [...currentValue] : []
  const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
  await save(question, next)
}

type LikertScaleForDisplay = {
  points: number
  minValue?: number
  leftAnchor?: string | null
  rightAnchor?: string | null
  neutralLabel?: string | null
}

function likertValues(scale?: LikertScaleForDisplay | null): number[] {
  if (!scale) return []

  const minValue = scale.minValue ?? 1
  return Array.from({ length: scale.points }, (_, index) => minValue + index)
}

function likertLabel(scale: LikertScaleForDisplay, value: number): string {
  const values = likertValues(scale)
  const index = values.indexOf(value)
  const lastIndex = values.length - 1
  const neutralIndex = Math.floor(lastIndex / 2)

  if (index <= 0) return scale.leftAnchor || `Valeur ${value}`
  if (index === lastIndex) return scale.rightAnchor || `Valeur ${value}`
  if (scale.neutralLabel && index === neutralIndex) return scale.neutralLabel

  return index < neutralIndex
    ? `Vers « ${scale.leftAnchor || 'le minimum'} »`
    : `Vers « ${scale.rightAnchor || 'le maximum'} »`
}

async function previousPage(): Promise<void> {
  await flushPendingAutosaves()
  await closeActivePopup('popup_close')
  await recordQuestionTelemetry('question_time')
  await recordPageTelemetry('page_change', { direction: 'backward' })
  await respondent.telemetry({
    eventType: 'backward_navigation',
    currentPage: currentPageNumber.value,
    eventPayload: { fromPage: currentPageNumber.value, toPage: Math.max(1, currentPageNumber.value - 1) },
    occurredAt: new Date().toISOString(),
  })
  pageIndex.value = Math.max(0, pageIndex.value - 1)
  pageStartedAt.value = Date.now()
  startQuestionTimers()
  await recordPageTelemetry('page_view')
}

async function nextPage(): Promise<void> {
  await flushPendingAutosaves()
  await closeActivePopup('popup_close')
  await recordQuestionTelemetry('question_time')
  await recordPageTelemetry('page_change', { direction: 'forward' })
  pageIndex.value = Math.min(Math.max(pages.value.length - 1, 0), pageIndex.value + 1)
  pageStartedAt.value = Date.now()
  startQuestionTimers()
  await recordPageTelemetry('page_view')
}

async function recordPageTelemetry(eventType: string, extraPayload: Record<string, unknown> = {}): Promise<void> {
  if (!currentPage.value || !respondent.session || respondent.isLocked) return
  await respondent.telemetry({
    eventType,
    currentPage: currentPageNumber.value,
    durationMs: Math.max(0, Date.now() - pageStartedAt.value),
    eventPayload: {
      groupId: currentPage.value.group.id,
      groupTitle: currentPage.value.group.title,
      questionIds: currentPage.value.questions.map((question) => question.id),
      ...extraPayload,
    },
    occurredAt: new Date().toISOString(),
  })
}

async function recordLifecycleTelemetry(): Promise<void> {
  if (!respondent.session || respondent.isLocked) return

  const hasDraft = respondent.answeredCount > 0 || (respondent.session.responseSession.currentPage ?? 1) > 1
  await respondent.telemetry({
    eventType: hasDraft ? 'questionnaire_resume' : 'questionnaire_start',
    currentPage: currentPageNumber.value || 1,
    eventPayload: {
      publicCode: respondent.session.responseSession.publicCode,
      answeredCount: respondent.answeredCount,
      restoredPage: respondent.session.responseSession.currentPage,
    },
    occurredAt: new Date().toISOString(),
  })
}

async function recordAbandonTelemetry(): Promise<void> {
  if (!respondent.session || respondent.isLocked || respondent.status === 'submitted') return

  await respondent.telemetry({
    eventType: 'questionnaire_abandon',
    currentPage: currentPageNumber.value || 1,
    durationMs: Math.max(0, Date.now() - sessionStartedAtMs.value),
    eventPayload: { page: currentPageNumber.value, answeredCount: respondent.answeredCount },
    occurredAt: new Date().toISOString(),
  })
}

function startQuestionTimers(): void {
  questionStartedAt.clear()
  const now = Date.now()

  for (const question of currentPage.value?.questions ?? []) {
    questionStartedAt.set(question.id, now)
  }
}

async function recordQuestionTelemetry(eventType: 'question_time'): Promise<void> {
  if (!currentPage.value || respondent.isLocked) return

  const now = Date.now()
  const questions = currentPage.value.questions

  for (const question of questions) {
    const startedAt = questionStartedAt.get(question.id) ?? pageStartedAt.value
    await respondent.telemetry({
      questionId: question.id,
      eventType,
      currentPage: currentPageNumber.value,
      durationMs: Math.max(0, now - startedAt),
      eventPayload: {
        questionCode: question.code,
        groupId: currentPage.value.group.id,
        page: currentPageNumber.value,
      },
      occurredAt: new Date().toISOString(),
    })
  }

  startQuestionTimers()
}

function areValuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null)
}

function valueShape(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'empty'
  if (Array.isArray(value)) return `array:${value.length}`
  return typeof value
}

function popupDomId(popup: ApiPopupDefinition): string {
  return `popup-${popup.id}`
}

function isPopupActive(popup: ApiPopupDefinition): boolean {
  return activePopup.value?.popupDefinitionId === popup.id
}

async function togglePopup(question: RespondentQuestion, popup: ApiPopupDefinition): Promise<void> {
  if (isPopupActive(popup)) {
    await closeActivePopup('popup_close')
    return
  }

  await closeActivePopup('popup_switch')
  activePopup.value = {
    questionId: question.id,
    popupDefinitionId: popup.id,
    termKey: popup.termKey,
    language: popup.language,
    openedAt: Date.now(),
  }

  await respondent.telemetry({
    questionId: question.id,
    popupDefinitionId: popup.id,
    eventType: 'popup_open',
    currentPage: currentPageNumber.value,
    eventPayload: {
      termKey: popup.termKey,
      title: popup.title,
      language: popup.language,
      page: currentPageNumber.value,
    },
    occurredAt: new Date().toISOString(),
  })
}

async function closeActivePopup(eventType: 'popup_close' | 'popup_switch'): Promise<void> {
  if (!activePopup.value) return

  const popup = activePopup.value
  activePopup.value = null

  await respondent.telemetry({
    questionId: popup.questionId,
    popupDefinitionId: popup.popupDefinitionId,
    eventType,
    currentPage: currentPageNumber.value,
    durationMs: Math.max(0, Date.now() - popup.openedAt),
    eventPayload: {
      termKey: popup.termKey,
      language: popup.language,
      page: currentPageNumber.value,
    },
    occurredAt: new Date().toISOString(),
  })
}

async function openSubmitConfirmation(): Promise<void> {
  submitError.value = null
  if (missingConsent.value) {
    submitError.value = 'Merci de confirmer la notice d’information RGPD avant la soumission définitive.'
    return
  }
  await flushPendingAutosaves()
  await recordQuestionTelemetry('question_time')
  showSubmitConfirmation.value = true
}

async function confirmSubmit(): Promise<void> {
  if (!canSubmit.value) return

  isSubmitting.value = true
  submitError.value = null

  try {
    await flushPendingAutosaves()
    await closeActivePopup('popup_close')
    await recordQuestionTelemetry('question_time')
    await respondent.telemetry({
      eventType: 'questionnaire_total_time',
      currentPage: currentPageNumber.value,
      durationMs: Math.max(0, Date.now() - sessionStartedAtMs.value),
      eventPayload: { pageCount: pages.value.length, answeredCount: respondent.answeredCount },
      occurredAt: new Date().toISOString(),
    })
    await respondent.submit()
    showSubmitConfirmation.value = false
  } catch (caught) {
    submitError.value = caught instanceof Error ? caught.message : 'Soumission impossible.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <div v-if="!hasToken" class="hero-card p-4 p-lg-5 mb-4">
        <p class="hero-eyebrow mb-3">Parcours répondant</p>
        <h1 class="hero-title fw-black mb-4">Le répondant n’a plus de compte interne.</h1>
        <p class="hero-text mb-4">
          Le CDC impose un accès par lien signé et code public. Crée une invitation dans l’espace Modération : le backend génèrera un lien `/r/&lt;token&gt;` qui ouvrira cette page en mode répondant réel.
        </p>
        <RouterLink class="btn btn-primary btn-lg" to="/moderation">
          Créer une invitation de test
        </RouterLink>
      </div>

      <div v-else>
        <div v-if="respondent.status === 'loading'" class="alert alert-info rounded-4">
          Chargement de la session répondant…
        </div>
        <div v-else-if="respondent.status === 'error'" class="alert alert-danger rounded-4" role="alert">
          {{ respondent.error }}
        </div>
        <template v-else-if="respondent.session">
          <div class="row g-4 align-items-stretch">
            <div class="col-xl-8">
              <div class="demo-card h-100">
                <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
                  <div>
                    <p class="section-eyebrow mb-2">Vue répondant par jeton signé</p>
                    <h1 class="h2 fw-bold mb-1">{{ respondent.session.questionnaire.title }}</h1>
                    <p class="muted mb-0">
                      {{ respondent.session.questionnaire.finality }} La sauvegarde reste possible tant que la soumission finale n’a pas été confirmée.
                    </p>
                  </div>
                  <span class="badge-soft success align-self-start">Code : {{ respondent.session.responseSession.publicCode }}</span>
                </div>

                <div class="question-help mb-4" role="note">
                  <strong>Notice d’information avant démarrage</strong>
                  <ul class="small muted mb-3 mt-2 ps-3">
                    <li>Finalité : compréhension du questionnaire et amélioration des formulations métier.</li>
                    <li>Durée estimée : quelques minutes, avec reprise possible depuis le même lien tant que la soumission finale n’est pas faite.</li>
                    <li>Confidentialité : les réponses sont rattachées au code public ; l’email est conservé séparément dans la base identité.</li>
                    <li>Droits et contact : contactez le responsable de traitement ou le DPO indiqué par l’organisation pour toute demande RGPD.</li>
                  </ul>
                  <label class="form-check d-flex gap-2 align-items-start mb-0" for="respondent-consent">
                    <input
                      id="respondent-consent"
                      v-model="consentAccepted"
                      class="form-check-input mt-1"
                      type="checkbox"
                      :disabled="respondent.isLocked"
                    />
                    <span class="small">J’ai lu la notice d’information et je comprends que la soumission finale verrouille mes réponses pseudonymisées.</span>
                  </label>
                </div>

                <div v-if="respondent.isLocked" class="alert alert-success rounded-4">
                  Soumission finale reçue et verrouillée. Une deuxième soumission est impossible.
                </div>

                <div class="progress rounded-pill mb-4" role="progressbar" :aria-valuenow="respondent.progress" aria-valuemin="0" aria-valuemax="100">
                  <div class="progress-bar" :style="{ width: `${respondent.progress}%` }">
                    {{ respondent.progress }} %
                  </div>
                </div>

                <div v-if="currentPage" class="mb-4">
                  <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div>
                      <span class="badge-soft">
                        Page {{ currentPageNumber }} / {{ pages.length }} ·
                        {{ currentPage.group.title }} ·
                        {{ currentPage.group.questionsPerPage }} question(s)/page
                      </span>
                      <span v-if="currentPage.group.randomize" class="badge-soft warning ms-2">ordre randomisé stable</span>
                    </div>
                    <div class="d-flex gap-2">
                      <button class="btn btn-sm btn-outline-primary" type="button" :disabled="isFirstPage" @click="previousPage">
                        Précédent
                      </button>
                      <button class="btn btn-sm btn-outline-primary" type="button" :disabled="isLastPage" @click="nextPage">
                        Suivant
                      </button>
                    </div>
                  </div>
                  <p v-if="currentPage.group.description" class="muted mb-3">{{ currentPage.group.description }}</p>

                  <div v-for="question in currentPage.questions" :key="question.id" class="question-row mb-3">
                    <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                      <span class="badge-soft">{{ question.code }} · {{ question.responseType }}</span>
                      <span v-if="question.isRequired" class="badge-soft warning">obligatoire</span>
                      <span v-if="question.popupDefinitions?.length" class="badge-soft warning">
                        {{ question.popupDefinitions.length }} terme(s) expliqué(s)
                      </span>
                    </div>
                    <h2 class="h5 fw-bold">{{ question.label }}</h2>
                    <p v-if="question.helperText" class="muted">{{ question.helperText }}</p>

                    <div v-if="question.popupDefinitions?.length" class="info-bubble-list mb-3" aria-label="Termes expliqués pour cette question">
                      <button
                        v-for="popup in question.popupDefinitions"
                        :key="popup.id"
                        class="info-bubble"
                        :class="{ active: isPopupActive(popup) }"
                        type="button"
                        :aria-expanded="isPopupActive(popup)"
                        :aria-controls="popupDomId(popup)"
                        @click="togglePopup(question, popup)"
                      >
                        <span class="info-bubble-icon" aria-hidden="true">i</span>
                        {{ popup.title }}
                      </button>
                    </div>

                    <div
                      v-for="popup in question.popupDefinitions ?? []"
                      v-show="isPopupActive(popup)"
                      :id="popupDomId(popup)"
                      :key="popup.id"
                      class="question-help mb-3"
                      role="note"
                    >
                      <div class="d-flex flex-wrap justify-content-between gap-3">
                        <strong>{{ popup.title }}</strong>
                        <span class="badge-soft warning">ouverture tracée</span>
                      </div>
                      <p class="small muted mb-0 mt-2">{{ popup.body }}</p>
                    </div>

                    <div v-if="question.responseType === 'likert' && question.likertScale" class="mb-3">
                      <p class="small muted mb-2">
                        {{ question.likertScale.leftAnchor }} · {{ question.likertScale.rightAnchor }}
                      </p>
                      <div class="likert-scale" role="group" :aria-label="`Échelle Likert ${question.likertScale.points} points`">
                        <div v-for="value in likertValues(question.likertScale)" :key="value" class="likert-choice">
                          <span class="likert-choice-label">{{ likertLabel(question.likertScale, value) }}</span>
                          <button
                            class="likert-dot border-0"
                            :class="{ active: Number(questionValue(question)) === value }"
                            type="button"
                            :aria-label="`${likertLabel(question.likertScale, value)} — valeur ${value}`"
                            :disabled="respondent.isLocked"
                            @click="save(question, value)"
                          >
                            {{ value }}
                          </button>
                        </div>
                        <div v-if="question.likertScale.allowNotApplicable" class="likert-choice">
                          <span class="likert-choice-label">Sans objet</span>
                          <button
                            class="btn btn-sm likert-extra-button"
                            :class="questionValue(question) === 'not_applicable' ? 'btn-primary' : 'btn-outline-primary'"
                            type="button"
                            :disabled="respondent.isLocked"
                            @click="save(question, 'not_applicable')"
                          >
                            Non applicable
                          </button>
                        </div>
                      </div>
                    </div>

                    <div v-else-if="question.responseType === 'single_choice'" class="d-grid gap-2 mb-3">
                      <button
                        v-for="option in question.options"
                        :key="option.id"
                        class="btn text-start"
                        :class="questionValue(question) === option.value ? 'btn-primary' : 'btn-outline-primary'"
                        type="button"
                        :disabled="respondent.isLocked"
                        @click="save(question, option.value)"
                      >
                        {{ option.label }}
                      </button>
                    </div>

                    <div v-else-if="question.responseType === 'multiple_choice'" class="d-grid gap-2 mb-3">
                      <button
                        v-for="option in question.options"
                        :key="option.id"
                        class="btn text-start"
                        :class="isOptionSelected(question, option.value) ? 'btn-primary' : 'btn-outline-primary'"
                        type="button"
                        :disabled="respondent.isLocked"
                        @click="toggleMultipleChoice(question, option.value)"
                      >
                        {{ option.label }}
                      </button>
                    </div>

                    <input
                      v-else-if="question.responseType === 'number'"
                      class="form-control mb-3"
                      type="number"
                      :disabled="respondent.isLocked"
                      :value="String(questionValue(question) ?? '')"
                      @change="save(question, Number(($event.target as HTMLInputElement).value))"
                    />

                    <input
                      v-else-if="question.responseType === 'date'"
                      class="form-control mb-3"
                      type="date"
                      :disabled="respondent.isLocked"
                      :value="String(questionValue(question) ?? '')"
                      @change="save(question, ($event.target as HTMLInputElement).value)"
                    />

                    <div v-else-if="question.responseType === 'information'" class="alert alert-info rounded-4 mb-3">
                      Information affichée, aucune réponse attendue.
                    </div>

                    <div v-else-if="question.responseType === 'free_text' || question.responseType === 'free_text_long' || question.responseType === 'free_text_short'">
                      <textarea
                        class="form-control mb-2"
                        rows="4"
                        :disabled="respondent.isLocked"
                        :value="String(questionValue(question) ?? '')"
                        @input="queueTextAutosave(question, ($event.target as HTMLTextAreaElement).value)"
                        @blur="flushQuestionAutosave(question)"
                      ></textarea>
                      <p class="small muted mb-3">
                        Sauvegarde automatique après saisie. Évitez les noms, emails, téléphones et détails directement identifiants.
                      </p>
                    </div>
                  </div>

                  <div v-if="unansweredRequiredQuestions.length" class="alert alert-warning rounded-4">
                    {{ unansweredRequiredQuestions.length }} question(s) obligatoire(s) doivent encore recevoir une réponse avant soumission finale.
                  </div>

                  <div v-if="missingConsent" class="alert alert-warning rounded-4">
                    La notice d’information RGPD doit être confirmée avant la soumission finale.
                  </div>

                  <div v-if="respondent.warnings.length" class="alert alert-warning rounded-4">
                    Une réponse libre semble contenir une donnée directement identifiante. Elle est sauvegardée mais signalée pour information.
                  </div>

                  <div v-if="submitError" class="alert alert-danger rounded-4" role="alert">
                    {{ submitError }}
                  </div>

                  <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                    <button class="btn btn-outline-primary" type="button" :disabled="isFirstPage" @click="previousPage">
                      Précédent
                    </button>
                    <button v-if="!isLastPage" class="btn btn-primary" type="button" @click="nextPage">
                      Question suivante
                    </button>
                    <button
                      v-else
                      class="btn btn-primary"
                      type="button"
                      :disabled="!canSubmit"
                      @click="openSubmitConfirmation"
                    >
                      Préparer la soumission finale
                    </button>
                  </div>

                  <div v-if="showSubmitConfirmation" class="question-help mt-4" role="alertdialog" aria-modal="false" aria-labelledby="submit-confirm-title">
                    <h2 id="submit-confirm-title" class="h5 fw-bold">Confirmer la soumission définitive</h2>
                    <p class="muted">
                      Après confirmation, la session sera verrouillée : tu pourras consulter l’accusé de réception, mais tu ne pourras plus modifier ni soumettre une deuxième fois.
                    </p>
                    <div class="d-flex flex-wrap gap-2">
                      <button class="btn btn-primary" type="button" :disabled="isSubmitting" @click="confirmSubmit">
                        {{ isSubmitting ? 'Soumission…' : 'Je confirme et je verrouille mes réponses' }}
                      </button>
                      <button class="btn btn-outline-primary" type="button" :disabled="isSubmitting" @click="showSubmitConfirmation = false">
                        Revenir au questionnaire
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-xl-4">
              <div class="d-grid gap-4">
                <div class="demo-card">
                  <p class="section-eyebrow mb-2">Session</p>
                  <h2 class="h5 fw-bold">État de passation</h2>
                  <div class="row g-3">
                    <div class="col-6">
                      <KpiCard label="Statut" :value="respondent.session.responseSession.status" />
                    </div>
                    <div class="col-6">
                      <KpiCard label="Progression" :value="`${respondent.progress} %`" />
                    </div>
                  </div>
                  <p class="small muted mb-0 mt-3">
                    Bâtiment : {{ respondent.session.invitation.building.label }}. Expiration : {{ new Date(respondent.session.invitation.expiresAt).toLocaleDateString() }}.
                  </p>
                </div>

                <div class="demo-card">
                  <p class="section-eyebrow mb-2">Confidentialité</p>
                  <h2 class="h5 fw-bold">Pseudonymisation</h2>
                  <p class="muted mb-0">
                    Les réponses sont rattachées au code public, pas à l’email. La correspondance email-code est isolée et inaccessible depuis cette interface.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
