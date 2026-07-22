import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useComplianceStore } from '@/stores/compliance'
import {
  pseudonymizedExportFixture,
  retentionPolicyFixture,
  technicalRegisterFixture,
} from './fixtures/api'

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status })
}

describe('useComplianceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads register, policy and audit logs, tolerating audit failures', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/compliance/technical-register')) {
        return jsonResponse({ register: technicalRegisterFixture })
      }
      if (String(url).endsWith('/compliance/retention-policy')) {
        return jsonResponse({ policy: retentionPolicyFixture })
      }
      if (String(url).endsWith('/audit-logs')) {
        return jsonResponse({ message: 'Audit inaccessible' }, 403)
      }
      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useComplianceStore()
    await store.fetchAll()

    expect(store.status).toBe('ready')
    expect(store.register).toEqual(technicalRegisterFixture)
    expect(store.policy).toEqual(retentionPolicyFixture)
    expect(store.auditLogs).toEqual([])
  })

  it('runs maintenance actions and exposes explicit business messages', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).endsWith('/audit-logs')) {
        return jsonResponse({ logs: [] })
      }

      if (String(url).endsWith('/expire-invitations')) {
        return jsonResponse({ result: { expiredCount: 2, executedAt: '2026-01-01T00:00:00.000Z' } })
      }
      if (String(url).endsWith('/cleanup-drafts')) {
        return jsonResponse({
          result: { deletedDraftSessionCount: 3, executedAt: '2026-01-01T00:00:00.000Z' },
        })
      }
      if (String(url).endsWith('/run-retention')) {
        return jsonResponse({
          result: {
            expiredInvitationCount: 4,
            deletedDraftSessionCount: 5,
            deletedSubmittedSessionCount: 6,
            executedAt: '2026-01-01T00:00:00.000Z',
          },
        })
      }

      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useComplianceStore()

    await store.expireInvitations()
    expect(store.message).toBe('2 invitation(s) expirée(s) et auditée(s).')

    await store.cleanupDrafts()
    expect(store.message).toBe('3 brouillon(s) expiré(s) nettoyé(s).')

    await store.runRetention()
    expect(store.message).toBe(
      'Cycle de conservation exécuté : 4 invitation(s), 5 brouillon(s) et 6 réponse(s) traités.',
    )
    expect(store.status).toBe('ready')
  })

  it('fetches a pseudonymized export with an encoded questionnaire filter', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (
        String(url).includes('/compliance/exports/pseudonymized?questionnaireId=questionnaire%201')
      ) {
        return jsonResponse({ export: pseudonymizedExportFixture })
      }
      if (String(url).endsWith('/audit-logs')) {
        return jsonResponse({ logs: [] })
      }
      return jsonResponse({ message: 'unexpected route' }, 500)
    })
    vi.stubGlobal('fetch', fetchMock)

    const store = useComplianceStore()
    await store.fetchPseudonymizedExport('questionnaire 1')

    expect(store.status).toBe('ready')
    expect(store.exportPayload).toEqual(pseudonymizedExportFixture)
    expect(store.message).toContain(
      'Export pseudonymisé généré : 1 ligne(s), empreinte 0123456789ab',
    )
  })

  it('records errors for failed loads, maintenance and exports', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ message: 'RGPD indisponible' }, 500)),
    )

    const store = useComplianceStore()

    await store.fetchAll()
    expect(store.status).toBe('error')
    expect(store.error).toBe('RGPD indisponible')

    await store.expireInvitations()
    expect(store.status).toBe('error')
    expect(store.error).toBe('RGPD indisponible')

    await store.fetchPseudonymizedExport()
    expect(store.status).toBe('error')
    expect(store.error).toBe('RGPD indisponible')
  })
})
