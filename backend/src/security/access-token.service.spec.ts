import { UnauthorizedException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { AccessTokenService } from './access-token.service'

function config(secret = 'respondent-token-secret') {
  return {
    get: <T = string>(key: string): T | undefined => (key === 'RESPONDENT_TOKEN_SECRET' ? secret as T : undefined),
  }
}

describe('AccessTokenService', () => {
  it('creates signed respondent tokens and verifies their hash', () => {
    const service = new AccessTokenService(config() as any)

    const created = service.create('ITQ-0001')
    const verified = service.verify(created.token)

    expect(created.token).toMatch(/^ITQ-0001\./)
    expect(created.tokenHash).toHaveLength(64)
    expect(verified).toEqual({ publicCode: 'ITQ-0001', tokenHash: created.tokenHash })
  })

  it('rejects tampered tokens', () => {
    const service = new AccessTokenService(config() as any)
    const created = service.create('ITQ-0001')
    const tampered = created.token.replace('ITQ-0001', 'ITQ-0002')

    expect(() => service.verify(tampered)).toThrow(UnauthorizedException)
  })

  it('rejects malformed tokens', () => {
    const service = new AccessTokenService(config() as any)

    expect(() => service.verify('not-a-token')).toThrow(UnauthorizedException)
  })
})
