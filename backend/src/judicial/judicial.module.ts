import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { JudicialController } from './judicial.controller'
import { JudicialService } from './judicial.service'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [JudicialController],
  providers: [JudicialService],
})
export class JudicialModule {}
