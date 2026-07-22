import { createHash, createPublicKey, createVerify, randomBytes, timingSafeEqual } from 'node:crypto'

import { BadRequestException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { PrismaService } from '../prisma/prisma.service'

type DiscoveryDocument = {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
}

type IdTokenClaims = {
  iss?: string
  aud?: string | string[]
  azp?: string
  sub?: string
  exp?: number
  iat?: number
  nonce?: string
  email?: string
  email_verified?: boolean
  acr?: string
  amr?: string[]
}

@Injectable()
export class OidcService {
  private discoveryCache?: { value: DiscoveryDocument; expiresAt: number }

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  enabled(): boolean {
    return this.config.get<string>('AUTH_PROVIDER', 'local') === 'oidc'
  }

  async createAuthorizationUrl(returnTo = '/'): Promise<string> {
    this.assertEnabled()
    const discovery = await this.discovery()
    const state = randomBytes(32).toString('base64url')
    const nonce = randomBytes(32).toString('base64url')
    const codeVerifier = randomBytes(48).toString('base64url')
    const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
    await this.prisma.oidcLoginState.deleteMany({ where: { expiresAt: { lt: new Date() } } })
    await this.prisma.oidcLoginState.create({
      data: {
        stateHash: this.hash(state),
        codeVerifier,
        nonce,
        returnTo: this.safeReturnTo(returnTo),
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    })

    const url = new URL(discovery.authorization_endpoint)
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: this.required('AUTH_OIDC_CLIENT_ID'),
      redirect_uri: this.required('AUTH_OIDC_REDIRECT_URI'),
      scope: this.config.get<string>('AUTH_OIDC_SCOPES', 'openid email profile'),
      state,
      nonce,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    }).toString()
    return url.toString()
  }

  async completeAuthorization(code: string, state: string): Promise<{ email: string; returnTo: string }> {
    this.assertEnabled()
    if (!code?.trim() || !state?.trim()) throw new BadRequestException('OIDC code and state are required')
    const loginState = await this.prisma.oidcLoginState.findUnique({ where: { stateHash: this.hash(state) } })
    if (!loginState || loginState.expiresAt <= new Date()) {
      throw new UnauthorizedException('OIDC state is invalid or expired')
    }
    await this.prisma.oidcLoginState.delete({ where: { id: loginState.id } })

    const discovery = await this.discovery()
    const tokenResponse = await this.fetchWithTimeout(discovery.token_endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.required('AUTH_OIDC_CLIENT_ID')}:${this.required('AUTH_OIDC_CLIENT_SECRET')}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.required('AUTH_OIDC_REDIRECT_URI'),
        code_verifier: loginState.codeVerifier,
      }),
    })
    if (!tokenResponse.ok) throw new UnauthorizedException('OIDC token exchange failed')
    const tokens = await tokenResponse.json() as { id_token?: string }
    if (!tokens.id_token) throw new UnauthorizedException('OIDC provider did not return an ID token')
    const claims = await this.verifyIdToken(tokens.id_token, loginState.nonce, discovery)
    if (!claims.email || claims.email_verified === false) {
      throw new UnauthorizedException('OIDC account must expose a verified email address')
    }
    this.assertMfa(claims)
    return { email: claims.email.trim().toLowerCase(), returnTo: loginState.returnTo }
  }

  private async verifyIdToken(token: string, expectedNonce: string, discovery: DiscoveryDocument): Promise<IdTokenClaims> {
    const parts = token.split('.')
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) throw new UnauthorizedException('Invalid OIDC ID token')
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as { alg?: string; kid?: string }
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as IdTokenClaims
    if (!header.kid || !['RS256', 'RS384', 'RS512'].includes(header.alg ?? '')) {
      throw new UnauthorizedException('Unsupported OIDC signing algorithm')
    }
    const jwksResponse = await this.fetchWithTimeout(discovery.jwks_uri)
    if (!jwksResponse.ok) throw new ServiceUnavailableException('OIDC signing keys are unavailable')
    const jwks = await jwksResponse.json() as { keys?: Array<Record<string, unknown> & { kid?: string }> }
    const jwk = jwks.keys?.find((candidate) => candidate.kid === header.kid)
    if (!jwk) throw new UnauthorizedException('OIDC signing key was not found')
    const key = createPublicKey({ key: jwk as unknown as import('node:crypto').JsonWebKey, format: 'jwk' })
    const verifier = createVerify(`RSA-SHA${header.alg?.slice(2)}`)
    verifier.update(`${parts[0]}.${parts[1]}`)
    verifier.end()
    if (!verifier.verify(key, Buffer.from(parts[2], 'base64url'))) throw new UnauthorizedException('OIDC signature validation failed')

    const now = Math.floor(Date.now() / 1_000)
    const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    const clientId = this.required('AUTH_OIDC_CLIENT_ID')
    if (claims.iss !== discovery.issuer || !audience.includes(clientId) || (audience.length > 1 && claims.azp !== clientId) || !claims.exp || claims.exp <= now || !claims.iat || claims.iat > now + 60) {
      throw new UnauthorizedException('OIDC token claims are invalid')
    }
    if (!claims.nonce || !this.safeEqual(claims.nonce, expectedNonce)) throw new UnauthorizedException('OIDC nonce validation failed')
    return claims
  }

  private assertMfa(claims: IdTokenClaims): void {
    const requiredAcr = this.config.get<string>('AUTH_OIDC_REQUIRED_ACR')?.trim()
    const requiredAmr = this.config.get<string>('AUTH_OIDC_REQUIRED_AMR')?.trim()
    if (requiredAcr && claims.acr !== requiredAcr) throw new UnauthorizedException('The required OIDC authentication assurance level was not met')
    if (requiredAmr && !claims.amr?.includes(requiredAmr)) throw new UnauthorizedException('The required OIDC MFA method was not present')
  }

  private async discovery(): Promise<DiscoveryDocument> {
    if (this.discoveryCache && this.discoveryCache.expiresAt > Date.now()) return this.discoveryCache.value
    const issuer = this.required('AUTH_OIDC_ISSUER').replace(/\/$/, '')
    const response = await this.fetchWithTimeout(`${issuer}/.well-known/openid-configuration`)
    if (!response.ok) throw new ServiceUnavailableException('OIDC discovery failed')
    const document = await response.json() as DiscoveryDocument
    const endpoints = [document.authorization_endpoint, document.token_endpoint, document.jwks_uri]
    if (document.issuer !== issuer || endpoints.some((endpoint) => !endpoint?.startsWith('https://'))) {
      throw new ServiceUnavailableException('OIDC discovery document is incomplete or has an unexpected issuer')
    }
    this.discoveryCache = { value: document, expiresAt: Date.now() + 60 * 60_000 }
    return document
  }

  private fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const timeout = Math.min(Math.max(Number(this.config.get<string>('PROVIDER_HTTP_TIMEOUT_MS', '10000')), 1_000), 60_000)
    return fetch(url, { ...init, signal: AbortSignal.timeout(timeout) })
  }

  private safeReturnTo(value: string): string {
    return value.startsWith('/') && !value.startsWith('//') ? value.slice(0, 500) : '/'
  }

  private required(key: string): string {
    const value = this.config.get<string>(key)?.trim()
    if (!value) throw new ServiceUnavailableException(`${key} is required for OIDC authentication`)
    return value
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
  }

  private assertEnabled(): void {
    if (!this.enabled()) throw new BadRequestException('OIDC authentication is not enabled')
  }
}
