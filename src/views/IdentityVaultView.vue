<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { apiRequest } from '@/services/api'
import { useSessionStore } from '@/stores/session'
import type {
  CreateJudicialAccessRequest,
  IdentityVaultStatusResponse,
  JudicialAccessRequestRecord,
  JudicialAccessRequestResponse,
  JudicialAccessRequestsResponse,
} from '@shared/types/api'

const session = useSessionStore()
const status = ref<IdentityVaultStatusResponse['status'] | null>(null)
const requests = ref<JudicialAccessRequestRecord[]>([])
const message = ref<string | null>(null)
const error = ref<string | null>(null)
const encryptedExport = ref<JudicialAccessRequestResponse['encryptedExport'] | null>(null)
const isLoading = ref(false)

const form = reactive({
  requestReference: `REQ-JUD-${new Date().getFullYear()}-DEMO`,
  legalBasisDescription: 'Réquisition fictive de démonstration, double validation DPO + juridique obligatoire.',
  courtOrderReference: 'ORD-DEMO-001',
  requestedPublicCodes: '8F4K-29QX',
  requestedBy: 'Service juridique · démo',
  comments: 'Simulation : aucune donnée réelle.',
})

const canValidateDpo = computed(() => session.currentRole === 'dpo')
const canValidateLegal = computed(() => session.currentRole === 'judicial_officer')
const canExecute = computed(() => session.currentRole === 'judicial_officer')

onMounted(async () => {
  await refresh()
})

async function refresh(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    const [vaultStatus, requestList] = await Promise.all([
      apiRequest<IdentityVaultStatusResponse>('/identity-vault/status'),
      apiRequest<JudicialAccessRequestsResponse>('/judicial-access/requests'),
    ])
    status.value = vaultStatus.status
    requests.value = requestList.requests
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Chargement du coffre email impossible.'
  } finally {
    isLoading.value = false
  }
}

async function createRequest(): Promise<void> {
  await runWorkflow(async () => {
    const payload: CreateJudicialAccessRequest = {
      requestReference: form.requestReference,
      legalBasisDescription: form.legalBasisDescription,
      courtOrderReference: form.courtOrderReference,
      requestedPublicCodes: form.requestedPublicCodes.split(/[\s,;]+/).map((code) => code.trim()).filter(Boolean),
      requestedBy: form.requestedBy,
      comments: form.comments,
    }
    const response = await apiRequest<JudicialAccessRequestResponse>('/judicial-access/requests', {
      method: 'POST',
      body: payload,
    })
    message.value = `Demande ${response.judicialRequest.requestReference} créée et auditée.`
  })
}

async function validateDpo(id: string): Promise<void> {
  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(`/judicial-access/requests/${id}/validate-dpo`, {
      method: 'POST',
      body: { comments: 'Validation DPO de démonstration.' },
    })
    message.value = `Validation DPO enregistrée pour ${response.judicialRequest.requestReference}.`
  })
}

async function validateLegal(id: string): Promise<void> {
  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(`/judicial-access/requests/${id}/validate-legal`, {
      method: 'POST',
      body: { comments: 'Validation juridique de démonstration.' },
    })
    message.value = `Validation juridique enregistrée pour ${response.judicialRequest.requestReference}.`
  })
}

async function executeRequest(id: string): Promise<void> {
  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(`/judicial-access/requests/${id}/execute`, {
      method: 'POST',
    })
    encryptedExport.value = response.encryptedExport ?? null
    message.value = `Export chiffré exécuté pour ${response.judicialRequest.requestReference}. Aucun email en clair n’est affiché.`
  })
}

async function closeRequest(id: string): Promise<void> {
  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(`/judicial-access/requests/${id}/close`, {
      method: 'POST',
      body: { comments: 'Clôture après transmission sécurisée.' },
    })
    message.value = `Demande ${response.judicialRequest.requestReference} clôturée.`
  })
}

async function simulateDeniedAccess(): Promise<void> {
  await runWorkflow(async () => {
    await apiRequest('/identity-vault/access-attempt', {
      method: 'POST',
      body: {
        publicCode: '8F4K-29QX',
        justification: 'Simulation d’une tentative hors workflow direct.',
      },
    })
    message.value = 'Tentative routée vers le workflow judiciaire, sans lecture directe.'
  }, false)
}

async function runWorkflow(action: () => Promise<void>, refreshAfter = true): Promise<void> {
  isLoading.value = true
  error.value = null
  message.value = null
  try {
    await action()
    if (refreshAfter) await refresh()
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : 'Action coffre email impossible.'
  } finally {
    isLoading.value = false
  }
}

