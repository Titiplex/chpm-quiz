<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { apiRequest } from '@/services/api'
import { useSessionStore } from '@/stores/session'
import type {
  CreateJudicialAccessRequest,
  JudicialAccessRequestRecord,
  JudicialEncryptedExport,
  JudicialAccessRequestResponse,
  JudicialAccessRequestsResponse,
} from '@shared/types/api'

const session = useSessionStore()
const requests = ref<JudicialAccessRequestRecord[]>([])
const message = ref<string | null>(null)
const error = ref<string | null>(null)
const encryptedExport = ref<JudicialEncryptedExport | null>(null)
const encryptedExportReference = ref('')
const isLoading = ref(false)

const form = reactive({
  requestReference: '',
  legalBasisDescription: '',
  courtOrderReference: '',
  requestedPublicCodes: '',
  requestedBy: '',
  comments: '',
})

const canCreate = computed(() => session.currentRole === 'judicial_officer')
const canValidateDpo = computed(() => session.currentRole === 'dpo')
const canValidateLegal = computed(() => session.currentRole === 'judicial_officer')
const canExecute = computed(() => session.currentRole === 'dpo')
const canClose = computed(() => session.currentRole === 'judicial_officer')

onMounted(async () => {
  await refresh()
})

async function refresh(): Promise<void> {
  isLoading.value = true
  error.value = null
  try {
    const requestList = await apiRequest<JudicialAccessRequestsResponse>(
      '/judicial-access/requests',
    )
    requests.value = requestList.requests
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : 'Chargement du coffre email impossible.'
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
      requestedPublicCodes: form.requestedPublicCodes
        .split(/[\s,;]+/)
        .map((code) => code.trim())
        .filter(Boolean),
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
    const response = await apiRequest<JudicialAccessRequestResponse>(
      `/judicial-access/requests/${id}/validate-dpo`,
      {
        method: 'POST',
        body: { comments: 'Validation DPO.' },
      },
    )
    message.value = `Validation DPO enregistrée pour ${response.judicialRequest.requestReference}.`
  })
}

async function validateLegal(id: string): Promise<void> {
  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(
      `/judicial-access/requests/${id}/validate-legal`,
      {
        method: 'POST',
        body: { comments: 'Validation juridique.' },
      },
    )
    message.value = `Validation juridique enregistrée pour ${response.judicialRequest.requestReference}.`
  })
}

async function executeRequest(id: string): Promise<void> {
  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(
      `/judicial-access/requests/${id}/execute`,
      {
        method: 'POST',
      },
    )
    if (!response.export) {
      throw new Error('The API did not return the expected encrypted export.')
    }
    encryptedExport.value = response.export
    encryptedExportReference.value = response.judicialRequest.requestReference
    downloadEncryptedExport(response.export, response.judicialRequest.requestReference)
    message.value = `Export chiffré téléchargé pour ${response.judicialRequest.requestReference}. Vérifiez son empreinte avant transmission.`
  })
}

async function closeRequest(id: string): Promise<void> {
  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(
      `/judicial-access/requests/${id}/close`,
      {
        method: 'POST',
        body: {
          comments:
            'Clôture après transmission sécurisée et vérification de l’empreinte en coffre documentaire.',
        },
      },
    )
    message.value = `Demande ${response.judicialRequest.requestReference} clôturée.`
  })
}

async function rejectRequest(id: string): Promise<void> {
  const reason = window.prompt('Motif du rejet (obligatoire) :')?.trim()
  if (!reason) return

  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(
      `/judicial-access/requests/${id}/reject`,
      {
        method: 'POST',
        body: { reason },
      },
    )
    message.value = `Demande ${response.judicialRequest.requestReference} rejetée et auditée.`
  })
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

function downloadEncryptedExport(value: JudicialEncryptedExport, requestReference: string): void {
  const safeReference = requestReference.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-|-$/g, '')
  const payload = JSON.stringify(
    {
      requestReference,
      fingerprint: value.fingerprint,
      expiresAt: value.expiresAt,
      rowCount: value.rowCount,
      envelope: value.envelope,
    },
    null,
    2,
  )
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `judicial-export-${safeReference || 'request'}.encrypted.json`
  link.click()
  URL.revokeObjectURL(url)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  )
}

