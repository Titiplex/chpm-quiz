import { Injectable } from '@nestjs/common'

interface HttpMetricInput {
  method: string
  path: string
  statusCode: number
  durationMs: number
}

interface ExportMetricInput {
  actorRole?: string
  rowCount: number
  sourceRowCount: number
  suppressedByThreshold: boolean
  questionnaireId?: string
  fingerprint: string
}

interface CounterMap {
  [key: string]: number
}

const latencySampleLimit = 1_000
const unusualExportRowThreshold = 500

@Injectable()
export class ObservabilityService {
  private readonly counters = new Map<string, number>()
  private readonly latencySamples: number[] = []
  private readonly recentUnusualExports: Array<ExportMetricInput & { recordedAt: string }> = []

  recordHttp(input: HttpMetricInput): void {
    const normalizedPath = this.normalizePath(input.path)
    this.increment('api.requests.total')
    this.increment(`api.requests.byRoute.${input.method}.${normalizedPath}`)

    if (input.statusCode >= 400) {
      this.increment('api.errors.total')
      this.increment(`api.errors.byStatus.${input.statusCode}`)
      this.increment(`api.errors.byRoute.${input.method}.${normalizedPath}.${input.statusCode}`)
    }

    this.latencySamples.push(Math.max(0, Math.round(input.durationMs)))
    if (this.latencySamples.length > latencySampleLimit) {
      this.latencySamples.shift()
    }

    if (normalizedPath === '/api/respondent/answers' && input.statusCode >= 400) {
      this.recordAutosaveFailure(String(input.statusCode))
    }

    if (normalizedPath.startsWith('/api/respondent') && [401, 403].includes(input.statusCode)) {
      this.recordInvalidTokenAttempt(String(input.statusCode), normalizedPath)
    }
  }

  recordAutosaveFailure(reason = 'unknown'): void {
    this.increment('respondent.autosave.failures.total')
    this.increment(`respondent.autosave.failures.byReason.${this.safeKey(reason)}`)
  }

  recordInvalidTokenAttempt(reason = 'unknown', route = 'unknown'): void {
    this.increment('security.invalidTokenAttempts.total')
    this.increment(`security.invalidTokenAttempts.byReason.${this.safeKey(reason)}`)
    this.increment(`security.invalidTokenAttempts.byRoute.${this.safeKey(route)}`)
  }

  recordPseudonymizedExport(input: ExportMetricInput): void {
    this.increment('compliance.exports.pseudonymized.total')
    this.increment(`compliance.exports.pseudonymized.byRole.${this.safeKey(input.actorRole ?? 'unknown')}`)

    if (input.rowCount >= unusualExportRowThreshold || !input.suppressedByThreshold && input.sourceRowCount >= unusualExportRowThreshold) {
      this.increment('compliance.exports.unusual.total')
      this.recentUnusualExports.unshift({ ...input, recordedAt: new Date().toISOString() })
      this.recentUnusualExports.splice(25)
    }
  }

  snapshot() {
    const latency = this.latencySnapshot()
    const counters = this.counterObject()

    return {
      generatedAt: new Date().toISOString(),
      api: {
        requestsTotal: counters['api.requests.total'] ?? 0,
        errorsTotal: counters['api.errors.total'] ?? 0,
        errorsByStatus: this.counterPrefix('api.errors.byStatus.'),
        latencyMs: latency,
      },
      respondent: {
        autosaveFailuresTotal: counters['respondent.autosave.failures.total'] ?? 0,
        autosaveFailuresByReason: this.counterPrefix('respondent.autosave.failures.byReason.'),
      },
      security: {
        invalidTokenAttemptsTotal: counters['security.invalidTokenAttempts.total'] ?? 0,
        invalidTokenAttemptsByReason: this.counterPrefix('security.invalidTokenAttempts.byReason.'),
        invalidTokenAttemptsByRoute: this.counterPrefix('security.invalidTokenAttempts.byRoute.'),
      },
      compliance: {
        pseudonymizedExportsTotal: counters['compliance.exports.pseudonymized.total'] ?? 0,
        unusualExportsTotal: counters['compliance.exports.unusual.total'] ?? 0,
        recentUnusualExports: this.recentUnusualExports,
      },
    }
  }

  prometheus(): string {
    const snapshot = this.snapshot()
    return [
      '# HELP chpm_api_requests_total Total API requests.',
      '# TYPE chpm_api_requests_total counter',
      `chpm_api_requests_total ${snapshot.api.requestsTotal}`,
      '# HELP chpm_api_errors_total Total API errors.',
      '# TYPE chpm_api_errors_total counter',
      `chpm_api_errors_total ${snapshot.api.errorsTotal}`,
      '# HELP chpm_api_latency_p95_ms API latency p95 in milliseconds.',
      '# TYPE chpm_api_latency_p95_ms gauge',
      `chpm_api_latency_p95_ms ${snapshot.api.latencyMs.p95}`,
      '# HELP chpm_respondent_autosave_failures_total Autosave failures.',
      '# TYPE chpm_respondent_autosave_failures_total counter',
      `chpm_respondent_autosave_failures_total ${snapshot.respondent.autosaveFailuresTotal}`,
      '# HELP chpm_security_invalid_token_attempts_total Invalid respondent token attempts.',
      '# TYPE chpm_security_invalid_token_attempts_total counter',
      `chpm_security_invalid_token_attempts_total ${snapshot.security.invalidTokenAttemptsTotal}`,
      '# HELP chpm_compliance_unusual_exports_total Unusual pseudonymized exports.',
      '# TYPE chpm_compliance_unusual_exports_total counter',
      `chpm_compliance_unusual_exports_total ${snapshot.compliance.unusualExportsTotal}`,
      '',
    ].join('\n')
  }

  private increment(key: string): void {
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1)
  }

  private counterObject(): CounterMap {
    return Object.fromEntries(this.counters.entries())
  }

  private counterPrefix(prefix: string): CounterMap {
    const entries = [...this.counters.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value] as const)
    return Object.fromEntries(entries)
  }

  private latencySnapshot() {
    const samples = [...this.latencySamples].sort((left, right) => left - right)
    if (!samples.length) {
      return { count: 0, p50: 0, p95: 0, max: 0 }
    }

    return {
      count: samples.length,
      p50: percentile(samples, 0.5),
      p95: percentile(samples, 0.95),
      max: samples[samples.length - 1] ?? 0,
    }
  }

  private normalizePath(path: string): string {
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, ':uuid')
      .replace(/[A-Za-z0-9_-]{24,}/g, ':token')
  }

  private safeKey(value: string): string {
    return value.replace(/[^A-Za-z0-9_.:/-]+/g, '_').slice(0, 120) || 'unknown'
  }
}

function percentile(sortedSamples: number[], ratio: number): number {
  const index = Math.min(sortedSamples.length - 1, Math.max(0, Math.ceil(sortedSamples.length * ratio) - 1))
  return sortedSamples[index] ?? 0
}
