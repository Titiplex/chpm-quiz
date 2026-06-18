import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
