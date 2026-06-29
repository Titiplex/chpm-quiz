import { Module } from '@nestjs/common'

import { IdentityVaultModule } from '../identity-vault/identity-vault.module'
import { MailProviderService } from './mail-provider.service'
import { MailQueueService } from './mail-queue.service'

@Module({
  imports: [IdentityVaultModule],
  providers: [MailProviderService, MailQueueService],
  exports: [MailProviderService, MailQueueService],
})
export class MailModule {}
