<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'
import type { ApiQuestion, ApiQuestionGroup } from '@shared/types/api'
import type { LanguageCode, QuestionType } from '@shared/types/domain'

type BuilderQuestionType = Extract<QuestionType, 'free_text' | 'free_text_short' | 'free_text_long' | 'likert' | 'single_choice' | 'multiple_choice' | 'number' | 'date' | 'information'>

const catalog = useCatalogStore()

const selectedQuestionnaireId = ref<string>('')
const selectedGroupId = ref<string>('')
const editingQuestionId = ref<string | null>(null)
const showPreview = ref(true)
const localMessage = ref<string | null>(null)
const localError = ref<string | null>(null)

const createQuestionnaireForm = reactive({
  code: 'CHPM-S3',
  title: 'Questionnaire démonstration semaine 3',
  description: 'Brouillon créé depuis le constructeur administrateur.',
  defaultLanguage: 'fr' as LanguageCode,
  finality: 'Créer et prévisualiser un questionnaire complet sans intervention technique.',
})

const metadataForm = reactive({
  title: '',
  description: '',
  defaultLanguage: 'fr' as LanguageCode,
  finality: '',
})

const groupForm = reactive({
  title: 'Informations générales',
  description: 'Questions de contexte placées au début du questionnaire.',
  questionsPerPage: 2,
  randomize: false,
})

const groupEditForm = reactive({
  title: '',
  description: '',
  questionsPerPage: 3,
  randomize: false,
})

const questionForm = reactive({
  code: 'Q-LANGUE',
  label: 'Langue souhaitée',
  helperText: 'Indiquez la langue dans laquelle vous préférez répondre.',
  responseType: 'free_text_short' as BuilderQuestionType,
  isRequired: false,
  likertPoints: 5,
  likertMinValue: 1,
  likertLeftAnchor: 'Pas du tout d’accord',
  likertRightAnchor: 'Tout à fait d’accord',
  likertNeutralLabel: 'Neutre',
  popupTitle: '',
  popupBody: '',
  popupTerms: '',
  answerOptionsText: 'fr|Français\nen|Anglais',
})

onMounted(async () => {
  await catalog.fetchCatalog()
  selectedQuestionnaireId.value = preferredQuestionnaire.value?.id ?? ''
})

const preferredQuestionnaire = computed(
  () => catalog.questionnaires.find((questionnaire) => !questionnaire.isPublished) ?? catalog.questionnaires[0] ?? null,
)

const selectedQuestionnaire = computed(
  () =>
    catalog.questionnaires.find((questionnaire) => questionnaire.id === selectedQuestionnaireId.value) ??
    preferredQuestionnaire.value,
)

const selectedGroup = computed<ApiQuestionGroup | null>(() => {
  const questionnaire = selectedQuestionnaire.value

  if (!questionnaire) {
    return null
  }

  return questionnaire.groups.find((group) => group.id === selectedGroupId.value) ?? questionnaire.groups[0] ?? null
})

const allQuestions = computed(() =>
  selectedQuestionnaire.value?.groups.flatMap((group) => group.questions) ?? [],
)

const canCreateQuestion = computed(() => Boolean(selectedQuestionnaire.value && selectedGroup.value))
const isSaving = computed(() => catalog.status === 'saving')
const previewGroups = computed(() => selectedQuestionnaire.value?.groups ?? [])

watch(
  selectedQuestionnaire,
  (questionnaire) => {
    if (!questionnaire) {
      return
    }

    selectedQuestionnaireId.value = questionnaire.id
    metadataForm.title = questionnaire.title
    metadataForm.description = questionnaire.description ?? ''
    metadataForm.defaultLanguage = questionnaire.defaultLanguage
    metadataForm.finality = questionnaire.finality ?? ''

    if (!questionnaire.groups.some((group) => group.id === selectedGroupId.value)) {
      selectedGroupId.value = questionnaire.groups[0]?.id ?? ''
    }
  },
  { immediate: true },
)

