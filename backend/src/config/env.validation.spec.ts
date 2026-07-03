import { describe, expect, it } from 'vitest'

import { validateEnvironment } from './env.validation'

const secureProductionEnv = {
  NODE_ENV: 'production',
  FRONTEND_ORIGIN: 'https://questionnaires.example.org',
  OPERATIONAL_DATABASE_URL: 'postgresql://app_user:strong-password@postgres:5432/chpm?schema=public',
  IDENTITY_DATABASE_URL: 'postgresql://identity_user:strong-password@postgres:5432/chpm?schema=identity',
  RESPONDENT_TOKEN_SECRET: 'a'.repeat(48),
  COOKIE_SECURE: 'true',
  EMAIL_PROVIDER: 'brevo',
  EMAIL_ENCRYPTION_KEY_B64: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  EMAIL_HASH_PEPPER: 'b'.repeat(48),
  JUDICIAL_EXPORT_KEY_B64: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
}

describe('validateEnvironment', () => {
  it('refuse les CORS non HTTPS en production', () => {
    expect(() => validateEnvironment({
      ...secureProductionEnv,
      FRONTEND_ORIGIN: 'http://localhost:5173',
    })).toThrow(/FRONTEND_ORIGIN/)
  })

  it('refuse les cookies non Secure en production', () => {
    expect(() => validateEnvironment({
      ...secureProductionEnv,
      COOKIE_SECURE: 'false',
    })).toThrow(/COOKIE_SECURE/)
  })

  it('accepte une configuration production stricte', () => {
    const env = validateEnvironment(secureProductionEnv)

    expect(env.COOKIE_SECURE).toBe(true)
    expect(env.FRONTEND_ORIGIN).toBe('https://questionnaires.example.org')
    expect(env.STATISTICS_MIN_GROUP_SIZE).toBe(5)
  })
})
