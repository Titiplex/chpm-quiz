import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface RespondentAccessToken {
  /** Pseudonymous invitation identifier embedded in the signed token. */
  publicCode: string
  /** SHA-256 digest used to compare the presented token with persisted state. */
  tokenHash: string
}

/**
 * Creates and verifies respondent bearer tokens.
 *
 * The clear token combines a public code, 256-bit random secret, and HMAC-SHA-256
 * signature. Persistence stores only the full-token hash. Verification uses a
 * constant-time comparison for equal-length signatures.
 */
@Injectable()
export class AccessTokenService {
  constructor(private readonly config: ConfigService) {}

  /** Returns a new clear token once together with the digest that should be persisted. */
  create(publicCode: string): { token: string; tokenHash: string } {
    const secretPart = randomBytes(32).toString('base64url')
    const unsigned = `${publicCode}.${secretPart}`
    const signature = this.sign(unsigned)
    const token = `${unsigned}.${signature}`

    return {
      token,
      tokenHash: this.hash(token),
    }
  }

  /** Verifies token structure/signature and derives its public code and comparison hash. */
  verify(token: string): RespondentAccessToken {
    const parts = token.split('.')

    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new UnauthorizedException('Jeton répondant invalide')
    }

    const [publicCode, secretPart, signature] = parts
    const unsigned = `${publicCode}.${secretPart}`
    const expectedSignature = this.sign(unsigned)

    if (!this.safeEquals(signature, expectedSignature)) {
      throw new UnauthorizedException('Jeton répondant invalide')
    }

    return {
      publicCode,
      tokenHash: this.hash(token),
    }
  }

  /** Produces the deterministic digest used for server-side token lookup/comparison. */
  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  private sign(value: string): string {
    return createHmac('sha256', this.secret()).update(value).digest('base64url')
  }

  private secret(): string {
    return this.config.get<string>('RESPONDENT_TOKEN_SECRET')
      ?? this.config.get<string>('SESSION_SECRET')
      ?? 'development-only-change-me'
  }

  private safeEquals(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)

    if (leftBuffer.length !== rightBuffer.length) {
      return false
    }

    return timingSafeEqual(leftBuffer, rightBuffer)
  }
}
