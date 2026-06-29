import { Module } from '@nestjs/common'

import { ConfigModule } from '@nestjs/config'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { IdentityVaultModule } from '../identity-vault/identity-vault.module'
import { MailModule } from '../mail/mail.module'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [AuthModule, AuditModule, ConfigModule, IdentityVaultModule, MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
