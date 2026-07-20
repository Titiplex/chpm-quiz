import { Controller, Get, Query, UseGuards } from '@nestjs/common'

import { Roles } from '../common/decorators/roles.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuditService } from './audit.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('admin', 'dpo', 'judicial_officer', 'technical_admin')
  async list(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    const logs = await this.auditService.listForUser(user, limit ? Number(limit) : undefined)
    return { logs }
  }
}
