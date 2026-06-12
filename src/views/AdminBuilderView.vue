<script setup lang="ts">
import { computed, onMounted } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'

const catalog = useCatalogStore()

onMounted(() => {
  void catalog.fetchCatalog()
})

const selectedQuestionnaire = computed(() => catalog.questionnaires[0] ?? null)
const groups = computed(
  () =>
    selectedQuestionnaire.value?.groups.map((group, index) => ({
      name: group.title,
      count: group.questions.length,
      mode: group.randomize ? 'Mélange aléatoire' : 'Ordre fixe',
      active: index === 0,
    })) ?? [],
)
const questions = computed(
  () => selectedQuestionnaire.value?.groups.flatMap((group) => group.questions) ?? [],
)
const questionCount = computed(() => selectedQuestionnaire.value?.questionCount ?? 0)
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Administrateur non-informaticien"
        title="Constructeur visuel de questionnaire"
        description="L’administration est maintenant alimentée par l’API : questionnaires, groupes, questions et bâtiments proviennent de PostgreSQL."
      >
        <template #actions>
          <button class="btn btn-outline-primary">Aperçu répondant</button>
          <button class="btn btn-primary">
            Publier
            {{
              selectedQuestionnaire
                ? `${selectedQuestionnaire.title} v${selectedQuestionnaire.version}`
                : 'la version'
            }}
          </button>
        </template>
      </PageHeader>
      <RoleGateInfo class="mb-4" />

      <div v-if="catalog.status === 'error'" class="alert alert-danger rounded-4" role="alert">
        {{ catalog.error }}
      </div>
      <div v-else class="alert alert-success rounded-4" role="status">
        Données PostgreSQL chargées via l’API NestJS : {{ catalog.buildings.length }} bâtiment(s),
        {{ catalog.questionnaires.length }} questionnaire(s).
      </div>

      <div class="row g-4">
        <div class="col-xl-3">
          <aside class="builder-sidebar p-3 h-100">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h2 class="h5 fw-bold mb-0">Structure</h2>
              <span class="badge-soft">{{ questionCount }} questions</span>
            </div>
            <div class="d-grid gap-2 mb-4">
              <div
                v-for="group in groups"
                :key="group.name"
                class="builder-menu-item"
                :class="{ active: group.active }"
              >
                <span>{{ group.name }}</span>
                <small>{{ group.count }}</small>
              </div>
            </div>

            <label class="form-label fw-bold">Questionnaire en base</label>
            <select class="form-select mb-3" aria-label="Questionnaire en base">
              <option v-for="questionnaire in catalog.questionnaires" :key="questionnaire.id">
                {{ questionnaire.title }} · v{{ questionnaire.version }} ·
                {{ questionnaire.isPublished ? 'publié' : 'brouillon' }}
              </option>
            </select>

            <label class="form-label fw-bold">Questions par page</label>
            <select class="form-select mb-3" aria-label="Nombre de questions par page">
              <option>1 question par page</option>
              <option selected>3 questions par page</option>
              <option>5 questions par page</option>
              <option>Personnalisé par groupe</option>
            </select>

            <div class="form-check form-switch mb-2">
              <input id="randomize" class="form-check-input" type="checkbox" checked />
              <label class="form-check-label fw-semibold" for="randomize"
                >Mélange aléatoire par groupe</label
              >
            </div>
            <div class="form-check form-switch mb-4">
              <input id="adaptive" class="form-check-input" type="checkbox" checked />
              <label class="form-check-label fw-semibold" for="adaptive"
                >Parcours adaptatif actif</label
              >
            </div>

            <button class="btn btn-outline-primary w-100">+ Ajouter un groupe</button>
          </aside>
        </div>

        <div class="col-xl-6">
          <div class="demo-card h-100">
            <div class="screen-preview">
              <div class="screen-topbar">
                <span class="window-dot"></span>
                <span class="window-dot"></span>
                <span class="window-dot"></span>
                <strong class="ms-2 small muted">Éditeur de questions connecté</strong>
              </div>
              <div class="p-3 p-lg-4">
                <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                  <div>
                    <p class="section-eyebrow mb-1">
                      {{
                        selectedQuestionnaire
                          ? `${selectedQuestionnaire.code} · v${selectedQuestionnaire.version}`
                          : 'Chargement'
                      }}
                    </p>
                    <h2 class="h4 fw-bold mb-0">Questions configurées</h2>
                  </div>
                  <button class="btn btn-primary">+ Nouvelle question</button>
                </div>

                <p v-if="catalog.status === 'loading'" class="muted">Chargement des questions…</p>
                <div v-for="question in questions" :key="question.code" class="question-row">
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <span class="badge-soft">{{ question.code }}</span>
                    <span class="badge-soft success"
                      >{{ question.type }} · {{ question.answerScaleLabel }}</span
                    >
                  </div>
                  <h3 class="h6 fw-bold">{{ question.title }}</h3>
                  <p class="small muted mb-3">{{ question.helperText }}</p>
                  <div class="row g-2">
                    <div class="col-md-4">
                      <select class="form-select form-select-sm" aria-label="Type de réponse">
                        <option>{{ question.type }}</option>
                        <option>free_text</option>
                        <option>likert</option>
                      </select>
                    </div>
                    <div class="col-md-4">
                      <select class="form-select form-select-sm" aria-label="Points Likert">
                        <option>{{ question.answerScaleLabel }}</option>
                        <option>Likert 5 points</option>
                        <option>Likert 7 points</option>
                        <option>Likert 10 points</option>
                      </select>
                    </div>
                    <div class="col-md-4">
                      <button class="btn btn-sm btn-outline-primary w-100">Éditer popup</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-3">
          <div class="d-grid gap-4">
            <div class="demo-card flat">
              <p class="section-eyebrow mb-2">Bâtiments PostgreSQL</p>
              <h2 class="h5 fw-bold">Périmètres disponibles</h2>
              <div class="d-grid gap-2">
                <div
                  v-for="building in catalog.buildings"
                  :key="building.id"
                  class="architecture-pill"
                >
                  {{ building.label }}
                  <div class="small fw-normal">
                    {{ building.country }} · {{ building.timezone }}
                  </div>
                </div>
              </div>
            </div>

            <div class="demo-card flat">
              <p class="section-eyebrow mb-2">Règles adaptatives</p>
              <h2 class="h5 fw-bold">Conditions de parcours</h2>
              <div class="condition-line mb-3">
                <p class="fw-bold mb-1">SI Q-001 = Français</p>
                <p class="small muted mb-0">ALORS afficher les variantes FR et masquer EN/ES.</p>
              </div>
              <div class="condition-line mb-3">
                <p class="fw-bold mb-1">SI bâtiment = Montréal</p>
                <p class="small muted mb-0">ALORS ajouter le groupe “Environnement bâtiment”.</p>
              </div>
              <button class="btn btn-outline-primary w-100">+ Ajouter une condition</button>
            </div>

            <div class="demo-card flat">
              <p class="section-eyebrow mb-2">Popup explicatif</p>
              <h2 class="h5 fw-bold">Contenu configurable</h2>
              <label class="form-label small fw-bold">Terme expliqué</label>
              <input
                class="form-control mb-2"
                :value="questions[0]?.popupTerm ?? 'Coordination inter-site'"
              />
              <label class="form-label small fw-bold">Explication visible</label>
              <textarea
                class="form-control mb-3"
                rows="4"
                :value="questions[0]?.popupBody ?? ''"
              ></textarea>
              <div class="d-flex gap-2">
                <span class="badge-soft warning">Trace ouverture popup</span>
                <span class="badge-soft">Versionnée</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
