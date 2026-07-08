import { Module } from '@nestjs/common'

import { IdentityVaultModule } from '../identity-vault/identity-vault.module'
import { SmsProviderService } from './sms-provider.service'
import { SmsQueueService } from './sms-queue.service'

@Module({
  imports: [IdentityVaultModule],
  providers: [SmsProviderService, SmsQueueService],
  exports: [SmsProviderService, SmsQueueService],
})
export class SmsModule {}
