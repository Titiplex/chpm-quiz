import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { IdentityVaultModule } from '../identity-vault/identity-vault.module'
import { JudicialController } from './judicial.controller'
import { JudicialService } from './judicial.service'

@Module({
  imports: [AuditModule, AuthModule, IdentityVaultModule],
  controllers: [JudicialController],
  providers: [JudicialService],
})
export class JudicialModule {}
