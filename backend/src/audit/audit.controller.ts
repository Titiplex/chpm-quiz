import { Controller, Get, Query, UseGuards } from '@nestjs/common'

import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { AuditService } from './audit.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('admin', 'dpo', 'judicial_officer', 'technical_admin')
  async list(@Query('limit') limit?: string) {
    const logs = await this.auditService.list(limit ? Number(limit) : undefined)
    return { logs }
  }
}