watch(
  selectedGroup,
  (group) => {
    if (!group) {
      groupEditForm.title = ''
      groupEditForm.description = ''
      groupEditForm.questionsPerPage = 3
      groupEditForm.randomize = false
      return
    }

    selectedGroupId.value = group.id
    groupEditForm.title = group.title
    groupEditForm.description = group.description ?? ''
    groupEditForm.questionsPerPage = group.questionsPerPage ?? 3
    groupEditForm.randomize = group.randomize
  },
  { immediate: true },
)

async function createQuestionnaire(): Promise<void> {
  await performAction(async () => {
    const questionnaire = await catalog.createQuestionnaire({ ...createQuestionnaireForm })
    selectedQuestionnaireId.value = questionnaire.id
    selectedGroupId.value = ''
    return `Questionnaire “${questionnaire.title}” créé en brouillon.`
  })
}

async function saveMetadata(): Promise<void> {
  if (!selectedQuestionnaire.value) return

  await performAction(async () => {
    const questionnaire = await catalog.updateQuestionnaire(selectedQuestionnaire.value!.id, {
      title: metadataForm.title,
      description: metadataForm.description,
      defaultLanguage: metadataForm.defaultLanguage,
      finality: metadataForm.finality,
    })
    return `Métadonnées de “${questionnaire.title}” sauvegardées en brouillon.`
  })
}

async function createGroup(): Promise<void> {
  if (!selectedQuestionnaire.value) return

  await performAction(async () => {
    const questionnaire = await catalog.createGroup(selectedQuestionnaire.value!.id, {
      title: groupForm.title,
      description: groupForm.description,
      questionsPerPage: groupForm.questionsPerPage,
      randomize: groupForm.randomize,
    })
    const createdGroup = [...questionnaire.groups].sort((left, right) => right.displayOrder - left.displayOrder)[0]
    selectedGroupId.value = createdGroup?.id ?? ''
    groupForm.title = 'Nouveau groupe'
    groupForm.description = ''
    groupForm.questionsPerPage = 3
    groupForm.randomize = false
    return 'Groupe ajouté et persisté en base.'
  })
}

async function saveSelectedGroup(): Promise<void> {
  if (!selectedQuestionnaire.value || !selectedGroup.value) return

  await performAction(async () => {
    await catalog.updateGroup(selectedQuestionnaire.value!.id, selectedGroup.value!.id, {
      title: groupEditForm.title,
      description: groupEditForm.description,
      questionsPerPage: groupEditForm.questionsPerPage,
      randomize: groupEditForm.randomize,
    })
    return 'Paramètres du groupe sauvegardés.'
  })
}

async function archiveSelectedGroup(): Promise<void> {
  if (!selectedQuestionnaire.value || !selectedGroup.value) return

  if (!window.confirm(`Archiver le groupe “${selectedGroup.value.title}” ?`)) {
    return
  }

  await performAction(async () => {
    const questionnaire = await catalog.archiveGroup(selectedQuestionnaire.value!.id, selectedGroup.value!.id)
    selectedGroupId.value = questionnaire.groups[0]?.id ?? ''
    return 'Groupe archivé dans le brouillon.'
  })
}

async function submitQuestion(): Promise<void> {
  if (!selectedQuestionnaire.value || !selectedGroup.value) return

  await performAction(async () => {
    const payload = buildQuestionPayload()

    if (editingQuestionId.value) {
      await catalog.updateQuestion(selectedQuestionnaire.value!.id, editingQuestionId.value, payload)
      const editedCode = payload.code
      resetQuestionForm()
      return `Question ${editedCode} mise à jour.`
    }

    await catalog.createQuestion(selectedQuestionnaire.value!.id, selectedGroup.value!.id, payload)
    const createdCode = payload.code
    resetQuestionForm()
    return `Question ${createdCode} ajoutée au groupe.`
  })
}

async function archiveQuestion(question: ApiQuestion): Promise<void> {
  if (!selectedQuestionnaire.value) return

  if (!window.confirm(`Archiver la question ${question.code} ?`)) {
    return
  }

  await performAction(async () => {
    await catalog.archiveQuestion(selectedQuestionnaire.value!.id, question.id)
    if (editingQuestionId.value === question.id) {
      resetQuestionForm()
    }
    return `Question ${question.code} archivée.`
  })
}

