import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { HealthController } from './health.controller'
import { MetricsController } from './metrics.controller'
import { ObservabilityService } from './observability.service'

@Module({
  imports: [AuthModule],
  controllers: [HealthController, MetricsController],
  providers: [ObservabilityService],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
