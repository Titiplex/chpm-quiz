<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import CollapsibleSection from '@/components/common/CollapsibleSection.vue'
import KpiCard from '@/components/common/KpiCard.vue'
import ModalPanel from '@/components/common/ModalPanel.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import NotificationPreferencesCard from '@/components/notifications/NotificationPreferencesCard.vue'
import SiteTeamPanel from '@/components/moderation/SiteTeamPanel.vue'
import { appConfig } from '@/config/env'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'
import { downloadQuestionnairePdf } from '@/services/questionnairePdf'
import { useModerationStore } from '@/stores/moderation'
import { useSessionStore } from '@/stores/session'
import type { ApiInvitation, ApiQuestion, ApiQuestionnaire } from '@shared/types/api'
import type { AssistanceMode, InvitationDeliveryMode, InvitationStatus } from '@shared/types/domain'

const catalog = useCatalogStore()
const moderation = useModerationStore()
const session = useSessionStore()
const copiedLink = ref<'respondent' | 'terminal' | 'registered' | null>(null)
const showInvitationModal = ref(false)
const showTerminalRegistrationModal = ref(false)
const showPaperEntryModal = ref(false)
const paperEntryInvitation = ref<ApiInvitation | null>(null)
const paperEntryAnswers = reactive<Record<string, unknown>>({})
const paperEntryNote = ref('')
const paperEntryError = ref<string | null>(null)
const paperEntrySuccess = ref<string | null>(null)

const form = reactive({
  questionnaireVersionId: '',
  buildingId: '',
  email: 'personne.exemple@domaine.org',
  deliveryMode: 'email_simulation' as InvitationDeliveryMode,
  terminalDeviceId: '',
  refusalReason: '',
  assistanceMode: 'none' as AssistanceMode,
  notifyModerator: true,
  notifyAdmins: false,
})

const terminalForm = reactive({
  buildingId: '',
  label: 'Tablette accueil · bâtiment',
})

onMounted(async () => {
  await catalog.fetchCatalog()
  await moderation.refresh()

  form.questionnaireVersionId = questionnaires.value[0]?.versionId ?? ''
  form.buildingId = catalog.buildings[0]?.id ?? ''
  terminalForm.buildingId = catalog.buildings[0]?.id ?? ''
  form.terminalDeviceId = compatibleTerminalDevices.value[0]?.id ?? ''
})

const questionnaires = computed(() =>
  catalog.publishedQuestionnaires.filter((questionnaire) => isQuestionnaireOpen(questionnaire.openFrom, questionnaire.openUntil)),
)
const total = computed(() => moderation.totals)
const canAdministerTerminals = computed(() => ['admin', 'site_manager', 'technical_admin'].includes(session.currentRole))
const compatibleTerminalDevices = computed(() =>
  moderation.terminalDevices.filter((device) => device.building.id === form.buildingId && device.status === 'active'),
)
const requiresEmail = computed(() => form.deliveryMode === 'email' || form.deliveryMode === 'email_simulation')
const requiresTerminal = computed(() => form.deliveryMode === 'onsite_terminal')
const isPaperForm = computed(() => form.deliveryMode === 'paper_form')
const isRefusalRecord = computed(() => form.deliveryMode === 'refusal_record')
const selectedQuestionnaire = computed(() => findQuestionnaireByVersionId(form.questionnaireVersionId))
const paperEntryQuestionnaire = computed(() => paperEntryInvitation.value ? findQuestionnaireByVersionId(paperEntryInvitation.value.questionnaireVersionId) : null)
const paperEntryQuestions = computed(() => paperEntryQuestionnaire.value?.groups.flatMap((group) => group.questions) ?? [])
const missingPaperEntryRequiredQuestions = computed(() => paperEntryQuestions.value.filter((question) => question.isRequired && question.responseType !== 'information' && !hasPaperAnswer(question)))
const invitationActionDisabled = computed(() => (
  moderation.status === 'creating'
  || !questionnaires.value.length
  || (requiresTerminal.value && !form.terminalDeviceId)
  || (requiresEmail.value && !form.email)
))


