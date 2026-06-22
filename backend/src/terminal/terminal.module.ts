import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { TerminalController } from './terminal.controller'
import { TerminalService } from './terminal.service'

@Module({
  imports: [AuditModule],
  controllers: [TerminalController],
  providers: [TerminalService],
})
export class TerminalModule {}
