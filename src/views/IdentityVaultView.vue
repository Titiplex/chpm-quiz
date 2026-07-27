<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import PageHeader from '@/components/common/PageHeader.vue'
import RoleGateInfo from '@/components/common/RoleGateInfo.vue'
import { formatDate as formatLocaleDate, t, tp } from '@/i18n'
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
      caught instanceof Error ? caught.message : t('identityVault.error.load')
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
    message.value = t('identityVault.request.created', { reference: response.judicialRequest.requestReference })
  })
}

async function validateDpo(id: string): Promise<void> {
  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(
      `/judicial-access/requests/${id}/validate-dpo`,
      {
        method: 'POST',
        body: { comments: t('identityVault.request.dpoComment') },
      },
    )
    message.value = t('identityVault.request.dpoValidated', { reference: response.judicialRequest.requestReference })
  })
}

async function validateLegal(id: string): Promise<void> {
  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(
      `/judicial-access/requests/${id}/validate-legal`,
      {
        method: 'POST',
        body: { comments: t('identityVault.request.legalComment') },
      },
    )
    message.value = t('identityVault.request.legalValidated', { reference: response.judicialRequest.requestReference })
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
      throw new Error(t('identityVault.error.missingExport'))
    }
    encryptedExport.value = response.export
    encryptedExportReference.value = response.judicialRequest.requestReference
    downloadEncryptedExport(response.export, response.judicialRequest.requestReference)
    message.value = t('identityVault.request.exportDownloaded', { reference: response.judicialRequest.requestReference })
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
            t('identityVault.request.closeComment'),
        },
      },
    )
    message.value = t('identityVault.request.closed', { reference: response.judicialRequest.requestReference })
  })
}

