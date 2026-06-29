import { describe, expect, it, vi } from 'vitest'

import { MailQueueService } from './mail-queue.service'

describe('MailQueueService', () => {
  it('journals queued attempts and successful provider delivery', async () => {
    const provider = {
      send: vi.fn(async () => ({
        provider: 'brevo',
        status: 'sent',
        providerMessageId: 'provider-1',
      })),
    }
    const identityVault = {
      recordDeliveryEvent: vi.fn(async () => undefined),
      markOutboundEmailSent: vi.fn(async () => undefined),
    }
    const queue = new MailQueueService(provider as any, identityVault as any, { get: vi.fn((_: string, fallback?: string) => fallback) } as any)

    const jobId = queue.enqueue({
      invitationId: 'invitation-1',
      publicCode: 'CODE-1',
      template: 'invitation',
      to: { email: 'patient@example.org' },
      subject: 'Invitation',
      text: 'Bonjour',
      html: '<p>Bonjour</p>',
    })

    await queue.flush()

    expect(jobId).toMatch(/^mail_/)
    expect(provider.send).toHaveBeenCalledOnce()
    expect(identityVault.markOutboundEmailSent).toHaveBeenCalledWith('invitation-1')
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({
      invitationId: 'invitation-1',
      eventType: 'email_send_success',
      metadata: expect.objectContaining({ providerMessageId: 'provider-1' }),
    }))
  })

  it('retries and journals failed sends', async () => {
    const provider = {
      send: vi.fn(async () => {
        throw new Error('provider unavailable')
      }),
    }
    const identityVault = {
      recordDeliveryEvent: vi.fn(async () => undefined),
      markOutboundEmailSent: vi.fn(async () => undefined),
    }
    const queue = new MailQueueService(provider as any, identityVault as any, { get: vi.fn((key: string, fallback?: string) => {
      if (key === 'EMAIL_JOB_MAX_ATTEMPTS') return '2'
      if (key === 'EMAIL_JOB_RETRY_DELAY_MS') return '0'
      return fallback
    }) } as any)

    const jobId = queue.enqueue({
      invitationId: 'invitation-2',
      publicCode: 'CODE-2',
      template: 'reminder',
      to: { email: 'patient@example.org' },
      subject: 'Relance',
      text: 'Bonjour',
      html: '<p>Bonjour</p>',
    })

    await queue.flush()

    expect(jobId).toMatch(/^mail_/)
    expect(provider.send).toHaveBeenCalledTimes(2)
    expect(identityVault.markOutboundEmailSent).not.toHaveBeenCalled()
    expect(identityVault.recordDeliveryEvent).toHaveBeenCalledWith(expect.objectContaining({
      invitationId: 'invitation-2',
      eventType: 'email_send_failure',
      metadata: expect.objectContaining({ error: 'provider unavailable' }),
    }))
  })
})
