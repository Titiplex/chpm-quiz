import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