function statusLabel(value: string): string {
  return {
    received: 'reçue',
    validated: 'validée',
    rejected: 'rejetée',
    executed: 'exécutée',
    closed: 'clôturée',
  }[value] ?? value
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Coffre email"
        title="Accès judiciaire séparé du dashboard métier"
        description="Écran réservé : il matérialise le workflow exceptionnel d’accès code-email, avec double validation, export chiffré et journalisation dans le coffre identité et l’audit applicatif."
        badge="Accès restreint"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="error" class="alert alert-danger rounded-4" role="alert">{{ error }}</div>
      <div v-if="message" class="alert alert-success rounded-4" role="status">{{ message }}</div>

      <div class="row g-4">
        <div class="col-xl-4">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Séparation logique</p>
            <h2 class="h4 fw-bold mb-4">État du coffre</h2>
            <div v-if="status" class="d-grid gap-3">
              <div class="p-3 rounded-4 border bg-white">
                <strong>Modèle</strong>
                <div class="muted">{{ status.model }}</div>
              </div>
              <div class="p-3 rounded-4 border bg-white">
                <strong>Table identité</strong>
                <div class="muted">{{ status.identityTable }}</div>
              </div>
              <div class="p-3 rounded-4 border bg-white">
                <strong>Mode d’accès</strong>
                <div class="muted">{{ status.accessMode }}</div>
              </div>
              <span class="badge-soft" :class="status.currentRoleCanExecuteEmailAccess ? 'warning' : 'danger'">
                Rôle courant : {{ status.currentRole }} · accès direct {{ status.currentRoleCanExecuteEmailAccess ? 'habilité via procédure' : 'refusé' }}
              </span>
            </div>
            <button class="btn btn-outline-danger rounded-pill mt-4" type="button" :disabled="isLoading" @click="simulateDeniedAccess">
              Simuler une tentative sensible
            </button>
            <p class="small muted mt-3 mb-0">
              Cette action ne renvoie jamais l’email. Elle produit une trace d’audit, y compris en cas de refus.
            </p>
          </div>
        </div>

        <div class="col-xl-8">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Nouvelle demande</p>
            <h2 class="h4 fw-bold mb-4">Créer une JudicialAccessRequest</h2>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label" for="requestReference">Référence</label>
                <input id="requestReference" v-model="form.requestReference" class="form-control rounded-4" />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="courtOrderReference">Référence ordonnance</label>
                <input id="courtOrderReference" v-model="form.courtOrderReference" class="form-control rounded-4" />
              </div>
              <div class="col-12">
                <label class="form-label" for="legalBasisDescription">Base légale / justification</label>
                <textarea id="legalBasisDescription" v-model="form.legalBasisDescription" class="form-control rounded-4" rows="2"></textarea>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="requestedPublicCodes">Codes concernés</label>
                <input id="requestedPublicCodes" v-model="form.requestedPublicCodes" class="form-control rounded-4" />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="requestedBy">Demandeur</label>
                <input id="requestedBy" v-model="form.requestedBy" class="form-control rounded-4" />
              </div>
            </div>
            <button class="btn btn-primary rounded-pill mt-4" type="button" :disabled="isLoading" @click="createRequest">
              Créer et journaliser
            </button>
          </div>
        </div>

        <div class="col-12">
          <div class="demo-card">
            <p class="section-eyebrow mb-2">Workflow</p>
            <h2 class="h4 fw-bold mb-4">Demandes d’accès judiciaire</h2>
            <div class="table-card">
              <table class="table align-middle">
                <thead class="table-light">
                  <tr>
                    <th>Référence</th>
                    <th>Codes</th>
                    <th>Statut</th>
                    <th>Validations</th>
                    <th>Empreinte export</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="request in requests" :key="request.id">
                    <td>
                      <strong>{{ request.requestReference }}</strong>
                      <div class="small muted">{{ request.requestedBy }}</div>
                    </td>
                    <td>{{ request.requestedPublicCodes.join(', ') }}</td>
                    <td><span class="badge-soft warning">{{ statusLabel(request.status) }}</span></td>
                    <td>
                      <div class="small">DPO : {{ request.dpoValidationUserId ? 'oui' : 'non' }}</div>
                      <div class="small">Juridique : {{ request.legalValidationUserId ? 'oui' : 'non' }}</div>
                    </td>
                    <td class="small muted">{{ request.exportFingerprint ?? '—' }}</td>
                    <td>
                      <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-sm btn-outline-primary rounded-pill" type="button" :disabled="!canValidateDpo || isLoading" @click="validateDpo(request.id)">
                          Valider DPO
                        </button>
                        <button class="btn btn-sm btn-outline-primary rounded-pill" type="button" :disabled="!canValidateLegal || isLoading" @click="validateLegal(request.id)">
                          Valider juridique
                        </button>
                        <button class="btn btn-sm btn-outline-warning rounded-pill" type="button" :disabled="!canExecute || request.status !== 'validated' || isLoading" @click="executeRequest(request.id)">
                          Exécuter export
                        </button>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill" type="button" :disabled="request.status !== 'executed' || isLoading" @click="closeRequest(request.id)">
                          Clôturer
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="encryptedExport" class="col-12">
          <div class="demo-card border border-warning">
            <p class="section-eyebrow mb-2">Export minimal chiffré</p>
            <h2 class="h5 fw-bold">Empreinte {{ encryptedExport.fingerprint }}</h2>
            <p class="muted mb-2">{{ encryptedExport.warning }}</p>
            <code class="small d-block text-break">{{ encryptedExport.algorithm }} · {{ encryptedExport.keyRef }} · expiration {{ encryptedExport.expiresInMinutes }} min</code>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
