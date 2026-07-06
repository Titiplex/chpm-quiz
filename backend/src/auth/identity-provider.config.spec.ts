import { describe, expect, it } from 'vitest'

import { IdentityProviderConfigService } from './identity-provider.config'

describe('IdentityProviderConfigService', () => {
  function service(values: Record<string, string | undefined>) {
    return new IdentityProviderConfigService({ get: (key: string, fallback?: string) => values[key] ?? fallback } as any)
  }

  it('returns a disabled local provider by default', () => {
    expect(service({}).getConfig()).toEqual({
      provider: 'local',
      issuer: undefined,
      audience: undefined,
      metadataUrl: undefined,
      callbackPath: '/api/auth/callback',
      enabled: false,
    })
  })

  it('normalizes OIDC and SAML providers with issuer, audience and metadata', () => {
    expect(service({ AUTH_PROVIDER: 'oidc', AUTH_OIDC_ISSUER: 'https://idp.example.test', AUTH_AUDIENCE: 'chpm-api', AUTH_METADATA_URL: 'https://idp.example.test/.well-known/openid-configuration', AUTH_CALLBACK_PATH: '/callback' }).getConfig()).toMatchObject({
      provider: 'oidc',
      issuer: 'https://idp.example.test',
      audience: 'chpm-api',
      metadataUrl: 'https://idp.example.test/.well-known/openid-configuration',
      callbackPath: '/callback',
      enabled: true,
    })
    expect(service({ AUTH_PROVIDER: 'saml', AUTH_SAML_ENTITY_ID: 'entity-id' }).getConfig()).toMatchObject({ provider: 'saml', issuer: 'entity-id', enabled: true })
  })

  it('falls back to local for unknown providers', () => {
    expect(service({ AUTH_PROVIDER: 'ldap' }).getConfig()).toMatchObject({ provider: 'local', enabled: false })
  })
})