watch(
  () => [form.buildingId, form.deliveryMode, moderation.terminalDevices.length],
  () => {
    if (form.deliveryMode !== 'onsite_terminal') return
    if (!compatibleTerminalDevices.value.some((device) => device.id === form.terminalDeviceId)) {
      form.terminalDeviceId = compatibleTerminalDevices.value[0]?.id ?? ''
    }
  },
)


function findQuestionnaireByVersionId(versionId: string): ApiQuestionnaire | null {
  return catalog.publishedQuestionnaires.find((questionnaire) => questionnaire.versionId === versionId) ?? null
}

function downloadBlankQuestionnairePdf(): void {
  if (!selectedQuestionnaire.value) return

  downloadQuestionnairePdf({
    questionnaire: selectedQuestionnaire.value,
    generatedBy: session.user?.displayName ?? null,
  })
}

function downloadInvitationQuestionnairePdf(invitation: ApiInvitation): void {
  const questionnaire = findQuestionnaireByVersionId(invitation.questionnaireVersionId)
  if (!questionnaire) return

  downloadQuestionnairePdf({
    questionnaire,
    publicCode: invitation.publicCode,
    buildingLabel: invitation.building.label,
    generatedBy: session.user?.displayName ?? null,
  })
}

function openPaperEntry(invitation: ApiInvitation): void {
  paperEntryInvitation.value = invitation
  paperEntryError.value = null
  paperEntrySuccess.value = null
  paperEntryNote.value = ''

  for (const key of Object.keys(paperEntryAnswers)) {
    delete paperEntryAnswers[key]
  }

  for (const question of findQuestionnaireByVersionId(invitation.questionnaireVersionId)?.groups.flatMap((group) => group.questions) ?? []) {
    if (question.responseType === 'multiple_choice') {
      paperEntryAnswers[question.id] = []
    }
  }

  showPaperEntryModal.value = true
}

function paperQuestionValue(question: ApiQuestion): unknown {
  return paperEntryAnswers[question.id] ?? (question.responseType === 'multiple_choice' ? [] : '')
}

function setPaperAnswer(question: ApiQuestion, value: unknown): void {
  paperEntryAnswers[question.id] = value
}

function togglePaperMultipleChoice(question: ApiQuestion, value: string): void {
  const current = Array.isArray(paperEntryAnswers[question.id]) ? [...paperEntryAnswers[question.id] as string[]] : []
  paperEntryAnswers[question.id] = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]
}

function isPaperOptionSelected(question: ApiQuestion, value: string): boolean {
  const current = paperEntryAnswers[question.id]
  return Array.isArray(current) && current.includes(value)
}

