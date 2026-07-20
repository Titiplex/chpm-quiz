import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { ObservabilityModule } from '../observability/observability.module'
import { ComplianceController } from './compliance.controller'
import { ComplianceService } from './compliance.service'
import { ComplianceMaintenanceService } from './compliance-maintenance.service'
import { IdentityVaultModule } from '../identity-vault/identity-vault.module'

@Module({
  imports: [AuthModule, AuditModule, ObservabilityModule, IdentityVaultModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceMaintenanceService],
})
export class ComplianceModule {}
