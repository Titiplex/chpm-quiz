<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import ModalPanel from '@/components/common/ModalPanel.vue'
import PageSectionNav from '@/components/common/PageSectionNav.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { languageText, questionTypeText, t, tp } from '@/i18n'
import { useCatalogStore } from '@/stores/catalog'
import type { ApiQuestion, ApiQuestionGroup, ConditionExpression } from '@shared/types/api'
import type { LanguageCode, QuestionType } from '@shared/types/domain'

type BuilderQuestionType = Extract<
  QuestionType,
  | 'free_text'
  | 'free_text_short'
  | 'free_text_long'
  | 'likert'
  | 'single_choice'
  | 'multiple_choice'
  | 'number'
  | 'date'
  | 'information'
>

type PageSectionNavItem = {
  id: string
  label: string
  hint?: string
}

type LanguageOption = {
  code: LanguageCode
  label: string
}

const catalog = useCatalogStore()

const adminSections = computed<PageSectionNavItem[]>(() => [
  { id: 'admin-editor', label: t('builder.nav.edit'), hint: t('builder.nav.editHint') },
  { id: 'admin-preview', label: t('builder.nav.preview'), hint: t('builder.nav.previewHint') },
])

const supportedLanguages = computed<LanguageOption[]>(() =>
  (['fr', 'en', 'es'] as LanguageCode[]).map((code) => ({ code, label: languageText(code) })),
)

const selectedQuestionnaireId = ref<string>('')
const selectedGroupId = ref<string>('')
const editingQuestionId = ref<string | null>(null)
const showPreview = ref(true)
const showStructureModal = ref(false)
const localMessage = ref<string | null>(null)
const localError = ref<string | null>(null)
const publicationReport = ref<{ canPublish: boolean; errors: string[] } | null>(null)
const previewAnswers = reactive<Record<string, string>>({ 'Q-001': 'fr' })

const createQuestionnaireForm = reactive({
  code: '',
  title: '',
  description: '',
  defaultLanguage: 'fr' as LanguageCode,
  finality: '',
})

const metadataForm = reactive({
  title: '',
  description: '',
  defaultLanguage: 'fr' as LanguageCode,
  finality: '',
})

const translationForm = reactive({
  language: 'en' as LanguageCode,
  title: '',
  description: '',
  finality: '',
})

const groupForm = reactive({
  title: t('builder.defaults.groupTitle'),
  description: t('builder.defaults.groupDescription'),
  questionsPerPage: 2,
  randomize: false,
  conditionQuestionCode: '',
  conditionValue: '',
})

const groupEditForm = reactive({
  title: '',
  description: '',
  questionsPerPage: 3,
  randomize: false,
  conditionQuestionCode: '',
  conditionValue: '',
})

const questionForm = reactive({
  code: 'Q-LANGUE',
  label: t('builder.defaults.questionLabel'),
  helperText: t('builder.defaults.questionHelp'),
  responseType: 'free_text_short' as BuilderQuestionType,
  isRequired: false,
  likertPoints: 5,
  likertMinValue: 1,
  likertLeftAnchor: t('builder.defaults.likertLeft'),
  likertRightAnchor: t('builder.defaults.likertRight'),
  likertNeutralLabel: t('builder.defaults.likertNeutral'),
  popupTitle: '',
  popupBody: '',
  popupTerms: '',
  answerOptionsText: t('builder.defaults.languageOptions'),
  conditionQuestionCode: '',
  conditionValue: '',
})

onMounted(async () => {
  await catalog.fetchCatalog()
  selectedQuestionnaireId.value = preferredQuestionnaire.value?.id ?? ''
})

const preferredQuestionnaire = computed(
  () =>
    catalog.questionnaires.find((questionnaire) => !questionnaire.isPublished) ??
    catalog.questionnaires[0] ??
    null,
)

const selectedQuestionnaire = computed(
  () =>
    catalog.questionnaires.find(
      (questionnaire) => questionnaire.id === selectedQuestionnaireId.value,
    ) ?? preferredQuestionnaire.value,
)

const selectedGroup = computed<ApiQuestionGroup | null>(() => {
  const questionnaire = selectedQuestionnaire.value

  if (!questionnaire) {
    return null
  }

  return (
    questionnaire.groups.find((group) => group.id === selectedGroupId.value) ??
    questionnaire.groups[0] ??
    null
  )
})

const allQuestions = computed(
  () => selectedQuestionnaire.value?.groups.flatMap((group) => group.questions) ?? [],
)

const canCreateQuestion = computed(() =>
  Boolean(selectedQuestionnaire.value && selectedGroup.value),
)
const isSaving = computed(() => catalog.status === 'saving')
const previewResult = computed(() => renderPreviewPath(selectedQuestionnaire.value?.groups ?? []))
const previewGroups = computed(() => previewResult.value.visibleGroups)
const hiddenPreviewGroups = computed(() => previewResult.value.hiddenGroups)
const currentLanguageLabel = computed(() =>
  languageLabel(selectedQuestionnaire.value?.language ?? metadataForm.defaultLanguage),
)

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
    translationForm.title = `${questionnaire.title} (${translationForm.language.toUpperCase()})`
    translationForm.description = questionnaire.description ?? ''
    translationForm.finality = questionnaire.finality ?? ''

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
    const condition = conditionToFields(group.conditionExpression)
    groupEditForm.conditionQuestionCode = condition.questionCode
    groupEditForm.conditionValue = condition.value
  },
  { immediate: true },
)

async function createQuestionnaire(): Promise<void> {
  await performAction(async () => {
    const questionnaire = await catalog.createQuestionnaire({ ...createQuestionnaireForm })
    selectedQuestionnaireId.value = questionnaire.id
    selectedGroupId.value = ''
    return t('builder.message.questionnaireCreated', { title: questionnaire.title })
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
    return t('builder.message.metadataSaved', { title: questionnaire.title })
  })
}

