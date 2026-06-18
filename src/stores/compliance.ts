import { ref } from 'vue'
import { defineStore } from 'pinia'

import { apiRequest } from '@/services/api'
import type {
  AuditLogsResponse,
  ComplianceMaintenanceResponse,
  PseudonymizedExportResponse,
  RetentionPolicyResponse,
  TechnicalRegisterResponse,
} from '@shared/types/api'

type ComplianceStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

export const useComplianceStore = defineStore('compliance', () => {
  const register = ref<TechnicalRegisterResponse['register'] | null>(null)
  const policy = ref<RetentionPolicyResponse['policy'] | null>(null)
  const auditLogs = ref<AuditLogsResponse['logs']>([])
  const exportPayload = ref<PseudonymizedExportResponse['export'] | null>(null)
  const status = ref<ComplianceStatus>('idle')
  const error = ref<string | null>(null)
  const message = ref<string | null>(null)

  async function fetchAll(): Promise<void> {
    status.value = 'loading'
    error.value = null
    message.value = null

    try {
      const [registerResponse, policyResponse] = await Promise.all([
        apiRequest<TechnicalRegisterResponse>('/compliance/technical-register'),
        apiRequest<RetentionPolicyResponse>('/compliance/retention-policy'),
      ])
      register.value = registerResponse.register
      policy.value = policyResponse.policy
      try {
        await fetchAuditLogs()
      } catch {
        auditLogs.value = []
      }
      status.value = 'ready'
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Chargement RGPD impossible.'
    }
  }

  async function expireInvitations(): Promise<void> {
    await runMaintenance('/compliance/maintenance/expire-invitations', (response) => {
      message.value = `${response.result.expiredCount ?? 0} invitation(s) expirée(s) et auditée(s).`
    })
  }

  async function cleanupDrafts(): Promise<void> {
    await runMaintenance('/compliance/maintenance/cleanup-drafts', (response) => {
      message.value = `${response.result.deletedDraftSessionCount ?? 0} brouillon(s) expiré(s) nettoyé(s).`
    })
  }

  async function fetchPseudonymizedExport(questionnaireId?: string): Promise<void> {
    status.value = 'saving'
    error.value = null
    message.value = null

    try {
      const query = questionnaireId ? `?questionnaireId=${encodeURIComponent(questionnaireId)}` : ''
      const response = await apiRequest<PseudonymizedExportResponse>(`/compliance/exports/pseudonymized${query}`)
      exportPayload.value = response.export
      message.value = `Export pseudonymisé généré : ${response.export.rowCount} ligne(s), empreinte ${response.export.fingerprint.slice(0, 12)}…`
      status.value = 'ready'
      try {
        await fetchAuditLogs()
      } catch {
        auditLogs.value = []
      }
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Export pseudonymisé impossible.'
    }
  }

  async function fetchAuditLogs(): Promise<void> {
    const auditResponse = await apiRequest<AuditLogsResponse>('/audit-logs?limit=30')
    auditLogs.value = auditResponse.logs
  }

  async function runMaintenance(path: string, onSuccess: (response: ComplianceMaintenanceResponse) => void): Promise<void> {
    status.value = 'saving'
    error.value = null
    message.value = null

    try {
      const response = await apiRequest<ComplianceMaintenanceResponse>(path, { method: 'POST' })
      onSuccess(response)
      status.value = 'ready'
      try {
        await fetchAuditLogs()
      } catch {
        auditLogs.value = []
      }
    } catch (caught) {
      status.value = 'error'
      error.value = caught instanceof Error ? caught.message : 'Action RGPD impossible.'
    }
  }

  return {
    register,
    policy,
    auditLogs,
    exportPayload,
    status,
    error,
    message,
    fetchAll,
    expireInvitations,
    cleanupDrafts,
    fetchPseudonymizedExport,
  }
})