function hasPaperAnswer(question: ApiQuestion): boolean {
  const value = paperEntryAnswers[question.id]
  if (question.responseType === 'information') return true
  if (Array.isArray(value)) return value.length > 0
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

function paperAnswersPayload(): Array<{ questionId: string; value: unknown }> {
  return paperEntryQuestions.value
    .filter((question) => question.responseType !== 'information')
    .filter((question) => hasPaperAnswer(question))
    .map((question) => ({ questionId: question.id, value: normalizePaperAnswer(question, paperEntryAnswers[question.id]) }))
}

function normalizePaperAnswer(question: ApiQuestion, value: unknown): unknown {
  if (question.responseType === 'number') {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : value
  }

  return value
}

async function submitPaperEntry(): Promise<void> {
  if (!paperEntryInvitation.value) return

  paperEntryError.value = null
  paperEntrySuccess.value = null

  if (missingPaperEntryRequiredQuestions.value.length) {
    paperEntryError.value = `${missingPaperEntryRequiredQuestions.value.length} question(s) obligatoire(s) restent sans réponse.`
    return
  }

  try {
    const response = await moderation.submitPaperResponses(paperEntryInvitation.value.id, {
      answers: paperAnswersPayload(),
      moderatorNote: paperEntryNote.value.trim() || undefined,
    })
    paperEntrySuccess.value = `Saisie papier verrouillée pour le code ${response.submission.publicCode}.`
    showPaperEntryModal.value = false
    await moderation.refresh()
  } catch (caught) {
    paperEntryError.value = caught instanceof Error ? caught.message : 'Saisie papier impossible.'
  }
}

function canEnterPaperResponses(invitation: ApiInvitation): boolean {
  return invitation.deliveryMode === 'paper_form' && !['submitted', 'cancelled', 'blocked', 'expired'].includes(invitation.status)
}

async function submitInvitation() {
  copiedLink.value = null
  await moderation.createInvitation({
    questionnaireVersionId: form.questionnaireVersionId,
    buildingId: form.buildingId,
    email: requiresEmail.value ? form.email : undefined,
    deliveryMode: form.deliveryMode,
    terminalDeviceId: requiresTerminal.value ? form.terminalDeviceId : undefined,
    refusalReason: isRefusalRecord.value ? form.refusalReason : undefined,
    assistanceMode: form.assistanceMode,
    notifyModerator: form.notifyModerator,
    notifyAdmins: form.notifyAdmins,
  })
}

async function registerTerminal() {
  copiedLink.value = null
  await moderation.registerTerminalDevice({
    buildingId: terminalForm.buildingId,
    label: terminalForm.label,
  })
}

async function copyLink(kind: 'respondent' | 'terminal' | 'registered', link: string | null): Promise<void> {
  if (!link) return
  await navigator.clipboard?.writeText(link)
  copiedLink.value = kind
}

async function resend(invitation: ApiInvitation): Promise<void> {
  await moderation.resendInvitation(invitation.id)
}

function isQuestionnaireOpen(openFrom?: string | null, openUntil?: string | null): boolean {
  const now = Date.now()
  const startsAt = openFrom ? new Date(openFrom).getTime() : Number.NEGATIVE_INFINITY
  const endsAt = openUntil ? new Date(openUntil).getTime() : Number.POSITIVE_INFINITY
  return startsAt <= now && endsAt >= now
}

function statusLabel(status: InvitationStatus): string {
  const labels: Record<InvitationStatus, string> = {
    pending: 'En attente',
    sent: 'Envoyée',
    opened: 'Ouverte',
    in_progress: 'En cours',
    draft: 'Brouillon',
    submitted: 'Soumise',
    expired: 'Expirée',
    blocked: 'Bloquée',
    cancelled: 'Annulée',
  }

  return labels[status] ?? status
}

function deliveryLabel(mode: InvitationDeliveryMode): string {
  return {
    email: 'Email',
    email_simulation: 'Email simulé',
    onsite_terminal: 'Terminal',
    paper_form: 'Papier',
    refusal_record: 'Refus',
  }[mode]
}

function invitationStatusLabel(invitation: ApiInvitation): string {
  if (invitation.deliveryMode === 'refusal_record') return 'Refus enregistré'
  if (invitation.deliveryMode === 'paper_form' && invitation.status === 'sent') return 'Papier remis'
  return statusLabel(invitation.status)
}

function invitationDestination(invitation: ApiInvitation): string {
  if (invitation.deliveryMode === 'onsite_terminal') return invitation.terminalDevice?.label ?? 'Terminal non renseigné'
  if (invitation.deliveryMode === 'paper_form') return 'Version papier remise'
  if (invitation.deliveryMode === 'refusal_record') return 'Aucun contact collecté'
  return invitation.maskedEmail ?? '—'
}

function statusTone(status: InvitationStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'submitted') return 'success'
  if (['expired', 'blocked', 'cancelled'].includes(status)) return 'danger'
  if (['opened', 'in_progress', 'draft'].includes(status)) return 'warning'
  return 'neutral'
}

function canResend(invitation: ApiInvitation): boolean {
  if (invitation.deliveryMode === 'paper_form' || invitation.deliveryMode === 'refusal_record') return false
  return !['submitted', 'cancelled', 'blocked', 'expired'].includes(invitation.status)
}

function invitationSubmitLabel(): string {
  if (moderation.status === 'creating') return 'Enregistrement…'
  if (requiresTerminal.value) return 'Envoyer au terminal'
  if (isPaperForm.value) return 'Enregistrer la version papier'
  if (isRefusalRecord.value) return 'Enregistrer le refus'
  return 'Envoyer l\'invitation'
}

function paperLikertValues(question: ApiQuestion): number[] {
  if (!question.likertScale) return []
  const minValue = question.likertScale.minValue ?? 1
  return Array.from({ length: question.likertScale.points }, (_, index) => minValue + index)
}

