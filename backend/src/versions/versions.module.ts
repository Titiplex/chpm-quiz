import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { VersionsController } from './versions.controller'
import { VersionsService } from './versions.service'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [VersionsController],
  providers: [VersionsService],
})
export class VersionsModule {}
