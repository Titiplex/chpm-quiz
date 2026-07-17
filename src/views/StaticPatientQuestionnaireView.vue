<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'

import KpiCard from '@/components/common/KpiCard.vue'
import {
  staticQuestionnaire,
  type StaticPopup,
  type StaticQuestion,
  type StaticQuestionGroup,
  type StaticQuestionOption,
} from '@/data/staticPagesDemo'

const answers = reactive<Record<string, unknown>>({})
const pageIndex = ref(0)
const consentAccepted = ref(false)
const submitted = ref(false)
const showSubmitConfirmation = ref(false)
const activePopupId = ref<string | null>(null)

type StaticPatientPage = {
  group: StaticQuestionGroup
  questions: StaticQuestion[]
}

const answerableQuestions = computed(() =>
  staticQuestionnaire.groups
    .flatMap((group) => group.questions)
    .filter((question) => question.type !== 'information'),
)
const requiredQuestions = computed(() =>
  answerableQuestions.value.filter((question) => question.isRequired),
)
const unansweredRequiredQuestions = computed(() =>
  requiredQuestions.value.filter((question) => !hasAnswerValue(questionValue(question))),
)
const answeredQuestions = computed(
  () =>
    answerableQuestions.value.filter((question) => hasAnswerValue(questionValue(question))).length,
)
const progress = computed(() => {
  if (!answerableQuestions.value.length) return 100
  return Math.round((answeredQuestions.value / answerableQuestions.value.length) * 100)
})
const canSubmit = computed(
  () => consentAccepted.value && unansweredRequiredQuestions.value.length === 0 && !submitted.value,
)
const pages = computed<StaticPatientPage[]>(() =>
  staticQuestionnaire.groups.flatMap((group) => {
    const questionsPerPage = Math.max(1, group.questionsPerPage)
    const chunks: StaticPatientPage[] = []

    for (let index = 0; index < group.questions.length; index += questionsPerPage) {
      chunks.push({
        group,
        questions: group.questions.slice(index, index + questionsPerPage),
      })
    }

    return chunks
  }),
)
const currentPage = computed(() => pages.value[pageIndex.value] ?? pages.value[0] ?? null)
const currentPageNumber = computed(() => pageIndex.value + 1)
const isFirstPage = computed(() => pageIndex.value === 0)
const isLastPage = computed(() => pageIndex.value >= pages.value.length - 1)

function questionValue(question: StaticQuestion): unknown {
  return answers[question.id] ?? null
}

function hasAnswerValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function save(question: StaticQuestion, value: unknown): void {
  if (submitted.value) return
  answers[question.id] = value
}

function likertValues(question: StaticQuestion): number[] {
  if (!question.likertScale) return []

  return Array.from(
    { length: question.likertScale.points },
    (_, index) => question.likertScale!.minValue + index,
  )
}

function likertLabel(question: StaticQuestion, value: number): string {
  return question.likertScale?.labels[value] ?? String(value)
}

function isOptionSelected(question: StaticQuestion, option: StaticQuestionOption): boolean {
  return questionValue(question) === option.value
}

function popupDomId(popup: StaticPopup): string {
  return `static-popup-${popup.id}`
}

function togglePopup(popup: StaticPopup): void {
  activePopupId.value = activePopupId.value === popup.id ? null : popup.id
}

function previousPage(): void {
  activePopupId.value = null
  pageIndex.value = Math.max(0, pageIndex.value - 1)
}

function nextPage(): void {
  activePopupId.value = null
  pageIndex.value = Math.min(pages.value.length - 1, pageIndex.value + 1)
}

function openSubmitConfirmation(): void {
  if (!canSubmit.value) return
  showSubmitConfirmation.value = true
}

function confirmSubmit(): void {
  if (!canSubmit.value) return
  submitted.value = true
  showSubmitConfirmation.value = false
}

