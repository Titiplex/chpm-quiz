import { HttpException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import { HealthController } from './health.controller'
import { MetricsController } from './metrics.controller'

describe('observability controllers', () => {
  it('returns liveness and readiness when both databases respond', async () => {
    const controller = new HealthController({ $queryRaw: vi.fn(async () => 1) } as any, { $queryRaw: vi.fn(async () => 1) } as any)

    expect(controller.live()).toMatchObject({ status: 'ok', service: 'chpm-api' })
    await expect(controller.ready()).resolves.toMatchObject({ status: 'ok', checks: { operationalDatabase: 'ok', identityDatabase: 'ok' } })
  })

  it('throws a degraded readiness payload when a database fails', async () => {
    const controller = new HealthController({ $queryRaw: vi.fn(async () => 1) } as any, { $queryRaw: vi.fn(async () => { throw new Error('down') }) } as any)

    await expect(controller.ready()).rejects.toBeInstanceOf(HttpException)
  })

  it('proxies metrics snapshots and prometheus text', () => {
    const observability = { snapshot: vi.fn(() => ({ api: { requestsTotal: 1 } })), prometheus: vi.fn(() => 'metrics') }
    const controller = new MetricsController(observability as any)

    expect(controller.metrics()).toEqual({ metrics: { api: { requestsTotal: 1 } } })
    expect(controller.prometheus()).toBe('metrics')
  })
})
