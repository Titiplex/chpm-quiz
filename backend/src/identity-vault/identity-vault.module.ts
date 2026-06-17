import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { IdentityVaultController } from './identity-vault.controller'
import { IdentityVaultService } from './identity-vault.service'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [IdentityVaultController],
  providers: [IdentityVaultService],
})
export class IdentityVaultModule {}
