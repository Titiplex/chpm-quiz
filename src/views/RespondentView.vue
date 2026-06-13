<script setup lang="ts">
import { computed, onMounted, reactive } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import KpiCard from '@/components/common/KpiCard.vue'
import { useRespondentSessionStore } from '@/stores/respondentSession'
import type { RespondentQuestion } from '@shared/types/api'

const route = useRoute()
const respondent = useRespondentSessionStore()
const answers = reactive<Record<string, unknown>>({})

const token = computed(() => String(route.params.token ?? ''))
const hasToken = computed(() => Boolean(token.value))
const groups = computed(() => respondent.session?.questionnaire.groups ?? [])

onMounted(async () => {
  if (hasToken.value) {
    await respondent.load(token.value)
    for (const question of respondent.questions) {
      if (question.answer) {
        answers[question.id] = question.answer.value
      }
    }
  }
})

function questionValue(question: RespondentQuestion): unknown {
  return answers[question.id] ?? question.answer?.value ?? null
}

async function save(question: RespondentQuestion, value: unknown) {
  answers[question.id] = value
  await respondent.save(question.id, value)
}

async function openPopup(question: RespondentQuestion) {
  const popup = question.popupDefinitions?.[0]
  if (!popup) return
  await respondent.telemetry({
    questionId: question.id,
    popupDefinitionId: popup.id,
    eventType: 'popup_open',
    eventPayload: {
      termKey: popup.termKey,
      language: popup.language,
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

                <div v-for="group in groups" :key="group.id" class="mb-4">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <span class="badge-soft">{{ group.title }} · {{ group.questionsPerPage }} question(s)/page</span>
                    <span v-if="group.randomize" class="badge-soft warning">ordre randomisé stable</span>
                  </div>

                  <div v-for="question in group.questions" :key="question.id" class="question-row mb-3">
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
                          v-for="n in question.likertScale.points"
                          :key="n"
                          class="likert-dot border-0"
                          :class="{ active: Number(questionValue(question)) === n }"
                          type="button"
                          :disabled="respondent.isLocked"
                          @click="save(question, n)"
                        >
                          {{ n }}
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
                </div>

                <div v-if="respondent.warnings.length" class="alert alert-warning rounded-4">
                  Une réponse libre semble contenir une donnée directement identifiante. Elle est sauvegardée mais signalée pour information.
                </div>

                <button
                  class="btn btn-primary btn-lg w-100"
                  type="button"
                  :disabled="respondent.isLocked || respondent.status === 'saving'"
                  @click="respondent.submit"
                >
                  Confirmer la soumission finale et verrouiller
                </button>
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
