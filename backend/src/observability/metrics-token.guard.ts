import { createHash, timingSafeEqual } from 'node:crypto'

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request } from 'express'

@Injectable()
export class MetricsTokenGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>()
    const expected = this.config.get<string>('METRICS_TOKEN')?.trim()
    const authorization = request.header('authorization') ?? ''
    const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
    if (!expected || !supplied || !this.safeEqual(expected, supplied)) {
      throw new UnauthorizedException('Invalid metrics collector credential')
    }
    return true
  }

  private safeEqual(left: string, right: string): boolean {
    const leftHash = createHash('sha256').update(left).digest()
    const rightHash = createHash('sha256').update(right).digest()
    return timingSafeEqual(leftHash, rightHash)
  }
}
