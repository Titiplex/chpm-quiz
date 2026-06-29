import { describe, expect, it } from 'vitest'

import { MailProviderService } from './mail-provider.service'

function config(values: Record<string, string | undefined>) {
  return {
    get: <T = string>(key: string, fallback?: T): T | string | undefined => values[key] ?? fallback,
  }
}

describe('MailProviderService', () => {
  it('allows simulation delivery outside production', async () => {
    const service = new MailProviderService(config({ NODE_ENV: 'development', EMAIL_PROVIDER: 'simulation' }) as any)

    const result = await service.send({
      template: 'invitation',
      to: { email: 'patient@example.org' },
      subject: 'Invitation',
      text: 'Bonjour',
      html: '<p>Bonjour</p>',
    })

    expect(result.provider).toBe('simulation')
    expect(result.simulated).toBe(true)
    expect(result.providerMessageId).toMatch(/^sim-/)
  })

  it('refuses simulation as production provider', async () => {
    const service = new MailProviderService(config({ NODE_ENV: 'production', EMAIL_PROVIDER: 'simulation' }) as any)

    await expect(service.send({
      template: 'invitation',
      to: { email: 'patient@example.org' },
      subject: 'Invitation',
      text: 'Bonjour',
      html: '<p>Bonjour</p>',
    })).rejects.toThrow(/simulation est interdit/i)
  })
})