async function addLanguageVersion(): Promise<void> {
  if (!selectedQuestionnaire.value) return

  await performAction(async () => {
    const translation = await catalog.addQuestionnaireLanguage(selectedQuestionnaire.value!.id, {
      language: translationForm.language,
      title: translationForm.title,
      description: translationForm.description,
      finality: translationForm.finality,
    })
    selectedQuestionnaireId.value = translation.id
    selectedGroupId.value = translation.groups[0]?.id ?? ''
    return t('builder.message.translationCreated', { language: languageLabel(translation.language), title: translation.title })
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
      conditionExpression: conditionFromFields(
        groupForm.conditionQuestionCode,
        groupForm.conditionValue,
      ),
    })
    const createdGroup = [...questionnaire.groups].sort(
      (left, right) => right.displayOrder - left.displayOrder,
    )[0]
    selectedGroupId.value = createdGroup?.id ?? ''
    groupForm.title = t('builder.defaults.newGroup')
    groupForm.description = ''
    groupForm.questionsPerPage = 3
    groupForm.randomize = false
    groupForm.conditionQuestionCode = ''
    groupForm.conditionValue = ''
    return t('builder.message.groupAdded')
  })
}

function selectGroup(groupId: string): void {
  selectedGroupId.value = groupId
  showStructureModal.value = false
}

async function saveSelectedGroup(): Promise<void> {
  if (!selectedQuestionnaire.value || !selectedGroup.value) return

  await performAction(async () => {
    await catalog.updateGroup(selectedQuestionnaire.value!.id, selectedGroup.value!.id, {
      title: groupEditForm.title,
      description: groupEditForm.description,
      questionsPerPage: groupEditForm.questionsPerPage,
      randomize: groupEditForm.randomize,
      conditionExpression: conditionFromFields(
        groupEditForm.conditionQuestionCode,
        groupEditForm.conditionValue,
      ),
    })
    return t('builder.message.groupSaved')
  })
}

async function archiveSelectedGroup(): Promise<void> {
  if (!selectedQuestionnaire.value || !selectedGroup.value) return

  if (!window.confirm(t('builder.confirm.archiveGroup', { title: selectedGroup.value.title }))) {
    return
  }

  await performAction(async () => {
    const questionnaire = await catalog.archiveGroup(
      selectedQuestionnaire.value!.id,
      selectedGroup.value!.id,
    )
    selectedGroupId.value = questionnaire.groups[0]?.id ?? ''
    return t('builder.message.groupArchived')
  })
}

async function submitQuestion(): Promise<void> {
  if (!selectedQuestionnaire.value || !selectedGroup.value) return

  await performAction(async () => {
    const payload = buildQuestionPayload()

    if (editingQuestionId.value) {
      await catalog.updateQuestion(
        selectedQuestionnaire.value!.id,
        editingQuestionId.value,
        payload,
      )
      const editedCode = payload.code
      resetQuestionForm()
      return t('builder.message.questionUpdated', { code: editedCode })
    }

    await catalog.createQuestion(selectedQuestionnaire.value!.id, selectedGroup.value!.id, payload)
    const createdCode = payload.code
    resetQuestionForm()
    return t('builder.message.questionAdded', { code: createdCode })
  })
}

async function validatePublication(): Promise<void> {
  if (!selectedQuestionnaire.value) return

  await performAction(async () => {
    publicationReport.value = await catalog.validatePublication(
      selectedQuestionnaire.value!.versionId,
    )
    return publicationReport.value.canPublish
      ? t('builder.message.publicationValid')
      : tp('builder.message.publicationBlocked', publicationReport.value.errors.length)
  })
}

async function publishSelectedVersion(): Promise<void> {
  if (!selectedQuestionnaire.value) return

  await performAction(async () => {
    const report = await catalog.validatePublication(selectedQuestionnaire.value!.versionId)
    publicationReport.value = report
    if (!report.canPublish) {
      throw new Error(t('builder.error.publicationImpossible', { errors: report.errors.join(' ; ') }))
    }
    await catalog.publishVersion(selectedQuestionnaire.value!.versionId)
    return t('builder.message.published')
  })
}