function editQuestion(question: ApiQuestion): void {
  editingQuestionId.value = question.id
  questionForm.code = question.code
  questionForm.label = question.label ?? question.title
  questionForm.helperText = question.helperText ?? ''
  questionForm.responseType = (question.responseType ?? question.type) as BuilderQuestionType
  questionForm.isRequired = Boolean(question.isRequired)
  questionForm.likertPoints = question.likertScale?.points ?? 5
  questionForm.likertMinValue = question.likertScale?.minValue ?? 1
  questionForm.likertLeftAnchor = question.likertScale?.leftAnchor ?? 'Pas du tout d’accord'
  questionForm.likertRightAnchor = question.likertScale?.rightAnchor ?? 'Tout à fait d’accord'
  questionForm.likertNeutralLabel = question.likertScale?.neutralLabel ?? 'Neutre'
  questionForm.popupTitle = question.popupDefinitions?.[0]?.title ?? ''
  questionForm.popupBody = question.popupDefinitions?.[0]?.body ?? ''
  questionForm.popupTerms = question.popupDefinitions?.map((popup) => popup.termLabel ?? popup.termKey).join('\n') ?? ''
  questionForm.answerOptionsText = question.options?.map((option) => `${option.value}|${option.label}`).join('\n') ?? 'oui|Oui\nnon|Non'
}

function resetQuestionForm(): void {
  editingQuestionId.value = null
  questionForm.code = nextQuestionCode()
  questionForm.label = ''
  questionForm.helperText = ''
  questionForm.responseType = 'free_text' as BuilderQuestionType
  questionForm.isRequired = false
  questionForm.likertPoints = 5
  questionForm.likertMinValue = 1
  questionForm.likertLeftAnchor = 'Pas du tout d’accord'
  questionForm.likertRightAnchor = 'Tout à fait d’accord'
  questionForm.likertNeutralLabel = 'Neutre'
  questionForm.popupTitle = ''
  questionForm.popupBody = ''
  questionForm.popupTerms = ''
  questionForm.answerOptionsText = 'oui|Oui\nnon|Non'
}

function buildQuestionPayload() {
  const popupDefinition = buildPopupPayload()
  const payload = {
    code: questionForm.code,
    label: questionForm.label,
    helperText: questionForm.helperText,
    responseType: questionForm.responseType,
    isRequired: questionForm.isRequired,
    ...(questionForm.responseType === 'single_choice' || questionForm.responseType === 'multiple_choice'
      ? { answerOptions: answerOptionsFromText(questionForm.answerOptionsText) }
      : {}),
    ...(questionForm.responseType === 'likert'
      ? {
          likertScale: {
            points: Number(questionForm.likertPoints),
            minValue: Number(questionForm.likertMinValue),
            leftAnchor: questionForm.likertLeftAnchor,
            rightAnchor: questionForm.likertRightAnchor,
            neutralLabel: questionForm.likertNeutralLabel,
          },
        }
      : {}),
    ...(popupDefinition ? { popupDefinition } : {}),
  }

  if (!payload.label.trim()) {
    throw new Error('Le libellé de la question est obligatoire.')
  }

  return payload
}

function buildPopupPayload() {
  const hasPopup = Boolean(
    questionForm.popupTitle.trim() || questionForm.popupBody.trim() || questionForm.popupTerms.trim(),
  )

  if (!hasPopup) {
    return undefined
  }

  if (!questionForm.popupTitle.trim() || !questionForm.popupBody.trim()) {
    throw new Error('La popup doit avoir un titre et un texte explicatif.')
  }

  return {
    title: questionForm.popupTitle,
    body: questionForm.popupBody,
    termsExplained: termsFromText(questionForm.popupTerms),
  }
}