function paperLikertLabel(question: ApiQuestion, value: number): string {
  const scale = question.likertScale
  if (!scale) return String(value)
  const values = paperLikertValues(question)
  const index = values.indexOf(value)
  const lastIndex = values.length - 1
  const neutralIndex = Math.floor(lastIndex / 2)

  if (index <= 0) return scale.leftAnchor || `Valeur ${value}`
  if (index === lastIndex) return scale.rightAnchor || `Valeur ${value}`
  if (scale.neutralLabel && index === neutralIndex) return scale.neutralLabel
  return `Valeur ${value}`
}

</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        title="Modération"
        :description="appConfig.demoMode ? 'Suivez les invitations, les refus et les passations sans contact numérique.' : 'Suivez les invitations, les refus et les passations sans contact numérique de votre périmètre.'"
        :badge="appConfig.demoMode ? 'Démo' : 'Connecté'"
      >
        <template #actions>
          <button class="btn btn-primary" type="button" @click="showInvitationModal = true">
            + Nouvelle invitation
          </button>
        </template>
      </PageHeader>
      <RoleGateInfo />

      <div v-if="catalog.status === 'error' || moderation.status === 'error'" class="alert alert-danger rounded-3 mb-4" role="alert">
        {{ catalog.error || moderation.error }}
      </div>

      <ModalPanel
        v-model="showInvitationModal"
        title="Nouvelle invitation"
        eyebrow="Diffusion contrôlée"
        description="Le formulaire est isolé de la page pour éviter d’écraser le suivi quotidien. Aucun email n’est affiché dans les tableaux métier."
        size="lg"
      >
        <form @submit.prevent="submitInvitation">
          <label class="form-label fw-semibold" for="questionnaire-select">Questionnaire</label>
          <select id="questionnaire-select" v-model="form.questionnaireVersionId" class="form-select mb-2" required>
            <option value="" disabled>Choisir un questionnaire</option>
            <option v-for="questionnaire in questionnaires" :key="questionnaire.versionId" :value="questionnaire.versionId">
              {{ questionnaire.title }} · v{{ questionnaire.versionLabel }}
            </option>
          </select>
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <button class="btn btn-outline-primary btn-sm" type="button" :disabled="!selectedQuestionnaire" @click="downloadBlankQuestionnairePdf">
              Télécharger le PDF vierge
            </button>
            <span class="small" style="color: var(--chm-muted);">Support imprimable généré depuis la version publiée sélectionnée.</span>
          </div>

          <label class="form-label fw-semibold" for="building-select">Bâtiment</label>
          <select id="building-select" v-model="form.buildingId" class="form-select mb-3" required>
            <option value="" disabled>Choisir un bâtiment</option>
            <option v-for="building in catalog.buildings" :key="building.id" :value="building.id">
              {{ building.label }} · {{ building.country }}
            </option>
          </select>

          <label class="form-label fw-semibold" for="delivery-mode">Canal d'envoi</label>
          <select id="delivery-mode" v-model="form.deliveryMode" class="form-select mb-3" required>
            <option value="email_simulation">Email simulé</option>
            <option value="email">Email réel</option>
            <option value="onsite_terminal">Terminal hospitalier · sans email/SMS</option>
            <option value="paper_form">Version papier · sans email/SMS</option>
            <option value="refusal_record">Refus de répondre · aucun contact collecté</option>
          </select>

          <template v-if="requiresTerminal">
            <label class="form-label fw-semibold" for="terminal-select">Terminal cible</label>
            <select id="terminal-select" v-model="form.terminalDeviceId" class="form-select mb-3" required>
              <option value="" disabled>Choisir un terminal actif</option>
              <option v-for="device in compatibleTerminalDevices" :key="device.id" :value="device.id">
                {{ device.label }} · {{ device.pendingInvitationCount }} en attente
              </option>
            </select>

            <label class="form-label fw-semibold" for="assistance-mode">Accompagnement</label>
            <select id="assistance-mode" v-model="form.assistanceMode" class="form-select mb-4">
              <option value="none">Autonome</option>
              <option value="technical_help">Aide technique</option>
              <option value="full_assisted_entry">Saisie assistée</option>
            </select>
          </template>

          <template v-else-if="requiresEmail">
            <label class="form-label fw-semibold" for="respondent-email">Email du répondant</label>
            <input id="respondent-email" v-model="form.email" class="form-control mb-4" type="email" required />
          </template>
          <template v-else-if="isPaperForm">
            <div class="alert alert-warning rounded-3 mb-4">
              Aucune donnée de contact n’est collectée. La ligne sert uniquement à compter une passation papier dans les statistiques terrain.
            </div>
          </template>
          <template v-else-if="isRefusalRecord">
            <label class="form-label fw-semibold" for="refusal-reason">Motif interne optionnel</label>
            <textarea id="refusal-reason" v-model="form.refusalReason" class="form-control mb-4" rows="2" maxlength="300" placeholder="Ex. refuse de donner un email/téléphone, refuse le questionnaire, indisponible…"></textarea>
            <div class="alert alert-warning rounded-3 mb-4">
              Le refus est agrégé dans les statistiques. Aucun email, SMS, téléphone ou identité patient n’est demandé.
            </div>
          </template>

          <div class="row g-3 mb-4">
            <div class="col-md-6">
              <div class="form-check form-switch">
                <input id="notifyModerator" v-model="form.notifyModerator" class="form-check-input" type="checkbox" />
                <label class="form-check-label fw-semibold" for="notifyModerator">Notifier le modérateur</label>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-check form-switch">
                <input id="notifyAdmin" v-model="form.notifyAdmins" class="form-check-input" type="checkbox" />
                <label class="form-check-label fw-semibold" for="notifyAdmin">Notifier les admins</label>
              </div>
            </div>
          </div>

          <button class="btn btn-primary w-100 btn-lg" :disabled="invitationActionDisabled">
            {{ invitationSubmitLabel() }}
          </button>

          <div v-if="moderation.lastCreatedLink || moderation.lastCreatedTerminalLink || moderation.lastCreatedInvitation" class="alert alert-info rounded-3 mt-3 mb-0">
            <template v-if="moderation.lastCreatedLink">
              <strong>Lien répondant :</strong>
              <a class="d-block text-break small mt-1" :href="moderation.lastCreatedLink">{{ moderation.lastCreatedLink }}</a>
              <button class="btn btn-sm btn-outline-primary mt-2" type="button" @click="copyLink('respondent', moderation.lastCreatedLink)">
                {{ copiedLink === 'respondent' ? '✓ Copié' : 'Copier le lien' }}
              </button>
            </template>
            <template v-else>
              <strong>{{ moderation.lastCreatedInvitation?.deliveryMode === 'refusal_record' ? 'Refus enregistré.' : moderation.lastCreatedInvitation?.deliveryMode === 'paper_form' ? 'Version papier enregistrée.' : 'Invitation affectée au terminal.' }}</strong>
              <template v-if="moderation.lastCreatedInvitation?.deliveryMode === 'paper_form'">
                <button class="btn btn-sm btn-outline-primary mt-2 me-2" type="button" @click="downloadInvitationQuestionnairePdf(moderation.lastCreatedInvitation)">
                  Télécharger le PDF avec code
                </button>
                <button class="btn btn-sm btn-primary mt-2" type="button" @click="openPaperEntry(moderation.lastCreatedInvitation)">
                  Saisir les réponses papier
                </button>
              </template>
              <template v-if="moderation.lastCreatedTerminalLink">
                <a class="d-block text-break small mt-1" :href="moderation.lastCreatedTerminalLink">{{ moderation.lastCreatedTerminalLink }}</a>
                <button class="btn btn-sm btn-outline-primary mt-2" type="button" @click="copyLink('terminal', moderation.lastCreatedTerminalLink)">
                  {{ copiedLink === 'terminal' ? '✓ Copié' : 'Copier le lien' }}
                </button>
              </template>
            </template>
            <p v-if="moderation.lastCreatedInvitation" class="small mb-0 mt-2" style="color: var(--chm-muted);">
              Code : {{ moderation.lastCreatedInvitation.publicCode }} · {{ invitationStatusLabel(moderation.lastCreatedInvitation) }}
            </p>
          </div>
        </form>
      </ModalPanel>

      <ModalPanel
        v-if="canAdministerTerminals"
        v-model="showTerminalRegistrationModal"
        title="Enregistrer un terminal"
        eyebrow="Appairage local"
        description="À utiliser seulement pour créer un lien d’appairage destiné à l’appareil hospitalier cible."
        size="md"
      >
        <form @submit.prevent="registerTerminal">
          <label class="form-label fw-semibold" for="moderation-terminal-building">Bâtiment</label>
          <select id="moderation-terminal-building" v-model="terminalForm.buildingId" class="form-select mb-3" required>
            <option v-for="building in catalog.buildings" :key="building.id" :value="building.id">{{ building.label }}</option>
          </select>
          <label class="form-label fw-semibold" for="moderation-terminal-label">Libellé de l'appareil</label>
          <input id="moderation-terminal-label" v-model="terminalForm.label" class="form-control mb-3" required />
          <button class="btn btn-primary w-100" type="submit">Créer le lien d'appairage</button>
          <div v-if="moderation.lastRegisteredTerminalLink" class="alert alert-info rounded-3 mt-3 mb-0">
            <strong>Lien d'appairage :</strong>
            <a class="d-block text-break small mt-1" :href="moderation.lastRegisteredTerminalLink">{{ moderation.lastRegisteredTerminalLink }}</a>
            <button class="btn btn-sm btn-outline-primary mt-2" type="button" @click="copyLink('registered', moderation.lastRegisteredTerminalLink)">
              {{ copiedLink === 'registered' ? '✓ Copié' : 'Copier le lien' }}
            </button>
          </div>
        </form>
      </ModalPanel>

      <ModalPanel
        v-model="showPaperEntryModal"
        title="Saisie des réponses papier"
        eyebrow="Double saisie modérateur"
        description="Recopiez uniquement les réponses inscrites sur le formulaire papier. La soumission sera verrouillée sous le code public, sans contact email/SMS."
        size="xl"
      >
        <div v-if="paperEntryInvitation && paperEntryQuestionnaire">
          <div class="alert alert-info rounded-3">
            <strong>Code public : {{ paperEntryInvitation.publicCode }}</strong><br />
            Questionnaire : {{ paperEntryQuestionnaire.title }} · Bâtiment : {{ paperEntryInvitation.building.label }}
          </div>

          <div v-if="paperEntryError" class="alert alert-danger rounded-3" role="alert">{{ paperEntryError }}</div>
          <div v-if="paperEntrySuccess" class="alert alert-success rounded-3" role="status">{{ paperEntrySuccess }}</div>

          <form @submit.prevent="submitPaperEntry">
            <div v-for="group in paperEntryQuestionnaire.groups" :key="group.id" class="paper-entry-group mb-4">
              <h3 class="h5 fw-bold">{{ group.title }}</h3>
              <p v-if="group.description" class="small" style="color: var(--chm-muted);">{{ group.description }}</p>

              <div v-for="question in group.questions" :key="question.id" class="question-row mb-3">
                <div class="d-flex flex-wrap justify-content-between gap-2 mb-2">
                  <span class="badge-soft">{{ question.code }} · {{ question.responseType }}</span>
                  <span v-if="question.isRequired" class="badge-soft warning">Obligatoire</span>
                </div>
                <label class="form-label fw-semibold">{{ question.label }}</label>
                <p v-if="question.helperText" class="small" style="color: var(--chm-muted);">{{ question.helperText }}</p>

                <div v-if="question.responseType === 'likert' && question.likertScale" class="likert-scale mb-2">
                  <div v-for="value in paperLikertValues(question)" :key="value" class="likert-choice">
                    <span class="likert-choice-label">{{ paperLikertLabel(question, value) }}</span>
                    <button
                      class="likert-dot border-0"
                      :class="Number(paperQuestionValue(question)) === value ? 'active' : ''"
                      type="button"
                      @click="setPaperAnswer(question, value)"
                    >
                      {{ value }}
                    </button>
                  </div>
                  <div v-if="question.likertScale.allowNotApplicable" class="likert-choice">
                    <span class="likert-choice-label">Sans objet</span>
                    <button
                      class="btn btn-sm likert-extra-button"
                      :class="paperQuestionValue(question) === 'not_applicable' ? 'btn-primary' : 'btn-outline-primary'"
                      type="button"
                      @click="setPaperAnswer(question, 'not_applicable')"
                    >
                      Non applicable
                    </button>
                  </div>
                </div>

                <div v-else-if="question.responseType === 'single_choice'" class="d-grid gap-2 mb-2">
                  <button
                    v-for="option in question.options"
                    :key="option.id"
                    class="btn text-start"
                    :class="paperQuestionValue(question) === option.value ? 'btn-primary' : 'btn-outline-primary'"
                    type="button"
                    @click="setPaperAnswer(question, option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>

                <div v-else-if="question.responseType === 'multiple_choice'" class="d-grid gap-2 mb-2">
                  <button
                    v-for="option in question.options"
                    :key="option.id"
                    class="btn text-start"
                    :class="isPaperOptionSelected(question, option.value) ? 'btn-primary' : 'btn-outline-primary'"
                    type="button"
                    @click="togglePaperMultipleChoice(question, option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>

                <input
                  v-else-if="question.responseType === 'number'"
                  class="form-control mb-2"
                  type="number"
                  :value="String(paperQuestionValue(question) ?? '')"
                  @input="setPaperAnswer(question, ($event.target as HTMLInputElement).value)"
                />

                <input
                  v-else-if="question.responseType === 'date'"
                  class="form-control mb-2"
                  type="date"
                  :value="String(paperQuestionValue(question) ?? '')"
                  @input="setPaperAnswer(question, ($event.target as HTMLInputElement).value)"
                />

                <div v-else-if="question.responseType === 'information'" class="alert alert-info rounded-3 mb-2">
                  Information seulement, aucune réponse à saisir.
                </div>

                <textarea
                  v-else
                  class="form-control mb-2"
                  rows="3"
                  :value="String(paperQuestionValue(question) ?? '')"
                  @input="setPaperAnswer(question, ($event.target as HTMLTextAreaElement).value)"
                ></textarea>
              </div>
            </div>

            <label class="form-label fw-semibold" for="paper-entry-note">Note interne optionnelle</label>
            <textarea id="paper-entry-note" v-model="paperEntryNote" class="form-control mb-3" rows="2" maxlength="500" placeholder="Ex. formulaire relu avec le répondant, rature illisible à la question X…"></textarea>

            <div v-if="missingPaperEntryRequiredQuestions.length" class="alert alert-warning rounded-3">
              {{ missingPaperEntryRequiredQuestions.length }} question(s) obligatoire(s) restent sans réponse.
            </div>

            <div class="d-flex flex-wrap gap-2 justify-content-between">
              <button class="btn btn-outline-primary" type="button" @click="paperEntryInvitation && downloadInvitationQuestionnairePdf(paperEntryInvitation)">
                Retélécharger le PDF
              </button>
              <button class="btn btn-primary" type="submit" :disabled="moderation.status === 'creating'">
                {{ moderation.status === 'creating' ? 'Verrouillage…' : 'Verrouiller la saisie papier' }}
              </button>
            </div>
          </form>
        </div>
        <div v-else class="alert alert-warning rounded-3">
          Questionnaire introuvable dans le catalogue local. Actualisez le catalogue ou vérifiez que la version est publiée.
        </div>
      </ModalPanel>

      <div class="action-strip mb-4">
        <div>
          <p class="section-eyebrow mb-1">Action principale</p>
          <h2 class="action-strip-title">Créer une invitation uniquement quand c’est nécessaire</h2>
          <p class="action-strip-description">Le suivi et les statistiques restent visibles sans formulaire occupant la moitié de l’écran.</p>
        </div>
        <button class="btn btn-primary btn-lg" type="button" @click="showInvitationModal = true">
          + Nouvelle invitation
        </button>
      </div>

      <div class="row g-3 mb-4">
        <div class="col-md-3"><KpiCard label="Invitations" :value="String(total.sent)" icon="📨" /></div>
        <div class="col-md-3"><KpiCard label="Soumises" :value="String(total.submitted)" tone="success" icon="✅" /></div>
        <div class="col-md-3"><KpiCard label="Sans email/SMS" :value="String(total.noDigitalContact)" tone="warning" icon="🖥️" /></div>
        <div class="col-md-3"><KpiCard label="Refus" :value="String(total.refused)" tone="danger" /></div>
      </div>

      <div v-if="canAdministerTerminals" class="action-strip mb-4">
        <div>
          <p class="section-eyebrow mb-1">Terminaux</p>
          <h2 class="action-strip-title">Appairage ponctuel, inventaire consultable</h2>
          <p class="action-strip-description">La création passe en fenêtre dédiée ; l’inventaire reste dans une section repliable.</p>
        </div>
        <button class="btn btn-outline-primary" type="button" @click="showTerminalRegistrationModal = true">
          Enregistrer un terminal
        </button>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-12"><NotificationPreferencesCard /></div>
      </div>

      <div v-if="session.hasPermission('user:manageModeratorsScoped')" class="mb-4">
        <SiteTeamPanel />
      </div>

      <CollapsibleSection
        v-if="canAdministerTerminals"
        id="moderation-terminals"
        title="Terminaux actifs du périmètre"
        :badge="`${moderation.terminalDevices.length} terminal(aux)`"
        :default-open="false"
        body-class="compact"
      >
        <div class="table-card table-card-scroll">
          <table class="table align-middle">
            <thead>
              <tr><th>Terminal</th><th>Bâtiment</th><th>En attente</th><th>Dernière activité</th></tr>
            </thead>
            <tbody>
              <tr v-for="device in moderation.terminalDevices" :key="device.id">
                <td><strong>{{ device.label }}</strong><br /><span class="small" style="color:var(--chm-muted); font-family:monospace;">{{ device.code }}</span></td>
                <td>{{ device.building.label }}</td>
                <td><span class="badge-soft" :class="device.pendingInvitationCount > 0 ? 'warning' : ''">{{ device.pendingInvitationCount }}</span></td>
                <td class="small" style="color:var(--chm-muted);">{{ device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString('fr-FR') : 'Jamais' }}</td>
              </tr>
              <tr v-if="!moderation.terminalDevices.length">
                <td colspan="4" class="text-center py-4" style="color: var(--chm-muted);">Aucun terminal enregistré.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        id="moderation-invitations"
        class="mt-4 moderation-invitations-section"
        title="Invitations"
        :badge="`${moderation.invitations.length} ligne(s)`"
        :default-open="false"
        body-class="compact"
      >
        <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
          <p class="muted mb-0">Historique opérationnel placé en bas de page pour éviter de saturer la vue de modération courante.</p>
          <button class="btn btn-outline-primary btn-sm" type="button" @click="moderation.refresh">Actualiser</button>
        </div>
        <div class="table-card table-card-scroll table-card-scroll-lg table-card-scroll-invitations">
          <table class="table align-middle">
            <thead>
              <tr>
                <th>Code</th>
                <th>Canal</th>
                <th>Destination</th>
                <th>Questionnaire</th>
                <th>Bâtiment</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="invitation in moderation.invitations" :key="invitation.id">
                <td class="fw-semibold" style="font-family: monospace; font-size:0.88rem;">{{ invitation.publicCode }}</td>
                <td><span class="badge-soft">{{ deliveryLabel(invitation.deliveryMode) }}</span></td>
                <td class="small" style="color: var(--chm-muted);">{{ invitationDestination(invitation) }}</td>
                <td class="small">{{ invitation.questionnaireTitle }}</td>
                <td class="small">{{ invitation.building.label }}</td>
                <td><span class="badge-soft" :class="statusTone(invitation.status)">{{ invitationStatusLabel(invitation) }}</span></td>
                <td>
                  <div class="d-flex flex-wrap gap-2 justify-content-end">
                    <button v-if="invitation.deliveryMode === 'paper_form'" class="btn btn-sm btn-outline-primary" type="button" @click="downloadInvitationQuestionnairePdf(invitation)">PDF</button>
                    <button v-if="canEnterPaperResponses(invitation)" class="btn btn-sm btn-primary" type="button" @click="openPaperEntry(invitation)">Saisir</button>
                    <button v-if="canResend(invitation)" class="btn btn-sm btn-outline-primary" type="button" @click="resend(invitation)">Relancer</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!moderation.invitations.length">
                <td colspan="7" class="text-center py-4" style="color: var(--chm-muted);">Aucune invitation pour ce périmètre.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    </div>
  </section>
</template>
