<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import KpiCard from '@/components/common/KpiCard.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import NotificationPreferencesCard from '@/components/notifications/NotificationPreferencesCard.vue'
import { appConfig } from '@/config/env'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { useCatalogStore } from '@/stores/catalog'
import { useModerationStore } from '@/stores/moderation'
import { useSessionStore } from '@/stores/session'
import type { ApiInvitation } from '@shared/types/api'
import type { AssistanceMode, InvitationDeliveryMode, InvitationStatus } from '@shared/types/domain'

const catalog = useCatalogStore()
const moderation = useModerationStore()
const session = useSessionStore()
const copiedLink = ref<'respondent' | 'terminal' | 'registered' | null>(null)

const form = reactive({
  questionnaireVersionId: '',
  buildingId: '',
  email: 'personne.exemple@domaine.org',
  deliveryMode: 'email_simulation' as InvitationDeliveryMode,
  terminalDeviceId: '',
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
const canAdministerTerminals = computed(() => ['admin', 'technical_admin'].includes(session.currentRole))
const responseRate = computed(() => {
  if (total.value.sent === 0) return '0 %'
  return `${Math.round((total.value.submitted / total.value.sent) * 100)} %`
})
const compatibleTerminalDevices = computed(() =>
  moderation.terminalDevices.filter((device) => device.building.id === form.buildingId && device.status === 'active'),
)


watch(
  () => [form.buildingId, form.deliveryMode, moderation.terminalDevices.length],
  () => {
    if (form.deliveryMode !== 'onsite_terminal') return
    if (!compatibleTerminalDevices.value.some((device) => device.id === form.terminalDeviceId)) {
      form.terminalDeviceId = compatibleTerminalDevices.value[0]?.id ?? ''
    }
  },
)

async function submitInvitation() {
  copiedLink.value = null
  await moderation.createInvitation({
    questionnaireVersionId: form.questionnaireVersionId,
    buildingId: form.buildingId,
    email: form.deliveryMode === 'onsite_terminal' ? undefined : form.email,
    deliveryMode: form.deliveryMode,
    terminalDeviceId: form.deliveryMode === 'onsite_terminal' ? form.terminalDeviceId : undefined,
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
  }[mode]
}

function statusTone(status: InvitationStatus): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'submitted') return 'success'
  if (['expired', 'blocked', 'cancelled'].includes(status)) return 'danger'
  if (['opened', 'in_progress', 'draft'].includes(status)) return 'warning'
  return 'neutral'
}

function canResend(invitation: ApiInvitation): boolean {
  return !['submitted', 'cancelled', 'blocked', 'expired'].includes(invitation.status)
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        title="Modération"
        :description="appConfig.demoMode ? 'Invitez des répondants par email ou affectez une invitation à un terminal hospitalier.' : 'Invitez des répondants par email ou affectez une invitation à un terminal hospitalier de votre bâtiment.'"
        :badge="appConfig.demoMode ? 'Démo' : 'Connecté'"
      />
      <RoleGateInfo />

      <div v-if="catalog.status === 'error' || moderation.status === 'error'" class="alert alert-danger rounded-3 mb-4" role="alert">
        {{ catalog.error || moderation.error }}
      </div>

      <div class="row g-4">
        <!-- Formulaire invitation -->
        <div class="col-xl-5">
          <form class="demo-card h-100" @submit.prevent="submitInvitation">
            <h2 class="page-header-title mb-4" style="font-size:1.1rem;">Nouvelle invitation</h2>

            <label class="form-label fw-semibold" for="questionnaire-select">Questionnaire</label>
            <select id="questionnaire-select" v-model="form.questionnaireVersionId" class="form-select mb-3" required>
              <option value="" disabled>Choisir un questionnaire</option>
              <option v-for="questionnaire in questionnaires" :key="questionnaire.versionId" :value="questionnaire.versionId">
                {{ questionnaire.title }} · v{{ questionnaire.versionLabel }}
              </option>
            </select>

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
              <option value="onsite_terminal">Terminal hospitalier</option>
            </select>

            <template v-if="form.deliveryMode === 'onsite_terminal'">
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

            <template v-else>
              <label class="form-label fw-semibold" for="respondent-email">Email du répondant</label>
              <input id="respondent-email" v-model="form.email" class="form-control mb-4" type="email" required />
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

            <button class="btn btn-primary w-100 btn-lg" :disabled="moderation.status === 'creating' || !questionnaires.length || (form.deliveryMode === 'onsite_terminal' && !form.terminalDeviceId)">
              {{ moderation.status === 'creating' ? 'Envoi…' : form.deliveryMode === 'onsite_terminal' ? 'Envoyer au terminal' : 'Envoyer l\'invitation' }}
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
                <strong>Invitation affectée au terminal.</strong>
                <template v-if="moderation.lastCreatedTerminalLink">
                  <a class="d-block text-break small mt-1" :href="moderation.lastCreatedTerminalLink">{{ moderation.lastCreatedTerminalLink }}</a>
                  <button class="btn btn-sm btn-outline-primary mt-2" type="button" @click="copyLink('terminal', moderation.lastCreatedTerminalLink)">
                    {{ copiedLink === 'terminal' ? '✓ Copié' : 'Copier le lien' }}
                  </button>
                </template>
              </template>
              <p v-if="moderation.lastCreatedInvitation" class="small mb-0 mt-2" style="color: var(--chm-muted);">
                Code : {{ moderation.lastCreatedInvitation.publicCode }} · {{ statusLabel(moderation.lastCreatedInvitation.status) }}
              </p>
            </div>
          </form>
        </div>

        <!-- Suivi des invitations -->
        <div class="col-xl-7">
          <div class="demo-card h-100">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
              <h2 class="page-header-title mb-0" style="font-size:1.1rem;">Invitations</h2>
              <button class="btn btn-outline-primary btn-sm" type="button" @click="moderation.refresh">Actualiser</button>
            </div>

            <div class="table-card mb-4">
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
                    <td class="small" style="color: var(--chm-muted);">{{ invitation.deliveryMode === 'onsite_terminal' ? invitation.terminalDevice?.label ?? '—' : invitation.maskedEmail ?? '—' }}</td>
                    <td class="small">{{ invitation.questionnaireTitle }}</td>
                    <td class="small">{{ invitation.building.label }}</td>
                    <td><span class="badge-soft" :class="statusTone(invitation.status)">{{ statusLabel(invitation.status) }}</span></td>
                    <td>
                      <button v-if="canResend(invitation)" class="btn btn-sm btn-outline-primary" type="button" @click="resend(invitation)">Relancer</button>
                    </td>
                  </tr>
                  <tr v-if="!moderation.invitations.length">
                    <td colspan="7" class="text-center py-4" style="color: var(--chm-muted);">Aucune invitation pour ce périmètre.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="row g-3">
              <div class="col-md-3"><KpiCard label="Invitations" :value="String(total.sent)" icon="📨" /></div>
              <div class="col-md-3"><KpiCard label="Soumises" :value="String(total.submitted)" tone="success" icon="✅" /></div>
              <div class="col-md-3"><KpiCard label="Terminal" :value="String(total.onsiteTerminal)" tone="warning" icon="🖥️" /></div>
              <div class="col-md-3"><KpiCard label="Taux" :value="responseRate" /></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Administration des terminaux -->
      <div v-if="canAdministerTerminals" class="row g-4 mt-1">
        <div class="col-xl-5">
          <form class="demo-card h-100" @submit.prevent="registerTerminal">
            <h2 class="page-header-title mb-4" style="font-size:1.1rem;">Enregistrer un terminal</h2>
            <label class="form-label fw-semibold" for="terminal-building">Bâtiment</label>
            <select id="terminal-building" v-model="terminalForm.buildingId" class="form-select mb-3" required>
              <option v-for="building in catalog.buildings" :key="building.id" :value="building.id">{{ building.label }}</option>
            </select>
            <label class="form-label fw-semibold" for="terminal-label">Libellé de l'appareil</label>
            <input id="terminal-label" v-model="terminalForm.label" class="form-control mb-3" required />
            <button class="btn btn-outline-primary w-100" type="submit">Créer le lien d'appairage</button>
            <div v-if="moderation.lastRegisteredTerminalLink" class="alert alert-info rounded-3 mt-3 mb-0">
              <strong>Lien d'appairage :</strong>
              <a class="d-block text-break small mt-1" :href="moderation.lastRegisteredTerminalLink">{{ moderation.lastRegisteredTerminalLink }}</a>
              <button class="btn btn-sm btn-outline-primary mt-2" type="button" @click="copyLink('registered', moderation.lastRegisteredTerminalLink)">
                {{ copiedLink === 'registered' ? '✓ Copié' : 'Copier le lien' }}
              </button>
            </div>
          </form>
        </div>
        <div class="col-xl-7">
          <div class="demo-card h-100">
            <h2 class="page-header-title mb-4" style="font-size:1.1rem;">Terminaux actifs</h2>
            <div class="table-card">
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
          </div>
        </div>
        <div class="col-12"><NotificationPreferencesCard /></div>
      </div>
      <div v-else class="row g-4 mt-1">
        <div class="col-12"><NotificationPreferencesCard /></div>
      </div>
    </div>
  </section>
</template>
