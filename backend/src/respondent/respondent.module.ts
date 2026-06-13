import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { RespondentController } from './respondent.controller'
import { RespondentService } from './respondent.service'

@Module({
  imports: [AuditModule],
  controllers: [RespondentController],
  providers: [RespondentService],
})
export class RespondentModule {}
