import { describe, expect, it, vi } from 'vitest'

import { MailQueueService } from './mail-queue.service'

function persistentIdentityQueue() {
  const jobs: any[] = []
  return {
    recordDeliveryEvent: vi.fn(async () => undefined),
    markOutboundEmailSent: vi.fn(async () => undefined),
    enqueueOutboundJob: vi.fn(async (_channel: string, payload: unknown, maxAttempts: number) => {
      const id = `job-${jobs.length + 1}`
      jobs.push({ id, payload, attempt: 0, maxAttempts, availableAt: new Date(0) })
      return id
    }),
    claimOutboundJob: vi.fn(async () => {
      const now = Date.now()
      const index = jobs.findIndex((job) => job.availableAt.getTime() <= now)
      if (index < 0) return null
      const [job] = jobs.splice(index, 1)
      job.attempt += 1
      return job
    }),
    completeOutboundJob: vi.fn(async () => undefined),
    retryOutboundJob: vi.fn(async (_id: string, _error: string, availableAt: Date, dead: boolean) => {
      if (!dead) {
        jobs.push({ id: _id, payload: lastPayload, attempt: 1, maxAttempts: 2, availableAt })
      }
    }),
  }
}

let lastPayload: any

describe('MailQueueService', () => {
  it('persists, claims and completes successful provider delivery', async () => {
    const provider = { send: vi.fn(async () => ({ provider: 'brevo', providerMessageId: 'provider-1', simulated: false })) }
    const identityVault = persistentIdentityQueue()
    const queue = new MailQueueService(provider as any, identityVault as any, { get: vi.fn((_: string, fallback?: string) => fallback) } as any)
    lastPayload = {
      invitationId: 'invitation-1',
      publicCode: 'CODE-1',
      template: 'invitation',
      to: { email: 'patient@example.org' },
      subject: 'Invitation',
      text: 'Hello',
    }

    const jobId = await queue.enqueue(lastPayload)
    await queue.flush()

    expect(jobId).toBe('job-1')
    expect(identityVault.enqueueOutboundJob).toHaveBeenCalledWith('email', lastPayload, 3)
    expect(provider.send).toHaveBeenCalledOnce()
    expect(identityVault.completeOutboundJob).toHaveBeenCalledWith('job-1', 'provider-1')
    expect(identityVault.markOutboundEmailSent).toHaveBeenCalledWith('invitation-1')
  })

  it('persists retries and marks a permanently failed job dead', async () => {
    const provider = { send: vi.fn(async () => { throw new Error('provider unavailable') }) }
    const identityVault = persistentIdentityQueue()
    const queue = new MailQueueService(provider as any, identityVault as any, { get: vi.fn((key: string, fallback?: string) => {
      if (key === 'EMAIL_JOB_MAX_ATTEMPTS') return '2'
      if (key === 'EMAIL_JOB_RETRY_DELAY_MS') return '0'
      return fallback
    }) } as any)
    lastPayload = {
      invitationId: 'invitation-2',
      publicCode: 'CODE-2',
      template: 'reminder',
      to: { email: 'patient@example.org' },
      subject: 'Reminder',
      text: 'Hello',
    }

    await queue.enqueue(lastPayload)
    await queue.flush()

    expect(provider.send).toHaveBeenCalledTimes(2)
    expect(identityVault.retryOutboundJob).toHaveBeenLastCalledWith('job-1', 'provider unavailable', expect.any(Date), true)
    expect(identityVault.completeOutboundJob).not.toHaveBeenCalled()
  })
})
