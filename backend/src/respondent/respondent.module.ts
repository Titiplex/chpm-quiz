import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { RespondentController } from './respondent.controller'
import { RespondentService } from './respondent.service'

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [RespondentController],
  providers: [RespondentService],
})
export class RespondentModule {}