function statusLabel(value: string): string {
  return (
    {
      received: 'reçue',
      validated: 'validée',
      rejected: 'rejetée',
      executed: 'exécutée',
      closed: 'clôturée',
    }[value] ?? value
  )
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        eyebrow="Coffre email"
        title="Accès judiciaire contrôlé"
        description="Console dédiée au workflow exceptionnel d’accès code-contact : demande juridique, double validation indépendante, export chiffré à durée limitée et double journalisation."
        badge="Accès restreint"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="error" class="alert alert-danger rounded-4" role="alert">{{ error }}</div>
      <div v-if="message" class="alert alert-success rounded-4" role="status">{{ message }}</div>

      <div class="row g-4">
        <div v-if="canCreate" class="col-12">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">Nouvelle demande</p>
            <h2 class="h4 fw-bold mb-4">Créer une JudicialAccessRequest</h2>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label" for="requestReference">Référence</label>
                <input
                  id="requestReference"
                  v-model="form.requestReference"
                  class="form-control rounded-4"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="courtOrderReference">Référence ordonnance</label>
                <input
                  id="courtOrderReference"
                  v-model="form.courtOrderReference"
                  class="form-control rounded-4"
                />
              </div>
              <div class="col-12">
                <label class="form-label" for="legalBasisDescription"
                  >Base légale / justification</label
                >
                <textarea
                  id="legalBasisDescription"
                  v-model="form.legalBasisDescription"
                  class="form-control rounded-4"
                  rows="2"
                ></textarea>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="requestedPublicCodes">Codes concernés</label>
                <input
                  id="requestedPublicCodes"
                  v-model="form.requestedPublicCodes"
                  class="form-control rounded-4"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="requestedBy">Demandeur</label>
                <input id="requestedBy" v-model="form.requestedBy" class="form-control rounded-4" />
              </div>
            </div>
            <button
              class="btn btn-primary rounded-pill mt-4"
              type="button"
              :disabled="isLoading"
              @click="createRequest"
            >
              Créer et journaliser
            </button>
          </div>
        </div>

        <div class="col-12">
          <div class="demo-card">
            <p class="section-eyebrow mb-2">Workflow</p>
            <h2 class="h4 fw-bold mb-4">Demandes d’accès judiciaire</h2>
            <div class="table-card table-card-scroll">
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
                    <td>
                      <span class="badge-soft warning">{{ statusLabel(request.status) }}</span>
                    </td>
                    <td>
                      <div class="small">
                        DPO : {{ request.dpoValidationUserId ? 'oui' : 'non' }}
                      </div>
                      <div class="small">
                        Juridique : {{ request.legalValidationUserId ? 'oui' : 'non' }}
                      </div>
                    </td>
                    <td class="small muted">
                      <div>{{ request.exportFingerprint ?? '—' }}</div>
                      <div v-if="request.exportExpiresAt">
                        expiration : {{ formatDate(request.exportExpiresAt) }}
                      </div>
                    </td>
                    <td>
                      <div class="d-flex flex-wrap gap-2">
                        <button
                          class="btn btn-sm btn-outline-primary rounded-pill"
                          type="button"
                          :disabled="
                            !canValidateDpo ||
                            Boolean(request.dpoValidationUserId) ||
                            !['received', 'validated'].includes(request.status) ||
                            isLoading
                          "
                          @click="validateDpo(request.id)"
                        >
                          Valider DPO
                        </button>
                        <button
                          class="btn btn-sm btn-outline-primary rounded-pill"
                          type="button"
                          :disabled="
                            !canValidateLegal ||
                            Boolean(request.legalValidationUserId) ||
                            !['received', 'validated'].includes(request.status) ||
                            isLoading
                          "
                          @click="validateLegal(request.id)"
                        >
                          Valider juridique
                        </button>
                        <button
                          class="btn btn-sm btn-outline-warning rounded-pill"
                          type="button"
                          :disabled="!canExecute || request.status !== 'validated' || isLoading"
                          @click="executeRequest(request.id)"
                        >
                          Exécuter export
                        </button>
                        <button
                          class="btn btn-sm btn-outline-secondary rounded-pill"
                          type="button"
                          :disabled="!canClose || request.status !== 'executed' || isLoading"
                          @click="closeRequest(request.id)"
                        >
                          Clôturer
                        </button>
                        <button
                          class="btn btn-sm btn-outline-danger rounded-pill"
                          type="button"
                          :disabled="
                            !['received', 'validated'].includes(request.status) || isLoading
                          "
                          @click="rejectRequest(request.id)"
                        >
                          Rejeter
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
            <p class="section-eyebrow mb-2">Export chiffré en mémoire</p>
            <h2 class="h5 fw-bold">Empreinte {{ encryptedExport.fingerprint }}</h2>
            <p class="muted mb-3">
              Le fichier contient uniquement une enveloppe AES-256-GCM. Conservez-le dans le coffre
              documentaire approuvé, transmettez la clé par un canal séparé et détruisez-le à
              l’expiration.
            </p>
            <code class="small d-block text-break mb-3"
              >{{ encryptedExport.envelope.algorithm }} · {{ encryptedExport.envelope.keyRef }} ·
              {{ encryptedExport.rowCount }} ligne(s) · expiration
              {{ formatDate(encryptedExport.expiresAt) }}</code
            >
            <button
              class="btn btn-outline-warning rounded-pill"
              type="button"
              @click="downloadEncryptedExport(encryptedExport, encryptedExportReference)"
            >
              Télécharger à nouveau l’enveloppe chiffrée
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