async function rejectRequest(id: string): Promise<void> {
  const reason = window.prompt(t('identityVault.request.rejectPrompt'))?.trim()
  if (!reason) return

  await runWorkflow(async () => {
    const response = await apiRequest<JudicialAccessRequestResponse>(
      `/judicial-access/requests/${id}/reject`,
      {
        method: 'POST',
        body: { reason },
      },
    )
    message.value = t('identityVault.request.rejected', { reference: response.judicialRequest.requestReference })
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
    error.value = caught instanceof Error ? caught.message : t('identityVault.error.action')
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
  return value ? formatLocaleDate(value, { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

function statusLabel(value: string): string {
  return (
    {
      received: t('identityVault.status.received'),
      validated: t('identityVault.status.validated'),
      rejected: t('identityVault.status.rejected'),
      executed: t('identityVault.status.executed'),
      closed: t('identityVault.status.closed'),
    }[value] ?? value
  )
}
</script>

<template>
  <section class="demo-page">
    <div class="container-fluid px-4 px-xl-5">
      <PageHeader
        :eyebrow="t('identityVault.header.eyebrow')"
        :title="t('identityVault.header.title')"
        :description="t('identityVault.header.description')"
        :badge="t('identityVault.header.badge')"
      />
      <RoleGateInfo class="mb-4" />

      <div v-if="error" class="alert alert-danger rounded-4" role="alert">{{ error }}</div>
      <div v-if="message" class="alert alert-success rounded-4" role="status">{{ message }}</div>

      <div class="row g-4">
        <div v-if="canCreate" class="col-12">
          <div class="demo-card h-100">
            <p class="section-eyebrow mb-2">{{ t('identityVault.create.eyebrow') }}</p>
            <h2 class="h4 fw-bold mb-4">{{ t('identityVault.create.title') }}</h2>
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label" for="requestReference">{{ t('identityVault.create.reference') }}</label>
                <input
                  id="requestReference"
                  v-model="form.requestReference"
                  class="form-control rounded-4"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="courtOrderReference">{{ t('identityVault.create.courtOrder') }}</label>
                <input
                  id="courtOrderReference"
                  v-model="form.courtOrderReference"
                  class="form-control rounded-4"
                />
              </div>
              <div class="col-12">
                <label class="form-label" for="legalBasisDescription"
                  >{{ t('identityVault.create.legalBasis') }}</label
                >
                <textarea
                  id="legalBasisDescription"
                  v-model="form.legalBasisDescription"
                  class="form-control rounded-4"
                  rows="2"
                ></textarea>
              </div>
              <div class="col-md-6">
                <label class="form-label" for="requestedPublicCodes">{{ t('identityVault.create.codes') }}</label>
                <input
                  id="requestedPublicCodes"
                  v-model="form.requestedPublicCodes"
                  class="form-control rounded-4"
                />
              </div>
              <div class="col-md-6">
                <label class="form-label" for="requestedBy">{{ t('identityVault.create.requestedBy') }}</label>
                <input id="requestedBy" v-model="form.requestedBy" class="form-control rounded-4" />
              </div>
            </div>
            <button
              class="btn btn-primary rounded-pill mt-4"
              type="button"
              :disabled="isLoading"
              @click="createRequest"
            >
              {{ t('identityVault.create.submit') }}
            </button>
          </div>
        </div>

        <div class="col-12">
          <div class="demo-card">
            <p class="section-eyebrow mb-2">{{ t('identityVault.workflow.eyebrow') }}</p>
            <h2 class="h4 fw-bold mb-4">{{ t('identityVault.workflow.title') }}</h2>
            <div class="table-card table-card-scroll">
              <table class="table align-middle">
                <thead class="table-light">
                  <tr>
                    <th>{{ t('identityVault.create.reference') }}</th>
                    <th>{{ t('identityVault.table.codes') }}</th>
                    <th>{{ t('common.status') }}</th>
                    <th>{{ t('identityVault.table.validations') }}</th>
                    <th>{{ t('identityVault.table.fingerprint') }}</th>
                    <th>{{ t('common.actions') }}</th>
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
                        {{ t('identityVault.validation.dpo', { state: request.dpoValidationUserId ? t('common.yes') : t('common.no') }) }}
                      </div>
                      <div class="small">
                        {{ t('identityVault.validation.legal', { state: request.legalValidationUserId ? t('common.yes') : t('common.no') }) }}
                      </div>
                    </td>
                    <td class="small muted">
                      <div>{{ request.exportFingerprint ?? '—' }}</div>
                      <div v-if="request.exportExpiresAt">
                        {{ t('identityVault.export.expiration', { date: formatDate(request.exportExpiresAt) }) }}
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
                          {{ t('identityVault.actions.validateDpo') }}
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
                          {{ t('identityVault.actions.validateLegal') }}
                        </button>
                        <button
                          class="btn btn-sm btn-outline-warning rounded-pill"
                          type="button"
                          :disabled="!canExecute || request.status !== 'validated' || isLoading"
                          @click="executeRequest(request.id)"
                        >
                          {{ t('identityVault.actions.execute') }}
                        </button>
                        <button
                          class="btn btn-sm btn-outline-secondary rounded-pill"
                          type="button"
                          :disabled="!canClose || request.status !== 'executed' || isLoading"
                          @click="closeRequest(request.id)"
                        >
                          {{ t('identityVault.actions.close') }}
                        </button>
                        <button
                          class="btn btn-sm btn-outline-danger rounded-pill"
                          type="button"
                          :disabled="
                            !['received', 'validated'].includes(request.status) || isLoading
                          "
                          @click="rejectRequest(request.id)"
                        >
                          {{ t('identityVault.actions.reject') }}
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
            <p class="section-eyebrow mb-2">{{ t('identityVault.export.eyebrow') }}</p>
            <h2 class="h5 fw-bold">{{ t('identityVault.export.fingerprint', { fingerprint: encryptedExport.fingerprint }) }}</h2>
            <p class="muted mb-3">
              {{ t('identityVault.export.description') }}
            </p>
            <code class="small d-block text-break mb-3"
              >{{ tp('identityVault.export.metadata', encryptedExport.rowCount, { algorithm: encryptedExport.envelope.algorithm, keyRef: encryptedExport.envelope.keyRef, expiresAt: formatDate(encryptedExport.expiresAt) }) }}</code
            >
            <button
              class="btn btn-outline-warning rounded-pill"
              type="button"
              @click="downloadEncryptedExport(encryptedExport, encryptedExportReference)"
            >
              {{ t('identityVault.export.downloadAgain') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
