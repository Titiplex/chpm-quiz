import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { IdentityVaultController } from './identity-vault.controller'
import { IdentityVaultService } from './identity-vault.service'

@Module({
  imports: [AuditModule],
  controllers: [IdentityVaultController],
  providers: [IdentityVaultService],
})
export class IdentityVaultModule {}
