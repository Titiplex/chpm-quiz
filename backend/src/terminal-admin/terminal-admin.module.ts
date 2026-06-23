import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AuditModule } from '../audit/audit.module'
import { PrismaModule } from '../prisma/prisma.module'
import { SecurityModule } from '../security/security.module'
import { TerminalAdminController } from './terminal-admin.controller'
import { TerminalAdminService } from './terminal-admin.service'

@Module({
  imports: [PrismaModule, SecurityModule, AuditModule, ConfigModule],
  controllers: [TerminalAdminController],
  providers: [TerminalAdminService],
  exports: [TerminalAdminService],
})
export class TerminalAdminModule {}
