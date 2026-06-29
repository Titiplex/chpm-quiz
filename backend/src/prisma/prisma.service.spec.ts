import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { PrismaService } from './prisma.service'

describe('PrismaService operational boundary', () => {
  it('blocks identity delegates from the operational client', () => {
    const config = {
      get: (key: string) => key === 'DATABASE_URL' ? 'postgresql://user:pass@localhost:5432/db?schema=public' : undefined,
    }
    const prisma = new PrismaService(config as any)

    expect(() => prisma.identityVaultEntry).toThrow(ForbiddenException)
    expect(() => prisma.emailDeliveryEvent).toThrow(ForbiddenException)
    expect(() => prisma.identityVaultAuditLog).toThrow(ForbiddenException)
  })
})