function answerOptionsFromText(value: string) {
  const options = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [firstPart = '', ...labelParts] = line.split('|')
      const rawValue = firstPart.trim()
      const label = (labelParts.join('|') || rawValue).trim()
      return {
        value: rawValue,
        label,
        displayOrder: index + 1,
      }
    })

  if (options.length < 2) {
    throw new Error('Une question à choix doit contenir au moins deux options, une par ligne au format valeur|libellé.')
  }

  return options
}

function termsFromText(value: string): string[] {
  return value
    .split(/[\n,;]/)
    .map((term) => term.trim())
    .filter(Boolean)
}

function nextQuestionCode(): string {
  const count = selectedGroup.value?.questions.length ?? allQuestions.value.length
  return `Q-${String(count + 1).padStart(3, '0')}`
}

function likertValues(scale?: { points: number; minValue?: number } | null): number[] {
  if (!scale) return []

  const minValue = scale.minValue ?? 1
  return Array.from({ length: scale.points }, (_, index) => minValue + index)
}

function questionTypeLabel(type?: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    single_choice: 'Choix unique',
    multiple_choice: 'Choix multiple',
    likert: 'Échelle Likert',
    free_text: 'Réponse libre',
    free_text_short: 'Réponse libre courte',
    free_text_long: 'Réponse libre longue',
    number: 'Nombre',
    date: 'Date',
    information: 'Information',
  }

  return type ? labels[type] : 'Question'
}

