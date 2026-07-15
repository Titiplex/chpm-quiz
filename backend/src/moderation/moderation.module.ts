import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { IdentityVaultModule } from '../identity-vault/identity-vault.module'
import { MailModule } from '../mail/mail.module'
import { SmsModule } from '../sms/sms.module'
import { ModerationController } from './moderation.controller'
import { ModerationService } from './moderation.service'

@Module({
  imports: [AuditModule, AuthModule, IdentityVaultModule, MailModule, SmsModule],
  controllers: [ModerationController],
  providers: [ModerationService],
})
export class ModerationModule {}
