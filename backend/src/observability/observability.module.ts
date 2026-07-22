import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { HealthController } from './health.controller'
import { MetricsController } from './metrics.controller'
import { ObservabilityService } from './observability.service'
import { MetricsTokenGuard } from './metrics-token.guard'

@Module({
  imports: [AuthModule],
  controllers: [HealthController, MetricsController],
  providers: [ObservabilityService, MetricsTokenGuard],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
