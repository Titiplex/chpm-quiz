import { Controller, Get, Header, UseGuards } from '@nestjs/common'

import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { ObservabilityService } from './observability.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get()
  @Roles('technical_admin')
  metrics(): { metrics: unknown } {
    return { metrics: this.observability.snapshot() }
  }

  @Get('prometheus')
  @Roles('technical_admin')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  prometheus(): string {
    return this.observability.prometheus()
  }
}