async function performAction(action: () => Promise<string>): Promise<void> {
  localError.value = null
  localMessage.value = null

  try {
    localMessage.value = await action()
  } catch (caught) {
    localError.value = caught instanceof Error ? caught.message : 'Action impossible.'
  }
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Administrateur non-informaticien"
        title="Constructeur visuel de questionnaire"
        description="Création, version brouillon, groupes, questions, Likert, popups et prévisualisation répondant sont maintenant reliés à l’API NestJS et persistés en PostgreSQL."
      >
        <template #actions>
          <button class="btn btn-outline-primary" type="button" @click="showPreview = !showPreview">
            {{ showPreview ? 'Masquer' : 'Afficher' }} l’aperçu répondant
          </button>
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!selectedQuestionnaire || isSaving"
            @click="saveMetadata"
          >
            Sauvegarder le brouillon
          </button>
        </template>
      </PageHeader>
      <RoleGateInfo class="mb-4" />

      <div v-if="catalog.status === 'loading'" class="alert alert-info rounded-4" role="status">
        Chargement du catalogue questionnaire…
      </div>
      <div v-if="catalog.error" class="alert alert-danger rounded-4" role="alert">
        {{ catalog.error }}
      </div>
      <div v-if="localError" class="alert alert-danger rounded-4" role="alert">
        {{ localError }}
      </div>
      <div v-if="localMessage" class="alert alert-success rounded-4" role="status">
        {{ localMessage }}
      </div>

      <div class="row g-4 align-items-start">
        <div class="col-xl-3">
          <aside class="builder-sidebar p-3">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <h2 class="h5 fw-bold mb-0">Structure</h2>
              <span class="badge-soft">{{ selectedQuestionnaire?.questionCount ?? 0 }} questions</span>
            </div>

            <label class="form-label fw-bold" for="questionnaire-select">Questionnaire</label>
            <select
              id="questionnaire-select"
              v-model="selectedQuestionnaireId"
              class="form-select mb-3"
              aria-label="Questionnaire en base"
            >
              <option v-for="questionnaire in catalog.questionnaires" :key="questionnaire.id" :value="questionnaire.id">
                {{ questionnaire.title }} · v{{ questionnaire.version }} ·
                {{ questionnaire.isPublished ? 'publié' : 'brouillon' }}
              </option>
            </select>

            <div class="question-row mb-4">
              <p class="section-eyebrow mb-2">Créer un questionnaire</p>
              <label class="form-label small fw-bold" for="new-code">Code</label>
              <input id="new-code" v-model="createQuestionnaireForm.code" class="form-control mb-2" />
              <label class="form-label small fw-bold" for="new-title">Titre</label>
              <input id="new-title" v-model="createQuestionnaireForm.title" class="form-control mb-2" />
              <label class="form-label small fw-bold" for="new-language">Langue par défaut</label>
              <select id="new-language" v-model="createQuestionnaireForm.defaultLanguage" class="form-select mb-3">
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
                <option value="es">Espagnol</option>
              </select>
              <button class="btn btn-outline-primary w-100" type="button" :disabled="isSaving" @click="createQuestionnaire">
                + Créer le brouillon
              </button>
            </div>

            <div class="d-flex align-items-center justify-content-between mb-2">
              <h3 class="h6 fw-bold mb-0">Groupes</h3>
              <span class="badge-soft">{{ selectedQuestionnaire?.groupCount ?? 0 }}</span>
            </div>
            <div class="d-grid gap-2 mb-4">
              <button
                v-for="group in selectedQuestionnaire?.groups ?? []"
                :key="group.id"
                class="builder-menu-item border-0 text-start"
                :class="{ active: group.id === selectedGroup?.id }"
                type="button"
                @click="selectedGroupId = group.id"
              >
                <span>{{ group.title }}</span>
                <small>{{ group.questions.length }}</small>
              </button>
            </div>

            <div class="question-row">
              <p class="section-eyebrow mb-2">Ajouter un groupe</p>
              <label class="form-label small fw-bold" for="group-title">Nom du groupe</label>
              <input id="group-title" v-model="groupForm.title" class="form-control mb-2" />
              <label class="form-label small fw-bold" for="group-description">Description</label>
              <textarea id="group-description" v-model="groupForm.description" class="form-control mb-2" rows="2"></textarea>
              <label class="form-label small fw-bold" for="group-questions-per-page">Questions par page</label>
              <input
                id="group-questions-per-page"
                v-model.number="groupForm.questionsPerPage"
                class="form-control mb-2"
                min="1"
                max="20"
                type="number"
              />
              <div class="form-check form-switch mb-3">
                <input id="group-randomize" v-model="groupForm.randomize" class="form-check-input" type="checkbox" />
                <label class="form-check-label fw-semibold" for="group-randomize">Randomiser ce groupe</label>
              </div>
              <button
                class="btn btn-outline-primary w-100"
                type="button"
                :disabled="!selectedQuestionnaire || isSaving"
                @click="createGroup"
              >
                + Ajouter le groupe
              </button>
            </div>
          </aside>
        </div>

        <div class="col-xl-5">
          <div class="demo-card h-100">
            <div class="screen-preview">
              <div class="screen-topbar">
                <span class="window-dot"></span>
                <span class="window-dot"></span>
                <span class="window-dot"></span>
                <strong class="ms-2 small muted">Éditeur connecté au brouillon</strong>
              </div>

              <div class="p-3 p-lg-4">
                <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                  <div>
                    <p class="section-eyebrow mb-1">
                      {{ selectedQuestionnaire ? `${selectedQuestionnaire.code} · v${selectedQuestionnaire.version}` : 'Aucun brouillon' }}
                    </p>
                    <h2 class="h4 fw-bold mb-0">Paramètres du questionnaire</h2>
                  </div>
                  <span class="badge-soft warning">Version brouillon</span>
                </div>

                <div class="row g-3 mb-4">
                  <div class="col-md-8">
                    <label class="form-label fw-bold" for="metadata-title">Titre affiché</label>
                    <input id="metadata-title" v-model="metadataForm.title" class="form-control" />
                  </div>
                  <div class="col-md-4">
                    <label class="form-label fw-bold" for="metadata-language">Langue</label>
                    <select id="metadata-language" v-model="metadataForm.defaultLanguage" class="form-select">
                      <option value="fr">Français</option>
                      <option value="en">Anglais</option>
                      <option value="es">Espagnol</option>
                    </select>
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-bold" for="metadata-description">Description</label>
                    <textarea id="metadata-description" v-model="metadataForm.description" class="form-control" rows="2"></textarea>
                  </div>
                  <div class="col-12">
                    <label class="form-label fw-bold" for="metadata-finality">Finalité métier</label>
                    <textarea id="metadata-finality" v-model="metadataForm.finality" class="form-control" rows="2"></textarea>
                  </div>
                </div>

                <div v-if="selectedGroup" class="question-row mb-4">
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <div>
                      <p class="section-eyebrow mb-1">Groupe sélectionné</p>
                      <h3 class="h5 fw-bold mb-0">{{ selectedGroup.title }}</h3>
                    </div>
                    <span class="badge-soft">{{ selectedGroup.questions.length }} question(s)</span>
                  </div>
                  <div class="row g-3">
                    <div class="col-md-7">
                      <label class="form-label small fw-bold" for="edit-group-title">Titre du groupe</label>
                      <input id="edit-group-title" v-model="groupEditForm.title" class="form-control" />
                    </div>
                    <div class="col-md-5">
                      <label class="form-label small fw-bold" for="edit-group-qpp">Questions par page</label>
                      <input
                        id="edit-group-qpp"
                        v-model.number="groupEditForm.questionsPerPage"
                        class="form-control"
                        min="1"
                        max="20"
                        type="number"
                      />
                    </div>
                    <div class="col-12">
                      <label class="form-label small fw-bold" for="edit-group-description">Description</label>
                      <textarea id="edit-group-description" v-model="groupEditForm.description" class="form-control" rows="2"></textarea>
                    </div>
                    <div class="col-12 d-flex flex-wrap gap-2 align-items-center">
                      <div class="form-check form-switch me-auto">
                        <input id="edit-group-randomize" v-model="groupEditForm.randomize" class="form-check-input" type="checkbox" />
                        <label class="form-check-label fw-semibold" for="edit-group-randomize">Randomisation par groupe</label>
                      </div>
                      <button class="btn btn-outline-danger" type="button" :disabled="isSaving" @click="archiveSelectedGroup">
                        Archiver
                      </button>
                      <button class="btn btn-outline-primary" type="button" :disabled="isSaving" @click="saveSelectedGroup">
                        Sauvegarder le groupe
                      </button>
                    </div>
                  </div>
                </div>

                <div class="question-row mb-4">
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <div>
                      <p class="section-eyebrow mb-1">Questions</p>
                      <h3 class="h5 fw-bold mb-0">{{ editingQuestionId ? 'Modifier la question' : 'Créer une question' }}</h3>
                    </div>
                    <button class="btn btn-sm btn-outline-secondary" type="button" @click="resetQuestionForm">
                      Réinitialiser
                    </button>
                  </div>

                  <div class="row g-3">
                    <div class="col-md-4">
                      <label class="form-label small fw-bold" for="question-code">Code</label>
                      <input id="question-code" v-model="questionForm.code" class="form-control" />
                    </div>
                    <div class="col-md-8">
                      <label class="form-label small fw-bold" for="question-type">Type de réponse</label>
                      <select id="question-type" v-model="questionForm.responseType" class="form-select">
                        <option value="free_text_short">Réponse libre courte</option>
                        <option value="free_text">Réponse libre</option>
                        <option value="free_text_long">Réponse libre longue</option>
                        <option value="single_choice">Choix unique</option>
                        <option value="multiple_choice">Choix multiple</option>
                        <option value="likert">Échelle Likert</option>
                        <option value="number">Nombre</option>
                        <option value="date">Date</option>
                        <option value="information">Bloc informatif</option>
                      </select>
                    </div>
                    <div class="col-12">
                      <label class="form-label small fw-bold" for="question-label">Libellé affiché</label>
                      <textarea id="question-label" v-model="questionForm.label" class="form-control" rows="2"></textarea>
                    </div>
                    <div class="col-12">
                      <label class="form-label small fw-bold" for="question-helper">Aide courte</label>
                      <input id="question-helper" v-model="questionForm.helperText" class="form-control" />
                    </div>

                    <template v-if="questionForm.responseType === 'likert'">
                      <div class="col-md-3">
                        <label class="form-label small fw-bold" for="likert-points">Points</label>
                        <input id="likert-points" v-model.number="questionForm.likertPoints" class="form-control" min="3" max="10" type="number" />
                      </div>
                      <div class="col-md-3">
                        <label class="form-label small fw-bold" for="likert-min-value">Première valeur</label>
                        <input id="likert-min-value" v-model.number="questionForm.likertMinValue" class="form-control" min="0" max="10" type="number" />
                      </div>
                      <div class="col-md-3">
                        <label class="form-label small fw-bold" for="likert-left">Libellé gauche</label>
                        <input id="likert-left" v-model="questionForm.likertLeftAnchor" class="form-control" />
                      </div>
                      <div class="col-md-3">
                        <label class="form-label small fw-bold" for="likert-right">Libellé droit</label>
                        <input id="likert-right" v-model="questionForm.likertRightAnchor" class="form-control" />
                      </div>
                    </template>

                    <template v-if="questionForm.responseType === 'single_choice' || questionForm.responseType === 'multiple_choice'">
                      <div class="col-12">
                        <label class="form-label small fw-bold" for="question-options">Options de réponse</label>
                        <textarea
                          id="question-options"
                          v-model="questionForm.answerOptionsText"
                          class="form-control"
                          rows="4"
                          placeholder="fr|Français\nen|Anglais"
                        ></textarea>
                        <p class="form-text mb-0">Une option par ligne : <code>valeur|libellé affiché</code>.</p>
                      </div>
                    </template>

                    <div class="col-12">
                      <div class="form-check form-switch">
                        <input id="question-required" v-model="questionForm.isRequired" class="form-check-input" type="checkbox" />
                        <label class="form-check-label fw-semibold" for="question-required">Question obligatoire</label>
                      </div>
                    </div>
                  </div>

                  <hr class="my-4" />

                  <p class="section-eyebrow mb-2">Popup explicative optionnelle</p>
                  <div class="row g-3">
                    <div class="col-md-5">
                      <label class="form-label small fw-bold" for="popup-title">Titre</label>
                      <input id="popup-title" v-model="questionForm.popupTitle" class="form-control" placeholder="Ex. Coordination inter-site" />
                    </div>
                    <div class="col-md-7">
                      <label class="form-label small fw-bold" for="popup-terms">Termes expliqués</label>
                      <input id="popup-terms" v-model="questionForm.popupTerms" class="form-control" placeholder="Un terme, plusieurs séparés par virgule" />
                    </div>
                    <div class="col-12">
                      <label class="form-label small fw-bold" for="popup-body">Texte explicatif</label>
                      <textarea id="popup-body" v-model="questionForm.popupBody" class="form-control" rows="3"></textarea>
                    </div>
                  </div>

                  <button
                    class="btn btn-primary w-100 mt-3"
                    type="button"
                    :disabled="!canCreateQuestion || isSaving"
                    @click="submitQuestion"
                  >
                    {{ editingQuestionId ? 'Mettre à jour la question' : '+ Ajouter la question au brouillon' }}
                  </button>
                </div>

                <div v-if="!allQuestions.length" class="alert alert-warning rounded-4 mb-0">
                  Aucun item pour l’instant. Ajoutez le groupe “Informations générales”, puis les questions de démonstration.
                </div>
                <div v-for="question in allQuestions" :key="question.id" class="question-row">
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <span class="badge-soft">{{ question.code }}</span>
                    <span class="badge-soft success">{{ questionTypeLabel(question.responseType ?? question.type) }} · {{ question.answerScaleLabel }}</span>
                  </div>
                  <h3 class="h6 fw-bold">{{ question.label ?? question.title }}</h3>
                  <p v-if="question.helperText" class="small muted mb-3">{{ question.helperText }}</p>
                  <div class="d-flex flex-wrap gap-2">
                    <button class="btn btn-sm btn-outline-primary" type="button" @click="editQuestion(question)">
                      Modifier
                    </button>
                    <button class="btn btn-sm btn-outline-danger" type="button" @click="archiveQuestion(question)">
                      Archiver
                    </button>
                    <span v-if="question.popupDefinitions?.length" class="badge-soft warning">
                      {{ question.popupDefinitions.length }} popup(s)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-xl-4">
          <div class="d-grid gap-4">
            <div v-if="showPreview" class="demo-card flat">
              <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                <div>
                  <p class="section-eyebrow mb-2">Prévisualisation répondant</p>
                  <h2 class="h5 fw-bold mb-0">{{ selectedQuestionnaire?.title ?? 'Questionnaire' }}</h2>
                </div>
                <span class="badge-soft success">Brouillon non publié</span>
              </div>
              <p class="muted">{{ selectedQuestionnaire?.description }}</p>

              <div v-for="group in previewGroups" :key="group.id" class="question-row mb-3">
                <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                  <span class="badge-soft">{{ group.title }} · {{ group.questionsPerPage }} question(s)/page</span>
                  <span v-if="group.randomize" class="badge-soft warning">ordre randomisé</span>
                </div>
                <p v-if="group.description" class="small muted">{{ group.description }}</p>

                <div v-for="question in group.questions" :key="question.id" class="question-row mb-2">
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <span class="badge-soft">{{ question.code }}</span>
                    <span class="badge-soft">{{ questionTypeLabel(question.responseType ?? question.type) }}</span>
                  </div>
                  <h3 class="h6 fw-bold">{{ question.label ?? question.title }}</h3>
                  <p v-if="question.helperText" class="small muted">{{ question.helperText }}</p>

                  <div v-if="question.responseType === 'likert' && question.likertScale" class="mb-3">
                    <p class="small muted mb-2">
                      {{ question.likertScale.leftAnchor }} · {{ question.likertScale.rightAnchor }}
                    </p>
                    <div class="likert-scale" role="group" :aria-label="`Échelle Likert ${question.likertScale.points} points`">
                      <button v-for="value in likertValues(question.likertScale)" :key="value" class="likert-dot border-0" type="button">
                        {{ value }}
                      </button>
                    </div>
                  </div>
                  <div v-else-if="question.responseType === 'single_choice' || question.responseType === 'multiple_choice'" class="d-grid gap-2 mb-3">
                    <button v-for="option in question.options" :key="option.id" class="btn btn-outline-primary text-start" type="button">
                      {{ option.label }}
                    </button>
                  </div>
                  <input v-else-if="question.responseType === 'number'" class="form-control mb-3" type="number" placeholder="Nombre" />
                  <input v-else-if="question.responseType === 'date'" class="form-control mb-3" type="date" />
                  <div v-else-if="question.responseType === 'information'" class="alert alert-info rounded-4 mb-3">Bloc d’information sans réponse attendue.</div>
                  <textarea v-else class="form-control mb-3" rows="3" placeholder="Réponse du répondant"></textarea>

                  <div v-for="popup in question.popupDefinitions ?? []" :key="popup.id" class="question-help mb-2">
                    <div class="d-flex justify-content-between gap-3">
                      <strong>{{ popup.title }}</strong>
                      <span class="badge-soft warning">popup persistée</span>
                    </div>
                    <p class="small muted mb-0 mt-2">{{ popup.body }}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="demo-card flat">
              <p class="section-eyebrow mb-2">Critères d’acceptation</p>
              <h2 class="h5 fw-bold">Couverture semaine 3</h2>
              <div class="d-grid gap-2">
                <span class="badge-soft success">Création sans code</span>
                <span class="badge-soft success">Groupes et ordre persistés</span>
                <span class="badge-soft success">Questions libres, choix, nombre, date et Likert</span>
                <span class="badge-soft success">Popups explicatives persistées</span>
                <span class="badge-soft success">Erreurs API lisibles</span>
              </div>
            </div>

            <div class="demo-card flat">
              <p class="section-eyebrow mb-2">Démonstration guidée</p>
              <ol class="muted mb-0 ps-3">
                <li>Créer un questionnaire ou sélectionner un brouillon.</li>
                <li>Ajouter “Informations générales”.</li>
                <li>Créer “Langue souhaitée” en réponse libre courte.</li>
                <li>Créer une question Likert avec popup explicative.</li>
                <li>Contrôler la vue répondant à droite.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
