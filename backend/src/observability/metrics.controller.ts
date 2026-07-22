import { Controller, Get, Header, UseGuards } from '@nestjs/common'

import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { ObservabilityService } from './observability.service'
import { MetricsTokenGuard } from './metrics-token.guard'

@Controller('metrics')
export class MetricsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get()
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('technical_admin')
  metrics(): { metrics: unknown } {
    return { metrics: this.observability.snapshot() }
  }

  @Get('prometheus')
  @UseGuards(MetricsTokenGuard)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  prometheus(): string {
    return this.observability.prometheus()
  }
}
