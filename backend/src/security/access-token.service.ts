import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface RespondentAccessToken {
  publicCode: string
  tokenHash: string
}

@Injectable()
export class AccessTokenService {
  constructor(private readonly config: ConfigService) {}

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