function resetDemo(): void {
  for (const key of Object.keys(answers)) {
    delete answers[key]
  }

  pageIndex.value = 0
  consentAccepted.value = false
  submitted.value = false
  showSubmitConfirmation.value = false
  activePopupId.value = null
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <div class="hero-card p-4 p-lg-5 mb-4">
        <div class="position-relative z-1">
          <p class="hero-eyebrow mb-3">Questionnaire patient</p>
          <h1 class="hero-title fw-black mb-4">{{ staticQuestionnaire.title }}</h1>
          <p class="hero-text mb-4">
            {{ staticQuestionnaire.finality }}
          </p>
          <div class="d-flex flex-wrap gap-2 align-items-center">
            <span class="badge-soft success">Code : {{ staticQuestionnaire.publicCode }}</span>
            <span class="badge-soft"
              >Durée estimée : {{ staticQuestionnaire.estimatedDuration }}</span
            >
            <RouterLink class="btn btn-outline-primary" to="/moderation">
              Voir le point de vue modérateur
            </RouterLink>
          </div>
        </div>
      </div>

      <div class="row g-4 align-items-stretch">
        <div class="col-xl-8">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between gap-3 mb-4">
              <div>
                <p class="section-eyebrow mb-2">Questionnaire</p>
                <h2 class="h3 fw-bold mb-1">Parcours répondant sans compte</h2>
              </div>
              <button
                class="btn btn-outline-primary align-self-start"
                type="button"
                @click="resetDemo"
              >
                Réinitialiser
              </button>
            </div>

            <div class="question-help mb-4" role="note">
              <strong>Notice d’information avant démarrage</strong>
              <ul class="small muted mb-3 mt-2 ps-3">
                <li>Finalité : {{ staticQuestionnaire.finality }}</li>
                <li>
                  Confidentialité : évitez toute information directement identifiante dans les
                  champs libres.
                </li>
              </ul>
              <label class="form-check d-flex gap-2 align-items-start mb-0" for="static-consent">
                <input
                  id="static-consent"
                  v-model="consentAccepted"
                  class="form-check-input mt-1"
                  type="checkbox"
                  :disabled="submitted"
                />
                <span class="small">J’ai lu la notice d’information.</span>
              </label>
            </div>

            <div v-if="submitted" class="alert alert-success rounded-4" role="status">
              Soumission confirmée. Les réponses sont verrouillées.
            </div>

            <div
              class="progress rounded-pill mb-4"
              role="progressbar"
              :aria-valuenow="progress"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div class="progress-bar" :style="{ width: `${progress}%` }">{{ progress }} %</div>
            </div>

            <div v-if="currentPage" class="mb-4">
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <div>
                  <span class="badge-soft">
                    Page {{ currentPageNumber }} / {{ pages.length }} ·
                    {{ currentPage.group.title }}
                  </span>
                </div>
                <div class="d-flex gap-2">
                  <button
                    class="btn btn-sm btn-outline-primary"
                    type="button"
                    :disabled="isFirstPage"
                    @click="previousPage"
                  >
                    Précédent
                  </button>
                  <button
                    class="btn btn-sm btn-outline-primary"
                    type="button"
                    :disabled="isLastPage"
                    @click="nextPage"
                  >
                    Suivant
                  </button>
                </div>
              </div>
              <p class="muted mb-3">{{ currentPage.group.description }}</p>

              <div
                v-for="question in currentPage.questions"
                :key="question.id"
                class="question-row mb-3"
              >
                <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                  <span class="badge-soft">{{ question.code }} · {{ question.type }}</span>
                  <span v-if="question.isRequired" class="badge-soft warning">obligatoire</span>
                  <span v-if="question.popup" class="badge-soft warning">terme expliqué</span>
                </div>

                <h3 class="h5 fw-bold">{{ question.label }}</h3>
                <p v-if="question.helperText" class="muted">{{ question.helperText }}</p>

                <div
                  v-if="question.popup"
                  class="info-bubble-list mb-3"
                  aria-label="Terme expliqué pour cette question"
                >
                  <button
                    class="info-bubble"
                    :class="{ active: activePopupId === question.popup.id }"
                    type="button"
                    :aria-expanded="activePopupId === question.popup.id"
                    :aria-controls="popupDomId(question.popup)"
                    @click="togglePopup(question.popup)"
                  >
                    <span class="info-bubble-icon" aria-hidden="true">i</span>
                    {{ question.popup.title }}
                  </button>
                </div>

                <div
                  v-if="question.popup"
                  v-show="activePopupId === question.popup.id"
                  :id="popupDomId(question.popup)"
                  class="question-help mb-3"
                  role="note"
                >
                  <strong>{{ question.popup.title }}</strong>
                  <p class="small muted mb-0 mt-2">{{ question.popup.body }}</p>
                </div>

                <div v-if="question.type === 'likert' && question.likertScale" class="mb-3">
                  <p class="small muted mb-2">
                    {{ question.likertScale.leftAnchor }} · {{ question.likertScale.rightAnchor }}
                  </p>
                  <div
                    class="likert-scale likert-scale-labelled"
                    role="group"
                    :aria-label="`Échelle Likert ${question.likertScale.points} points`"
                  >
                    <button
                      v-for="value in likertValues(question)"
                      :key="value"
                      class="likert-dot likert-dot-labelled border-0"
                      :class="{ active: Number(questionValue(question)) === value }"
                      type="button"
                      :disabled="submitted"
                      @click="save(question, value)"
                    >
                      <span class="likert-choice-label">{{ likertLabel(question, value) }}</span>
                      <span class="likert-choice-value">{{ value }}</span>
                    </button>
                  </div>
                </div>

                <div v-else-if="question.type === 'single_choice'" class="d-grid gap-2 mb-3">
                  <button
                    v-for="option in question.options"
                    :key="option.value"
                    class="btn text-start"
                    :class="
                      isOptionSelected(question, option) ? 'btn-primary' : 'btn-outline-primary'
                    "
                    type="button"
                    :disabled="submitted"
                    @click="save(question, option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>

                <div
                  v-else-if="question.type === 'information'"
                  class="alert alert-info rounded-4 mb-3"
                >
                  Information affichée, aucune réponse attendue.
                </div>

                <div v-else-if="question.type === 'free_text_long'">
                  <textarea
                    class="form-control mb-2"
                    rows="4"
                    :disabled="submitted"
                    :value="String(questionValue(question) ?? '')"
                    @input="save(question, ($event.target as HTMLTextAreaElement).value)"
                  ></textarea>
                  <p class="small muted mb-3">
                    Champ libre local. Ne saisissez pas d’information directement identifiante.
                  </p>
                </div>
              </div>

              <div v-if="unansweredRequiredQuestions.length" class="alert alert-warning rounded-4">
                {{ unansweredRequiredQuestions.length }} question(s) obligatoire(s) restent à
                compléter.
              </div>

              <div v-if="!consentAccepted && !submitted" class="alert alert-warning rounded-4">
                La notice d’information doit être confirmée avant la soumission.
              </div>

              <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                <button
                  class="btn btn-outline-primary"
                  type="button"
                  :disabled="isFirstPage"
                  @click="previousPage"
                >
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

              <div
                v-if="showSubmitConfirmation"
                class="question-help mt-4"
                role="alertdialog"
                aria-modal="false"
                aria-labelledby="static-submit-confirm-title"
              >
                <h2 id="static-submit-confirm-title" class="h5 fw-bold">
                  Confirmer la soumission locale
                </h2>
                <p class="muted">
                  Après confirmation, les réponses ne pourront plus être modifiées.
                </p>
                <div class="d-flex flex-wrap gap-2">
                  <button class="btn btn-primary" type="button" @click="confirmSubmit">
                    Je confirme et je verrouille mes réponses
                  </button>
                  <button
                    class="btn btn-outline-primary"
                    type="button"
                    @click="showSubmitConfirmation = false"
                  >
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
              <h2 class="h5 fw-bold">État local</h2>
              <div class="row g-3">
                <div class="col-6">
                  <KpiCard :value="submitted ? 'verrouillée' : 'brouillon'" label="Statut" />
                </div>
                <div class="col-6">
                  <KpiCard :value="`${progress} %`" label="Progression" />
                </div>
              </div>
              <p class="small muted mb-0 mt-3">
                Bâtiment : {{ staticQuestionnaire.buildingLabel }}. Version :
                {{ staticQuestionnaire.versionLabel }}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
