<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import KpiCard from '@/components/common/KpiCard.vue'
import { useRespondentSessionStore } from '@/stores/respondentSession'
import type { RespondentQuestion, RespondentQuestionGroup } from '@shared/types/api'

const route = useRoute()
const respondent = useRespondentSessionStore()
const answers = reactive<Record<string, unknown>>({})

const token = computed(() => String(route.params.token ?? ''))
const hasToken = computed(() => Boolean(token.value))
const groups = computed(() => respondent.session?.questionnaire.groups ?? [])
const pageIndex = ref(0)
const pageStartedAt = ref(Date.now())

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
    for (const question of respondent.questions) {
      if (question.answer) {
        answers[question.id] = question.answer.value
      }
    }
    await recordPageTelemetry('page_view')
  }
})

onBeforeUnmount(() => {
  void recordPageTelemetry('page_leave')
})

function questionValue(question: RespondentQuestion): unknown {
  return answers[question.id] ?? question.answer?.value ?? null
}

async function save(question: RespondentQuestion, value: unknown) {
  answers[question.id] = value
  await respondent.save(question.id, value)
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

function likertValues(scale?: { points: number; minValue?: number } | null): number[] {
  if (!scale) return []

  const minValue = scale.minValue ?? 1
  return Array.from({ length: scale.points }, (_, index) => minValue + index)
}

async function previousPage(): Promise<void> {
  await recordPageTelemetry('page_change')
  pageIndex.value = Math.max(0, pageIndex.value - 1)
  pageStartedAt.value = Date.now()
  await recordPageTelemetry('page_view')
}

async function nextPage(): Promise<void> {
  await recordPageTelemetry('page_change')
  pageIndex.value = Math.min(Math.max(pages.value.length - 1, 0), pageIndex.value + 1)
  pageStartedAt.value = Date.now()
  await recordPageTelemetry('page_view')
}

async function recordPageTelemetry(eventType: string): Promise<void> {
  if (!currentPage.value || !respondent.session || respondent.isLocked) return
  await respondent.telemetry({
    eventType,
    currentPage: currentPageNumber.value,
    durationMs: Math.max(0, Date.now() - pageStartedAt.value),
    eventPayload: {
      groupId: currentPage.value.group.id,
      groupTitle: currentPage.value.group.title,
      questionIds: currentPage.value.questions.map((question) => question.id),
    },
    occurredAt: new Date().toISOString(),
  })
}

async function openPopup(question: RespondentQuestion) {
  const popup = question.popupDefinitions?.[0]
  if (!popup) return
  await respondent.telemetry({
    questionId: question.id,
    popupDefinitionId: popup.id,
    eventType: 'popup_open',
    currentPage: currentPageNumber.value,
    eventPayload: {
      termKey: popup.termKey,
      language: popup.language,
      page: currentPageNumber.value,
    },
    occurredAt: new Date().toISOString(),
  })
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
                      <button
                        v-if="question.popupDefinitions?.length"
                        class="btn btn-sm btn-outline-primary"
                        type="button"
                        @click="openPopup(question)"
                      >
                        ? Explication
                      </button>
                    </div>
                    <h2 class="h5 fw-bold">{{ question.label }}</h2>
                    <p v-if="question.helperText" class="muted">{{ question.helperText }}</p>

                    <div v-if="question.responseType === 'likert' && question.likertScale" class="mb-3">
                      <p class="small muted mb-2">
                        {{ question.likertScale.leftAnchor }} · {{ question.likertScale.rightAnchor }}
                      </p>
                      <div class="likert-scale" role="group" :aria-label="`Échelle Likert ${question.likertScale.points} points`">
                        <button
                          v-for="value in likertValues(question.likertScale)"
                          :key="value"
                          class="likert-dot border-0"
                          :class="{ active: Number(questionValue(question)) === value }"
                          type="button"
                          :disabled="respondent.isLocked"
                          @click="save(question, value)"
                        >
                          {{ value }}
                        </button>
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

                    <textarea
                      v-else-if="question.responseType === 'free_text' || question.responseType === 'free_text_long' || question.responseType === 'free_text_short'"
                      class="form-control mb-3"
                      rows="4"
                      :disabled="respondent.isLocked"
                      :value="String(questionValue(question) ?? '')"
                      @change="save(question, ($event.target as HTMLTextAreaElement).value)"
                    ></textarea>

                    <div v-if="question.popupDefinitions?.[0]" class="question-help">
                      <div class="d-flex justify-content-between gap-3">
                        <strong>{{ question.popupDefinitions[0].title }}</strong>
                        <span class="badge-soft warning">ouverture tracée</span>
                      </div>
                      <p class="small muted mb-0 mt-2">{{ question.popupDefinitions[0].body }}</p>
                    </div>
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
                      :disabled="respondent.isLocked || respondent.status === 'saving'"
                      @click="respondent.submit"
                    >
                      Confirmer la soumission finale et verrouiller
                    </button>
                  </div>
                </div>

                <div v-if="respondent.warnings.length" class="alert alert-warning rounded-4">
                  Une réponse libre semble contenir une donnée directement identifiante. Elle est sauvegardée mais signalée pour information.
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
