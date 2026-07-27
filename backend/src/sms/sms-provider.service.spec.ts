import { afterEach, describe, expect, it, vi } from 'vitest'

import { SmsProviderService } from './sms-provider.service'

function config(values: Record<string, string | undefined>) {
  return {
    get: <T = string>(key: string, fallback?: T): T | string | undefined => values[key] ?? fallback,
  }
}

const payload = {
  template: 'invitation' as const,
  to: { phone: '+33600000000' },
  text: 'Invitation sécurisée : https://example.org/r/token',
}

describe('SmsProviderService', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('allows simulation delivery outside production', async () => {
    const service = new SmsProviderService(config({ NODE_ENV: 'development', SMS_PROVIDER: 'simulation' }) as any)

    const result = await service.send(payload)

    expect(result.provider).toBe('simulation')
    expect(result.simulated).toBe(true)
    expect(result.providerMessageId).toMatch(/^sms-sim-/)
  })

  it('does not expose Twilio response bodies in persisted errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'recipient +33600000000 rejected' }), { status: 400 })))
    const service = new SmsProviderService(config({
      NODE_ENV: 'production',
      SMS_PROVIDER: 'twilio',
      TWILIO_ACCOUNT_SID: 'AC123',
      TWILIO_AUTH_TOKEN: 'secret',
      TWILIO_FROM: '+33611111111',
    }) as any)

    await expect(service.send(payload)).rejects.toThrow('Twilio a refusé le SMS (HTTP 400)')
    await expect(service.send(payload)).rejects.not.toThrow(/\+33600000000/)
  })

  it('does not expose Brevo response bodies in persisted errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'recipient +33600000000 rejected' }), { status: 400 })))
    const service = new SmsProviderService(config({
      NODE_ENV: 'production',
      SMS_PROVIDER: 'brevo',
      BREVO_API_KEY: 'secret',
    }) as any)

    await expect(service.send(payload)).rejects.toThrow('Brevo a refusé le SMS (HTTP 400)')
    await expect(service.send(payload)).rejects.not.toThrow(/\+33600000000/)
  })
})