async function archiveQuestion(question: ApiQuestion): Promise<void> {
  if (!selectedQuestionnaire.value) return

  if (!window.confirm(t('builder.confirm.archiveQuestion', { code: question.code }))) {
    return
  }

  await performAction(async () => {
    await catalog.archiveQuestion(selectedQuestionnaire.value!.id, question.id)
    if (editingQuestionId.value === question.id) {
      resetQuestionForm()
    }
    return t('builder.message.questionArchived', { code: question.code })
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
  questionForm.likertLeftAnchor = question.likertScale?.leftAnchor ?? t('builder.defaults.likertLeft')
  questionForm.likertRightAnchor = question.likertScale?.rightAnchor ?? t('builder.defaults.likertRight')
  questionForm.likertNeutralLabel = question.likertScale?.neutralLabel ?? t('builder.defaults.likertNeutral')
  questionForm.popupTitle = question.popupDefinitions?.[0]?.title ?? ''
  questionForm.popupBody = question.popupDefinitions?.[0]?.body ?? ''
  questionForm.popupTerms =
    question.popupDefinitions?.map((popup) => popup.termLabel ?? popup.termKey).join('\n') ?? ''
  questionForm.answerOptionsText =
    question.options?.map((option) => `${option.value}|${option.label}`).join('\n') ??
    t('builder.defaults.yesNoOptions')
  const condition = conditionToFields(question.conditionExpression)
  questionForm.conditionQuestionCode = condition.questionCode
  questionForm.conditionValue = condition.value
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
  questionForm.likertLeftAnchor = t('builder.defaults.likertLeft')
  questionForm.likertRightAnchor = t('builder.defaults.likertRight')
  questionForm.likertNeutralLabel = t('builder.defaults.likertNeutral')
  questionForm.popupTitle = ''
  questionForm.popupBody = ''
  questionForm.popupTerms = ''
  questionForm.answerOptionsText = t('builder.defaults.yesNoOptions')
  questionForm.conditionQuestionCode = ''
  questionForm.conditionValue = ''
}

function buildQuestionPayload() {
  const popupDefinition = buildPopupPayload()
  const payload = {
    code: questionForm.code,
    label: questionForm.label,
    helperText: questionForm.helperText,
    responseType: questionForm.responseType,
    isRequired: questionForm.isRequired,
    conditionExpression: conditionFromFields(
      questionForm.conditionQuestionCode,
      questionForm.conditionValue,
    ),
    ...(questionForm.responseType === 'single_choice' ||
    questionForm.responseType === 'multiple_choice'
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
    throw new Error(t('builder.error.questionLabelRequired'))
  }

  return payload
}

function buildPopupPayload() {
  const hasPopup = Boolean(
    questionForm.popupTitle.trim() ||
    questionForm.popupBody.trim() ||
    questionForm.popupTerms.trim(),
  )

  if (!hasPopup) {
    return undefined
  }

  if (!questionForm.popupTitle.trim() || !questionForm.popupBody.trim()) {
    throw new Error(t('builder.error.popupIncomplete'))
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
    throw new Error(
      t('builder.error.choiceOptions'),
    )
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

function conditionFromFields(questionCode: string, value: string): ConditionExpression | null {
  const normalizedQuestionCode = normalizeQuestionCode(questionCode)
  const normalizedValue = value.trim()

  if (!normalizedQuestionCode || !normalizedValue) {
    return null
  }

  return {
    questionCode: normalizedQuestionCode,
    operator: 'equals',
    value: normalizedValue,
  }
}

function conditionToFields(expression?: ConditionExpression | null): {
  questionCode: string
  value: string
} {
  if (
    !expression ||
    Array.isArray(expression.all) ||
    Array.isArray(expression.any) ||
    expression.not
  ) {
    return { questionCode: '', value: '' }
  }

  const rawValue = expression.value ?? expression.equals
  return {
    questionCode: expression.questionCode ? normalizeQuestionCode(expression.questionCode) : '',
    value: rawValue === undefined || rawValue === null ? '' : String(rawValue),
  }
}

function normalizeQuestionCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-')
}

function conditionLabel(expression?: ConditionExpression | null): string {
  if (!expression) return t('builder.condition.always')
  if (Array.isArray(expression.all)) return expression.all.map(conditionLabel).join(` ${t('builder.condition.and')} `)
  if (Array.isArray(expression.any)) return expression.any.map(conditionLabel).join(` ${t('builder.condition.or')} `)
  if (expression.not) return t('builder.condition.not', { condition: conditionLabel(expression.not) })

  const expected = expression.value ?? expression.equals ?? t('builder.condition.answeredValue')
  const operator =
    expression.operator ??
    (Object.prototype.hasOwnProperty.call(expression, 'equals') ? 'equals' : 'answered')
  const questionCode = expression.questionCode ?? expression.questionId ?? t('common.question').toLowerCase()

  if (operator === 'answered') return t('builder.condition.answered', { question: questionCode })
  if (operator === 'not_answered') return t('builder.condition.notAnswered', { question: questionCode })
  return `${questionCode} ${operator} ${String(expected)}`
}

function renderPreviewPath(sourceGroups: ApiQuestionGroup[]): {
  visibleGroups: ApiQuestionGroup[]
  hiddenGroups: ApiQuestionGroup[]
} {
  const visibleGroups: ApiQuestionGroup[] = []
  const hiddenGroups: ApiQuestionGroup[] = []

  for (const group of sourceGroups) {
    const groupVisible = evaluateCondition(group.conditionExpression)
    if (!groupVisible) {
      hiddenGroups.push(group)
      continue
    }

    const visibleQuestions = group.questions.filter((question) =>
      evaluateCondition(question.conditionExpression),
    )
    const questions = group.randomize
      ? stableShuffle(visibleQuestions, `admin-preview:${group.id}`)
      : visibleQuestions

    if (questions.length) {
      visibleGroups.push({ ...group, questions })
    }
  }

  return { visibleGroups, hiddenGroups }
}

function evaluateCondition(expression?: ConditionExpression | null): boolean {
  if (!expression) return true
  if (Array.isArray(expression.all)) return expression.all.every(evaluateCondition)
  if (Array.isArray(expression.any)) return expression.any.some(evaluateCondition)
  if (expression.not) return !evaluateCondition(expression.not)

  const value = expression.questionCode
    ? previewAnswers[normalizeQuestionCode(expression.questionCode)]
    : undefined
  const operator =
    expression.operator ??
    (Object.prototype.hasOwnProperty.call(expression, 'equals') ? 'equals' : 'answered')
  const expected = expression.value ?? expression.equals

  switch (operator) {
    case 'answered':
      return value !== undefined && value !== null && value !== ''
    case 'not_answered':
      return value === undefined || value === null || value === ''
    case 'equals':
      return value === String(expected)
    case 'not_equals':
      return value !== String(expected)
    case 'contains':
      return String(value ?? '').includes(String(expected))
    case 'gt':
      return Number(value) > Number(expected)
    case 'gte':
      return Number(value) >= Number(expected)
    case 'lt':
      return Number(value) < Number(expected)
    case 'lte':
      return Number(value) <= Number(expected)
    default:
      return true
  }
}

function stableShuffle<T extends { id: string }>(items: T[], seed: string): T[] {
  return [...items]
    .map((item) => ({ item, score: seededScore(`${seed}:${item.id}`) }))
    .sort((left, right) => left.score - right.score)
    .map(({ item }) => item)
}

function seededScore(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
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

  if (index <= 0) return scale.leftAnchor || t('common.value', { value })
  if (index === lastIndex) return scale.rightAnchor || t('common.value', { value })
  if (scale.neutralLabel && index === neutralIndex) return scale.neutralLabel

  return t('common.towards', {
    anchor: index < neutralIndex ? scale.leftAnchor || t('common.minimum') : scale.rightAnchor || t('common.maximum'),
  })
}

function languageLabel(language: LanguageCode): string {
  return languageText(language)
}

function questionTypeLabel(type?: QuestionType): string {
  return questionTypeText(type)
}

async function performAction(action: () => Promise<string>): Promise<void> {
  localError.value = null
  localMessage.value = null

  try {
    localMessage.value = await action()
  } catch (caught) {
    localError.value = caught instanceof Error ? caught.message : t('common.error.action')
  }
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        :title="t('builder.title')"
        :description="t('builder.description')"
      >
        <template #actions>
          <button class="btn btn-outline-primary" type="button" @click="showStructureModal = true">{{ t('builder.actions.structure') }}</button>
          <button class="btn btn-outline-primary" type="button" @click="showPreview = !showPreview">
            {{ showPreview ? t('builder.actions.hidePreview') : t('builder.actions.showPreview') }}
          </button>
          <button
            class="btn btn-outline-secondary"
            type="button"
            :disabled="!selectedQuestionnaire || isSaving || selectedQuestionnaire.isPublished"
            @click="validatePublication"
          >{{ t('builder.actions.validate') }}</button>
          <button
            class="btn btn-success"
            type="button"
            :disabled="!selectedQuestionnaire || isSaving || selectedQuestionnaire.isPublished"
            @click="publishSelectedVersion"
          >{{ t('builder.actions.publish') }}</button>
          <button
            class="btn btn-primary"
            type="button"
            :disabled="!selectedQuestionnaire || isSaving || selectedQuestionnaire.isPublished"
            @click="saveMetadata"
          >{{ t('builder.actions.saveDraft') }}</button>
        </template>
      </PageHeader>
      <RoleGateInfo class="mb-4" />

      <div v-if="catalog.status === 'loading'" class="alert alert-info rounded-4" role="status">{{ t('builder.loading') }}</div>
      <div v-if="catalog.error" class="alert alert-danger rounded-4" role="alert">
        {{ catalog.error }}
      </div>
      <div v-if="localError" class="alert alert-danger rounded-4" role="alert">
        {{ localError }}
      </div>
      <div v-if="localMessage" class="alert alert-success rounded-4" role="status">
        {{ localMessage }}
      </div>
      <div
        v-if="publicationReport"
        class="alert rounded-4"
        :class="publicationReport.canPublish ? 'alert-success' : 'alert-warning'"
        role="status"
      >
        <strong>{{
          publicationReport.canPublish ? t('builder.status.publicationAllowed') : t('builder.status.publicationBlocked')
        }}</strong>
        <ul v-if="publicationReport.errors.length" class="mb-0 mt-2">
          <li v-for="error in publicationReport.errors" :key="error">{{ error }}</li>
        </ul>
      </div>

      <ModalPanel
        v-model="showStructureModal"
        :title="t('builder.structure.title')"
        :eyebrow="t('builder.structure.eyebrow')"
        :description="t('builder.structure.description')"
        size="lg"
      >
        <aside class="builder-sidebar admin-structure-panel p-3 border-0 shadow-none">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <h2 class="h5 fw-bold mb-0">{{ t('builder.structure.heading') }}</h2>
            <span class="badge-soft"
>{{ tp('common.questionsCount', selectedQuestionnaire?.questionCount ?? 0) }}</span
            >
          </div>

          <label class="form-label fw-bold" for="questionnaire-select">{{ t('common.questionnaire') }}</label>
          <select
            id="questionnaire-select"
            v-model="selectedQuestionnaireId"
            class="form-select mb-3"
            :aria-label="t('builder.structure.questionnaireAria')"
          >
            <option
              v-for="questionnaire in catalog.questionnaires"
              :key="questionnaire.id"
              :value="questionnaire.id"
            >
              {{ questionnaire.title }} · v{{ questionnaire.version }} ·
              {{ questionnaire.isPublished ? t('builder.status.published') : t('builder.status.draft') }}
            </option>
          </select>

          <details class="question-row mb-4" open>
            <summary class="builder-disclosure-summary">{{ t('builder.structure.createQuestionnaire') }}</summary>
            <label class="form-label small fw-bold" for="new-code">{{ t('common.code') }}</label>
            <input id="new-code" v-model="createQuestionnaireForm.code" class="form-control mb-2" />
            <label class="form-label small fw-bold" for="new-title">{{ t('common.title') }}</label>
            <input
              id="new-title"
              v-model="createQuestionnaireForm.title"
              class="form-control mb-2"
            />
            <label class="form-label small fw-bold" for="new-language">{{ t('builder.field.defaultLanguage') }}</label>
            <select
              id="new-language"
              v-model="createQuestionnaireForm.defaultLanguage"
              class="form-select mb-3"
            >
              <option
                v-for="language in supportedLanguages"
                :key="language.code"
                :value="language.code"
              >
                {{ language.label }}
              </option>
            </select>
            <button
              class="btn btn-outline-primary w-100"
              type="button"
              :disabled="isSaving"
              @click="createQuestionnaire"
            >{{ t('builder.actions.createDraft') }}</button>
          </details>

          <div class="d-flex align-items-center justify-content-between mb-2">
            <h3 class="h6 fw-bold mb-0">{{ t('common.groups') }}</h3>
            <span class="badge-soft">{{ selectedQuestionnaire?.groupCount ?? 0 }}</span>
          </div>
          <div class="d-grid gap-2 mb-4">
            <button
              v-for="group in selectedQuestionnaire?.groups ?? []"
              :key="group.id"
              class="builder-menu-item border-0 text-start"
              :class="{ active: group.id === selectedGroup?.id }"
              type="button"
              @click="selectGroup(group.id)"
            >
              <span>{{ group.title }}</span>
              <small>{{ group.questions.length }}</small>
            </button>
          </div>

          <details class="question-row" open>
            <summary class="builder-disclosure-summary">{{ t('builder.group.add') }}</summary>
            <label class="form-label small fw-bold" for="group-title">{{ t('builder.field.groupName') }}</label>
            <input id="group-title" v-model="groupForm.title" class="form-control mb-2" />
            <label class="form-label small fw-bold" for="group-description">{{ t('common.description') }}</label>
            <textarea
              id="group-description"
              v-model="groupForm.description"
              class="form-control mb-2"
              rows="2"
            ></textarea>
            <label class="form-label small fw-bold" for="group-questions-per-page"
              >{{ t('builder.field.questionsPerPage') }}</label
            >
            <input
              id="group-questions-per-page"
              v-model.number="groupForm.questionsPerPage"
              class="form-control mb-2"
              min="1"
              max="20"
              type="number"
            />
            <div class="form-check form-switch mb-3">
              <input
                id="group-randomize"
                v-model="groupForm.randomize"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label fw-semibold" for="group-randomize"
                >{{ t('builder.field.randomizeGroup') }}</label
              >
            </div>
            <div class="condition-line mb-3">
              <p class="page-header-eyebrow mb-2">{{ t('builder.condition.simple') }}</p>
              <label class="form-label small fw-bold" for="group-condition-code"
                >{{ t('builder.condition.triggerCode') }}</label
              >
              <input
                id="group-condition-code"
                v-model="groupForm.conditionQuestionCode"
                class="form-control mb-2"
                :placeholder="t('builder.placeholder.questionCode')"
              />
              <label class="form-label small fw-bold" for="group-condition-value"
                >{{ t('builder.condition.expectedValue') }}</label
              >
              <input
                id="group-condition-value"
                v-model="groupForm.conditionValue"
                class="form-control"
                :placeholder="t('builder.placeholder.languageExamples')"
              />
              <p class="form-text mb-0">{{ t('builder.condition.emptyHelp') }}</p>
            </div>
            <button
              class="btn btn-outline-primary w-100"
              type="button"
              :disabled="!selectedQuestionnaire || isSaving"
              @click="createGroup"
            >{{ t('builder.actions.addGroup') }}</button>
          </details>
        </aside>
      </ModalPanel>

      <div class="action-strip admin-structure-strip mb-4">
        <div>
          <p class="section-eyebrow mb-1">{{ t('builder.structure.active') }}</p>
          <h2 class="action-strip-title">
            {{ selectedQuestionnaire?.title ?? t('builder.structure.noneSelected') }}
          </h2>
          <p class="action-strip-description">
            {{ tp('common.groupsCount', selectedQuestionnaire?.groupCount ?? 0) }} ·
            {{ tp('common.questionsCount', selectedQuestionnaire?.questionCount ?? 0) }}
            <template v-if="selectedGroup"> · {{ t('builder.structure.currentGroup', { title: selectedGroup.title }) }}</template>
          </p>
        </div>
        <button class="btn btn-primary" type="button" @click="showStructureModal = true">{{ t('builder.actions.openStructure') }}</button>
      </div>

      <div class="page-workspace">
        <PageSectionNav :title="t('builder.navigation')" :sections="adminSections" />
        <div class="page-workspace-main admin-builder-flow">
          <div class="admin-builder-shell admin-builder-shell-single">
            <CollapsibleSection
              id="admin-editor"
              class="page-section"
              :title="t('builder.editor.title')"
              :badge="selectedQuestionnaire?.isPublished ? t('builder.status.published') : t('builder.status.draft')"
              :badge-tone="selectedQuestionnaire?.isPublished ? 'success' : 'warning'"
              body-class="compact"
            >
              <div class="screen-preview">
                <div class="screen-topbar">
                  <span class="window-dot"></span>
                  <span class="window-dot"></span>
                  <span class="window-dot"></span>
                  <strong class="ms-2 small muted">{{ t('builder.editor.connected') }}</strong>
                </div>

                <div class="p-3 p-lg-4">
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <div>
                      <p class="section-eyebrow mb-1">
                        {{
                          selectedQuestionnaire
                            ? `${selectedQuestionnaire.code} · v${selectedQuestionnaire.version}`
                            : t('builder.status.noDraft')
                        }}
                      </p>
                      <h2 class="h4 fw-bold mb-0">{{ t('builder.editor.settings') }}</h2>
                    </div>
                    <span class="badge-soft warning">{{ t('builder.editor.draftVersion') }}</span>
                  </div>

                  <div class="row g-3 mb-4">
                    <div class="col-md-8">
                      <label class="form-label fw-bold" for="metadata-title">{{ t('builder.field.displayTitle') }}</label>
                      <input
                        id="metadata-title"
                        v-model="metadataForm.title"
                        class="form-control"
                      />
                    </div>
                    <div class="col-md-4">
                      <label class="form-label fw-bold" for="metadata-language">{{ t('common.language') }}</label>
                      <select
                        id="metadata-language"
                        v-model="metadataForm.defaultLanguage"
                        class="form-select"
                      >
                        <option
                          v-for="language in supportedLanguages"
                          :key="language.code"
                          :value="language.code"
                        >
                          {{ language.label }}
                        </option>
                      </select>
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-bold" for="metadata-description"
                        >{{ t('common.description') }}</label
                      >
                      <textarea
                        id="metadata-description"
                        v-model="metadataForm.description"
                        class="form-control"
                        rows="2"
                      ></textarea>
                    </div>
                    <div class="col-12">
                      <label class="form-label fw-bold" for="metadata-finality"
                        >{{ t('builder.field.finality') }}</label
                      >
                      <textarea
                        id="metadata-finality"
                        v-model="metadataForm.finality"
                        class="form-control"
                        rows="2"
                      ></textarea>
                    </div>
                  </div>

                  <div class="question-row mb-4">
                    <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                      <div>
                        <p class="section-eyebrow mb-1">{{ t('builder.translation.eyebrow') }}</p>
                        <h3 class="h5 fw-bold mb-0">{{ t('builder.translation.title') }}</h3>
                      </div>
                      <span class="badge-soft">{{ t('builder.translation.currentVersion', { language: currentLanguageLabel }) }}</span>
                    </div>
                    <p class="small muted mb-3">
                      {{ t('builder.translation.help') }}
                    </p>
                    <div class="row g-3 align-items-end">
                      <div class="col-md-3">
                        <label class="form-label small fw-bold" for="translation-language"
                          >{{ t('builder.translation.newLanguage') }}</label
                        >
                        <select
                          id="translation-language"
                          v-model="translationForm.language"
                          class="form-select"
                        >
                          <option
                            v-for="language in supportedLanguages"
                            :key="language.code"
                            :value="language.code"
                          >
                            {{ language.label }}
                          </option>
                        </select>
                      </div>
                      <div class="col-md-5">
                        <label class="form-label small fw-bold" for="translation-title"
                          >{{ t('builder.translation.translationTitle') }}</label
                        >
                        <input
                          id="translation-title"
                          v-model="translationForm.title"
                          class="form-control"
                        />
                      </div>
                      <div class="col-md-4">
                        <button
                          class="btn btn-outline-primary w-100"
                          type="button"
                          :disabled="
                            !selectedQuestionnaire ||
                            isSaving ||
                            selectedQuestionnaire.language === translationForm.language
                          "
                          @click="addLanguageVersion"
                        >{{ t('builder.translation.createDraft') }}</button>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small fw-bold" for="translation-description"
                          >{{ t('builder.translation.description') }}</label
                        >
                        <input
                          id="translation-description"
                          v-model="translationForm.description"
                          class="form-control"
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small fw-bold" for="translation-finality"
                          >{{ t('builder.translation.finality') }}</label
                        >
                        <input
                          id="translation-finality"
                          v-model="translationForm.finality"
                          class="form-control"
                        />
                      </div>
                    </div>
                  </div>

                  <div v-if="selectedGroup" class="question-row mb-4">
                    <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                      <div>
                        <p class="section-eyebrow mb-1">{{ t('builder.group.selected') }}</p>
                        <h3 class="h5 fw-bold mb-0">{{ selectedGroup.title }}</h3>
                      </div>
                      <span class="badge-soft"
>{{ tp('common.questionsCount', selectedGroup.questions.length) }}</span
                      >
                    </div>
                    <div class="row g-3">
                      <div class="col-md-7">
                        <label class="form-label small fw-bold" for="edit-group-title"
                          >{{ t('builder.field.groupTitle') }}</label
                        >
                        <input
                          id="edit-group-title"
                          v-model="groupEditForm.title"
                          class="form-control"
                        />
                      </div>
                      <div class="col-md-5">
                        <label class="form-label small fw-bold" for="edit-group-qpp"
                          >{{ t('builder.field.questionsPerPage') }}</label
                        >
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
                        <label class="form-label small fw-bold" for="edit-group-description"
                          >{{ t('common.description') }}</label
                        >
                        <textarea
                          id="edit-group-description"
                          v-model="groupEditForm.description"
                          class="form-control"
                          rows="2"
                        ></textarea>
                      </div>
                      <div class="col-12 d-flex flex-wrap gap-2 align-items-center">
                        <div class="form-check form-switch me-auto">
                          <input
                            id="edit-group-randomize"
                            v-model="groupEditForm.randomize"
                            class="form-check-input"
                            type="checkbox"
                          />
                          <label class="form-check-label fw-semibold" for="edit-group-randomize"
                            >{{ t('builder.field.groupRandomization') }}</label
                          >
                        </div>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small fw-bold" for="edit-group-condition-code"
                          >{{ t('builder.condition.question') }}</label
                        >
                        <input
                          id="edit-group-condition-code"
                          v-model="groupEditForm.conditionQuestionCode"
                          class="form-control"
                          :placeholder="t('builder.placeholder.questionCode')"
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small fw-bold" for="edit-group-condition-value"
                          >{{ t('builder.condition.value') }}</label
                        >
                        <input
                          id="edit-group-condition-value"
                          v-model="groupEditForm.conditionValue"
                          class="form-control"
                          :placeholder="t('builder.placeholder.languageCode')"
                        />
                      </div>
                      <div
                        class="col-12 d-flex flex-wrap gap-2 align-items-center justify-content-end"
                      >
                        <span class="badge-soft">{{
                          conditionLabel(selectedGroup.conditionExpression)
                        }}</span>
                        <button
                          class="btn btn-outline-danger"
                          type="button"
                          :disabled="isSaving"
                          @click="archiveSelectedGroup"
                        >{{ t('common.archive') }}</button>
                        <button
                          class="btn btn-outline-primary"
                          type="button"
                          :disabled="isSaving"
                          @click="saveSelectedGroup"
                        >{{ t('builder.actions.saveGroup') }}</button>
                      </div>
                    </div>
                  </div>

                  <div class="question-row mb-4">
                    <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                      <div>
                        <p class="section-eyebrow mb-1">{{ t('common.questions') }}</p>
                        <h3 class="h5 fw-bold mb-0">
                          {{ editingQuestionId ? t('builder.questions.edit') : t('builder.questions.create') }}
                        </h3>
                      </div>
                      <button
                        class="btn btn-sm btn-outline-secondary"
                        type="button"
                        @click="resetQuestionForm"
                      >{{ t('common.reset') }}</button>
                    </div>

                    <div class="row g-3">
                      <div class="col-md-4">
                        <label class="form-label small fw-bold" for="question-code">{{ t('common.code') }}</label>
                        <input
                          id="question-code"
                          v-model="questionForm.code"
                          class="form-control"
                        />
                      </div>
                      <div class="col-md-8">
                        <label class="form-label small fw-bold" for="question-type"
                          >{{ t('builder.field.responseType') }}</label
                        >
                        <select
                          id="question-type"
                          v-model="questionForm.responseType"
                          class="form-select"
                        >
                          <option value="free_text_short">{{ t('questionType.free_text_short') }}</option>
                          <option value="free_text">{{ t('questionType.free_text') }}</option>
                          <option value="free_text_long">{{ t('questionType.free_text_long') }}</option>
                          <option value="single_choice">{{ t('questionType.single_choice') }}</option>
                          <option value="multiple_choice">{{ t('questionType.multiple_choice') }}</option>
                          <option value="likert">{{ t('questionType.likert') }}</option>
                          <option value="number">{{ t('questionType.number') }}</option>
                          <option value="date">{{ t('questionType.date') }}</option>
                          <option value="information">{{ t('questionType.information') }}</option>
                        </select>
                      </div>
                      <div class="col-12">
                        <label class="form-label small fw-bold" for="question-label"
                          >{{ t('builder.field.questionLabel') }}</label
                        >
                        <textarea
                          id="question-label"
                          v-model="questionForm.label"
                          class="form-control"
                          rows="2"
                        ></textarea>
                      </div>
                      <div class="col-12">
                        <label class="form-label small fw-bold" for="question-helper"
                          >{{ t('builder.field.helperText') }}</label
                        >
                        <input
                          id="question-helper"
                          v-model="questionForm.helperText"
                          class="form-control"
                        />
                      </div>

                      <template v-if="questionForm.responseType === 'likert'">
                        <div class="col-md-3">
                          <label class="form-label small fw-bold" for="likert-points">{{ t('builder.field.points') }}</label>
                          <input
                            id="likert-points"
                            v-model.number="questionForm.likertPoints"
                            class="form-control"
                            min="3"
                            max="10"
                            type="number"
                          />
                        </div>
                        <div class="col-md-3">
                          <label class="form-label small fw-bold" for="likert-min-value"
                            >{{ t('builder.field.firstValue') }}</label
                          >
                          <input
                            id="likert-min-value"
                            v-model.number="questionForm.likertMinValue"
                            class="form-control"
                            min="0"
                            max="10"
                            type="number"
                          />
                        </div>
                        <div class="col-md-3">
                          <label class="form-label small fw-bold" for="likert-left"
                            >{{ t('builder.field.leftLabel') }}</label
                          >
                          <input
                            id="likert-left"
                            v-model="questionForm.likertLeftAnchor"
                            class="form-control"
                          />
                        </div>
                        <div class="col-md-3">
                          <label class="form-label small fw-bold" for="likert-right"
                            >{{ t('builder.field.rightLabel') }}</label
                          >
                          <input
                            id="likert-right"
                            v-model="questionForm.likertRightAnchor"
                            class="form-control"
                          />
                        </div>
                      </template>

                      <template
                        v-if="
                          questionForm.responseType === 'single_choice' ||
                          questionForm.responseType === 'multiple_choice'
                        "
                      >
                        <div class="col-12">
                          <label class="form-label small fw-bold" for="question-options"
                            >{{ t('builder.field.answerOptions') }}</label
                          >
                          <textarea
                            id="question-options"
                            v-model="questionForm.answerOptionsText"
                            class="form-control"
                            rows="4"
                            :placeholder="t('builder.defaults.languageOptions')"
                          ></textarea>
                          <p class="form-text mb-0">{{ t('builder.field.optionPerLine') }}<code>{{ t('builder.field.optionFormat') }}</code>.
                          </p>
                        </div>
                      </template>

                      <div class="col-md-6">
                        <label class="form-label small fw-bold" for="question-condition-code"
                          >{{ t('builder.condition.question') }}</label
                        >
                        <input
                          id="question-condition-code"
                          v-model="questionForm.conditionQuestionCode"
                          class="form-control"
                          :placeholder="t('builder.placeholder.questionCode')"
                        />
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small fw-bold" for="question-condition-value"
                          >{{ t('builder.condition.expectedValue') }}</label
                        >
                        <input
                          id="question-condition-value"
                          v-model="questionForm.conditionValue"
                          class="form-control"
                          :placeholder="t('builder.placeholder.languageCode')"
                        />
                      </div>

                      <div class="col-12">
                        <div class="form-check form-switch">
                          <input
                            id="question-required"
                            v-model="questionForm.isRequired"
                            class="form-check-input"
                            type="checkbox"
                          />
                          <label class="form-check-label fw-semibold" for="question-required"
                            >{{ t('builder.field.required') }}</label
                          >
                        </div>
                      </div>
                    </div>

                    <hr class="my-4" />

                    <p class="section-eyebrow mb-2">{{ t('builder.popup.optional') }}</p>
                    <div class="row g-3">
                      <div class="col-md-5">
                        <label class="form-label small fw-bold" for="popup-title">{{ t('common.title') }}</label>
                        <input
                          id="popup-title"
                          v-model="questionForm.popupTitle"
                          class="form-control"
                          :placeholder="t('builder.placeholder.popupTitle')"
                        />
                      </div>
                      <div class="col-md-7">
                        <label class="form-label small fw-bold" for="popup-terms"
                          >{{ t('builder.popup.terms') }}</label
                        >
                        <input
                          id="popup-terms"
                          v-model="questionForm.popupTerms"
                          class="form-control"
                          :placeholder="t('builder.placeholder.popupTerms')"
                        />
                      </div>
                      <div class="col-12">
                        <label class="form-label small fw-bold" for="popup-body"
                          >{{ t('builder.popup.body') }}</label
                        >
                        <textarea
                          id="popup-body"
                          v-model="questionForm.popupBody"
                          class="form-control"
                          rows="3"
                        ></textarea>
                      </div>
                    </div>

                    <button
                      class="btn btn-primary w-100 mt-3"
                      type="button"
                      :disabled="!canCreateQuestion || isSaving"
                      @click="submitQuestion"
                    >
                      {{
                        editingQuestionId
                          ? t('builder.questions.update')
                          : t('builder.questions.addToDraft')
                      }}
                    </button>
                  </div>

                  <div v-if="!allQuestions.length" class="alert alert-warning rounded-3 mb-0">
                    {{ t('builder.questions.empty') }}
                  </div>
                  <div v-else class="compact-list content-scroll content-scroll-sm">
                    <div v-for="question in allQuestions" :key="question.id" class="question-row">
                      <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                        <span class="badge-soft">{{ question.code }}</span>
                        <span class="badge-soft success"
                          >{{ questionTypeLabel(question.responseType ?? question.type) }} ·
                          {{ question.answerScaleLabel }}</span
                        >
                      </div>
                      <h3 class="h6 fw-bold">{{ question.label ?? question.title }}</h3>
                      <p v-if="question.helperText" class="small muted mb-3">
                        {{ question.helperText }}
                      </p>
                      <div class="d-flex flex-wrap gap-2">
                        <button
                          class="btn btn-sm btn-outline-primary"
                          type="button"
                          @click="editQuestion(question)"
                        >{{ t('common.edit') }}</button>
                        <button
                          class="btn btn-sm btn-outline-danger"
                          type="button"
                          @click="archiveQuestion(question)"
                        >{{ t('common.archive') }}</button>
                        <span v-if="question.popupDefinitions?.length" class="badge-soft warning">
                          {{ question.popupDefinitions.length }} popup(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              v-if="showPreview"
              id="admin-preview"
              class="page-section admin-preview-section"
              :title="t('builder.preview.title')"
              :badge="t('builder.status.draft')"
              badge-tone="success"
              body-class="compact"
            >
              <div class="d-grid gap-4">
                <div class="demo-card flat">
                  <div class="d-flex flex-wrap justify-content-between gap-2 mb-3">
                    <div>
                      <p class="section-eyebrow mb-2">{{ t('builder.preview.questionnaire') }}</p>
                      <h2 class="h5 fw-bold mb-0">
                        {{ selectedQuestionnaire?.title ?? 'Questionnaire' }}
                      </h2>
                    </div>
                    <span class="badge-soft success">{{ t('builder.preview.unpublished') }}</span>
                  </div>
                  <p class="muted">{{ selectedQuestionnaire?.description }}</p>

                  <div class="question-help mb-3">
                    <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                      <div>
                        <p class="page-header-eyebrow mb-1">{{ t('builder.preview.simulation') }}</p>
                        <strong>{{ t('builder.preview.testValues') }}</strong>
                      </div>
                      <span class="badge-soft warning">{{ t('builder.preview.stableRandomization') }}</span>
                    </div>
                    <div class="row g-2 align-items-end">
                      <div class="col-md-6">
                        <label class="form-label small fw-bold" for="preview-lang"
>{{ t('builder.preview.q001Label') }}</label
                        >
                        <select
                          id="preview-lang"
                          v-model="previewAnswers['Q-001']"
                          class="form-select form-select-sm"
                        >
                          <option value="">{{ t('builder.preview.unanswered') }}</option>
                          <option value="fr">{{ t('language.fr') }}</option>
                          <option value="en">{{ t('language.en') }}</option>
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label small fw-bold" for="preview-q002"
>{{ t('builder.preview.q002Label') }}</label
                        >
                        <select
                          id="preview-q002"
                          v-model="previewAnswers['Q-002']"
                          class="form-select form-select-sm"
                        >
                          <option value="">{{ t('builder.preview.unanswered') }}</option>
                          <option value="yes">{{ t('common.yes') }}</option>
                          <option value="no">{{ t('common.no') }}</option>
                        </select>
                      </div>
                    </div>
                    <div v-if="hiddenPreviewGroups.length" class="mt-3 d-flex flex-wrap gap-2">
                      <span
                        v-for="group in hiddenPreviewGroups"
                        :key="group.id"
                        class="badge-soft danger"
                      >
                        {{ t('builder.preview.hiddenGroup', { title: group.title, condition: conditionLabel(group.conditionExpression) }) }}
                      </span>
                    </div>
                  </div>

                  <div class="content-scroll content-scroll-lg">
                    <div v-for="group in previewGroups" :key="group.id" class="question-row mb-3">
                      <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                        <span class="badge-soft"
>{{ t('builder.preview.groupSummary', { title: group.title, count: group.questionsPerPage }) }}</span
                        >
                        <span v-if="group.randomize" class="badge-soft warning"
                          >{{ t('builder.preview.randomOrder') }}</span
                        >
                        <span v-if="group.conditionExpression" class="badge-soft">{{
                          conditionLabel(group.conditionExpression)
                        }}</span>
                      </div>
                      <p v-if="group.description" class="small muted">{{ group.description }}</p>

                      <div
                        v-for="question in group.questions"
                        :key="question.id"
                        class="question-row mb-2"
                      >
                        <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                          <span class="badge-soft">{{ question.code }}</span>
                          <span class="badge-soft">{{
                            questionTypeLabel(question.responseType ?? question.type)
                          }}</span>
                          <span v-if="question.conditionExpression" class="badge-soft warning">{{
                            conditionLabel(question.conditionExpression)
                          }}</span>
                        </div>
                        <h3 class="h6 fw-bold">{{ question.label ?? question.title }}</h3>
                        <p v-if="question.helperText" class="small muted">
                          {{ question.helperText }}
                        </p>

                        <div
                          v-if="question.responseType === 'likert' && question.likertScale"
                          class="mb-3"
                        >
                          <p class="small muted mb-2">
                            {{ question.likertScale.leftAnchor }} ·
                            {{ question.likertScale.rightAnchor }}
                          </p>
                          <div
                            class="likert-scale"
                            role="group"
                            :aria-label="t('respondent.likert.group', { points: question.likertScale.points, label: question.label ?? question.title })"
                          >
                            <div
                              v-for="value in likertValues(question.likertScale)"
                              :key="value"
                              class="likert-choice"
                            >
                              <span class="likert-choice-label">{{
                                likertLabel(question.likertScale, value)
                              }}</span>
                              <button
                                class="likert-dot border-0"
                                type="button"
                                :aria-label="t('respondent.likert.valueLabel', { label: likertLabel(question.likertScale, value), value })"
                              >
                                {{ value }}
                              </button>
                            </div>
                          </div>
                        </div>
                        <div
                          v-else-if="
                            question.responseType === 'single_choice' ||
                            question.responseType === 'multiple_choice'
                          "
                          class="d-grid gap-2 mb-3"
                        >
                          <button
                            v-for="option in question.options"
                            :key="option.id"
                            class="btn btn-outline-primary text-start"
                            type="button"
                          >
                            {{ option.label }}
                          </button>
                        </div>
                        <input
                          v-else-if="question.responseType === 'number'"
                          class="form-control mb-3"
                          type="number"
                          :placeholder="t('questionType.number')"
                        />
                        <input
                          v-else-if="question.responseType === 'date'"
                          class="form-control mb-3"
                          type="date"
                        />
                        <div
                          v-else-if="question.responseType === 'information'"
                          class="alert alert-info rounded-4 mb-3"
                        >{{ t('builder.preview.informationOnly') }}</div>
                        <textarea
                          v-else
                          class="form-control mb-3"
                          rows="3"
                          :placeholder="t('builder.placeholder.respondentAnswer')"
                        ></textarea>

                        <div v-if="question.popupDefinitions?.length" class="info-bubble-list mb-3">
                          <span
                            v-for="popup in question.popupDefinitions ?? []"
                            :key="popup.id"
                            class="info-bubble"
                          >
                            <span class="info-bubble-icon" aria-hidden="true">i</span>
                            {{ popup.title }}
                          </span>
                        </div>

                        <div
                          v-for="popup in question.popupDefinitions ?? []"
                          :key="popup.id"
                          class="question-help mb-2"
                        >
                          <div class="d-flex justify-content-between gap-3">
                            <strong>{{ popup.title }}</strong>
                            <span class="badge-soft warning">{{ t('builder.preview.popup') }}</span>
                          </div>
                          <p class="small muted mb-0 mt-2">{{ popup.body }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="demo-card flat">
                  <p class="page-header-eyebrow mb-2">{{ t('builder.features.title') }}</p>
                  <div class="d-grid gap-2">
                    <span class="badge-soft success">{{ t('builder.features.noCode') }}</span>
                    <span class="badge-soft success">{{ t('builder.features.conditions') }}</span>
                    <span class="badge-soft success">{{ t('builder.features.multilingual') }}</span>
                    <span class="badge-soft success">{{ t('builder.features.randomization') }}</span>
                    <span class="badge-soft success">{{ t('builder.features.popups') }}</span>
                  </div>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
