import { afterEach, describe, expect, it, vi } from 'vitest'

import { MailProviderService } from './mail-provider.service'

function config(values: Record<string, string | undefined>) {
  return {
    get: <T = string>(key: string, fallback?: T): T | string | undefined => values[key] ?? fallback,
  }
}

const payload = {
  template: 'invitation' as const,
  to: { email: 'patient@example.org' },
  subject: 'Invitation',
  text: 'Bonjour',
  html: '<p>Bonjour</p>',
  invitationId: 'invitation-secret',
  publicCode: 'ABCD-1234',
  metadata: { questionnaireVersionId: 'itq-version', expiresAt: '2026-08-01T00:00:00.000Z' },
}

describe('MailProviderService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('allows simulation delivery outside production', async () => {
    const service = new MailProviderService(config({ NODE_ENV: 'development', EMAIL_PROVIDER: 'simulation' }) as any)

    const result = await service.send(payload)

    expect(result.provider).toBe('simulation')
    expect(result.simulated).toBe(true)
    expect(result.providerMessageId).toMatch(/^sim-/)
  })

  it('refuses simulation as production provider', async () => {
    const service = new MailProviderService(config({ NODE_ENV: 'production', EMAIL_PROVIDER: 'simulation' }) as any)

    await expect(service.send(payload)).rejects.toThrow(/simulation est interdit/i)
  })

  it('does not forward internal metadata to Brevo', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ messageId: 'brevo-1' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const service = new MailProviderService(config({
      NODE_ENV: 'production',
      EMAIL_PROVIDER: 'brevo',
      EMAIL_FROM: 'no-reply@example.org',
      BREVO_API_KEY: 'secret',
    }) as any)

    await service.send(payload)

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body).not.toHaveProperty('params')
    expect(JSON.stringify(body)).not.toContain(payload.publicCode)
    expect(JSON.stringify(body)).not.toContain(payload.invitationId)
    expect(JSON.stringify(body)).not.toContain('itq-version')
  })

  it('does not forward internal metadata to SendGrid', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response('', { status: 202, headers: { 'x-message-id': 'sendgrid-1' } }))
    vi.stubGlobal('fetch', fetchMock)
    const service = new MailProviderService(config({
      NODE_ENV: 'production',
      EMAIL_PROVIDER: 'sendgrid',
      EMAIL_FROM: 'no-reply@example.org',
      SENDGRID_API_KEY: 'secret',
    }) as any)

    await service.send(payload)

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.personalizations[0]).not.toHaveProperty('custom_args')
    expect(JSON.stringify(body)).not.toContain(payload.publicCode)
    expect(JSON.stringify(body)).not.toContain(payload.invitationId)
  })

  it('does not forward internal identifiers to Mailjet', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(JSON.stringify({ Messages: [{ To: [{ MessageID: 42 }] }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const service = new MailProviderService(config({
      NODE_ENV: 'production',
      EMAIL_PROVIDER: 'mailjet',
      EMAIL_FROM: 'no-reply@example.org',
      MAILJET_API_KEY: 'public',
      MAILJET_API_SECRET: 'private',
    }) as any)

    await service.send(payload)

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.Messages[0]).not.toHaveProperty('CustomID')
    expect(JSON.stringify(body)).not.toContain(payload.publicCode)
    expect(JSON.stringify(body)).not.toContain(payload.invitationId)
  })

  it('does not expose provider response bodies in persisted errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'recipient patient@example.org rejected', code: 'sensitive-details' }), { status: 400 })))
    const service = new MailProviderService(config({
      NODE_ENV: 'production',
      EMAIL_PROVIDER: 'brevo',
      EMAIL_FROM: 'no-reply@example.org',
      BREVO_API_KEY: 'secret',
    }) as any)

    await expect(service.send(payload)).rejects.toThrow('Brevo a refusé l\'email (HTTP 400)')
    await expect(service.send(payload)).rejects.not.toThrow(/patient@example\.org|sensitive-details/)
  })
})
