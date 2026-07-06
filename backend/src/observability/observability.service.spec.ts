import { describe, expect, it } from 'vitest'

import { ObservabilityService } from './observability.service'

describe('ObservabilityService', () => {
  it('records HTTP counters, latency and derived respondent security metrics', () => {
    const service = new ObservabilityService()

    service.recordHttp({ method: 'GET', path: '/api/respondent/session/abcdef0123456789abcdef012345', statusCode: 401, durationMs: 19.6 })
    service.recordHttp({ method: 'POST', path: '/api/respondent/answers', statusCode: 500, durationMs: -5 })
    service.recordAutosaveFailure('network timeout')
    service.recordInvalidTokenAttempt('bad signature', '/api/respondent/session')

    const snapshot = service.snapshot()

    expect(snapshot.api.requestsTotal).toBe(2)
    expect(snapshot.api.errorsTotal).toBe(2)
    expect(snapshot.api.errorsByStatus).toEqual({ '401': 1, '500': 1 })
    expect(snapshot.api.latencyMs).toMatchObject({ count: 2, p50: 0, p95: 20, max: 20 })
    expect(snapshot.respondent.autosaveFailuresTotal).toBe(2)
    expect(snapshot.respondent.autosaveFailuresByReason).toMatchObject({ '500': 1, network_timeout: 1 })
    expect(snapshot.security.invalidTokenAttemptsTotal).toBe(2)
    expect(snapshot.security.invalidTokenAttemptsByReason).toMatchObject({ '401': 1, bad_signature: 1 })
  })

  it('tracks unusual pseudonymized exports and renders prometheus metrics', () => {
    const service = new ObservabilityService()

    service.recordPseudonymizedExport({ actorRole: 'analyst', rowCount: 2, sourceRowCount: 2, suppressedByThreshold: true, questionnaireId: 'q1', fingerprint: 'low' })
    service.recordPseudonymizedExport({ actorRole: 'admin', rowCount: 501, sourceRowCount: 501, suppressedByThreshold: false, questionnaireId: 'q1', fingerprint: 'large' })

    const snapshot = service.snapshot()
    const prometheus = service.prometheus()

    expect(snapshot.compliance.pseudonymizedExportsTotal).toBe(2)
    expect(snapshot.compliance.unusualExportsTotal).toBe(1)
    expect(snapshot.compliance.recentUnusualExports[0]).toMatchObject({ fingerprint: 'large', actorRole: 'admin' })
    expect(prometheus).toContain('chpm_compliance_unusual_exports_total 1')
    expect(prometheus).toContain('chpm_api_latency_p95_ms')
  })
})
