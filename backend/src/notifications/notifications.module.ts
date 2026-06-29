import { Module } from '@nestjs/common'

import { ConfigModule } from '@nestjs/config'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { IdentityVaultModule } from '../identity-vault/identity-vault.module'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [AuthModule, AuditModule, ConfigModule, IdentityVaultModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
