import { randomBytes } from 'node:crypto'

import { InternalServerErrorException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { EmailCryptoService } from './email-crypto.service'

function config(values: Record<string, string | undefined> = {}) {
  return {
    get: <T = string>(key: string, defaultValue?: T): T | undefined => (values[key] as T | undefined) ?? defaultValue,
  }
}

describe('EmailCryptoService', () => {
  it('normalizes, encrypts and decrypts email addresses with AES-GCM payloads', () => {
    const service = new EmailCryptoService(config({
      EMAIL_ENCRYPTION_KEY_B64: randomBytes(32).toString('base64'),
      EMAIL_HASH_PEPPER: 'pepper-for-tests',
    }) as any)

    const encrypted = service.encryptEmail('  USER@Example.ORG  ')

    expect(encrypted).toMatch(/^v1\./)
    expect(encrypted).not.toContain('USER@Example.ORG')
    expect(service.decryptEmail(encrypted)).toBe('user@example.org')
    expect(service.maskEncryptedEmail(encrypted)).toBe('us***@ex***.org')
  })

  it('hashes normalized emails deterministically without exposing the original address', () => {
    const service = new EmailCryptoService(config({ EMAIL_HASH_PEPPER: 'stable-pepper' }) as any)

    const hashA = service.hashEmail('Admin@CHPM.Local')
    const hashB = service.hashEmail(' admin@chpm.local ')

    expect(hashA).toBe(hashB)
    expect(hashA).toMatch(/^[0-9a-f]{64}$/)
    expect(hashA).not.toContain('admin')
  })

  it('requires explicit cryptographic secrets in production', () => {
    const service = new EmailCryptoService(config({ NODE_ENV: 'production' }) as any)

    expect(() => service.encryptEmail('admin@chpm.local')).toThrow(InternalServerErrorException)
  })
})
