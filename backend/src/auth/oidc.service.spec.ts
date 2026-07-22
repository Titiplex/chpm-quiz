import { BadRequestException, ServiceUnavailableException } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

import { OidcService } from './oidc.service'

const settings: Record<string, string> = {
  AUTH_PROVIDER: 'oidc',
  AUTH_OIDC_ISSUER: 'https://identity.example.test',
  AUTH_OIDC_CLIENT_ID: 'chpm-client',
  AUTH_OIDC_CLIENT_SECRET: 'client-secret',
  AUTH_OIDC_REDIRECT_URI: 'https://survey.example.test/api/auth/oidc/callback',
  AUTH_OIDC_SCOPES: 'openid email profile',
}

function makeService() {
  const prisma = {
    oidcLoginState: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async () => undefined),
      findUnique: vi.fn(async () => null),
    },
  }
  const config = { get: vi.fn((key: string, fallback?: string) => settings[key] ?? fallback) }
  return { service: new OidcService(prisma as any, config as any), prisma }
}

afterEach(() => vi.unstubAllGlobals())

describe('OidcService', () => {
  it('starts Authorization Code with PKCE and stores only short-lived state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      issuer: settings.AUTH_OIDC_ISSUER,
      authorization_endpoint: 'https://identity.example.test/authorize',
      token_endpoint: 'https://identity.example.test/token',
      jwks_uri: 'https://identity.example.test/jwks',
    }), { status: 200 })))
    const { service, prisma } = makeService()

    const authorizationUrl = new URL(await service.createAuthorizationUrl('/stats'))

    expect(authorizationUrl.origin + authorizationUrl.pathname).toBe('https://identity.example.test/authorize')
    expect(authorizationUrl.searchParams.get('response_type')).toBe('code')
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toBe('S256')
    expect(authorizationUrl.searchParams.get('code_challenge')).toBeTruthy()
    expect(prisma.oidcLoginState.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      stateHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      codeVerifier: expect.any(String),
      nonce: expect.any(String),
      returnTo: '/stats',
      expiresAt: expect.any(Date),
    }) })
  })

  it('rejects incomplete callbacks and non-HTTPS discovery endpoints', async () => {
    const { service } = makeService()
    await expect(service.completeAuthorization('', '')).rejects.toBeInstanceOf(BadRequestException)

    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      issuer: settings.AUTH_OIDC_ISSUER,
      authorization_endpoint: 'https://identity.example.test/authorize',
      token_endpoint: 'http://identity.example.test/token',
      jwks_uri: 'https://identity.example.test/jwks',
    }), { status: 200 })))
    await expect(service.createAuthorizationUrl('/')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
