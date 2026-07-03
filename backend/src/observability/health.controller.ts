import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common'

import { IdentityPrismaService } from '../prisma/identity-prisma.service'
import { PrismaService } from '../prisma/prisma.service'

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identityPrisma: IdentityPrismaService,
  ) {}

  @Get('live')
  live() {
    return {
      status: 'ok',
      service: 'chpm-api',
      timestamp: new Date().toISOString(),
    }
  }

  @Get('ready')
  async ready() {
    const checks = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.identityPrisma.$queryRaw`SELECT 1`,
    ])

    const operational = checks[0]?.status === 'fulfilled'
    const identity = checks[1]?.status === 'fulfilled'
    const status = operational && identity ? 'ok' : 'degraded'

    const payload = {
      status,
      service: 'chpm-api',
      checks: {
        operationalDatabase: operational ? 'ok' : 'failed',
        identityDatabase: identity ? 'ok' : 'failed',
      },
      timestamp: new Date().toISOString(),
    }

    if (status !== 'ok') {
      throw new HttpException(payload, HttpStatus.SERVICE_UNAVAILABLE)
    }

    return payload
  }
}
