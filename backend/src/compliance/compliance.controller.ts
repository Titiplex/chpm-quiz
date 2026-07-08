import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { PseudonymizedExportQueryDto } from './dto/pseudonymized-export-query.dto'
import { ComplianceService } from './compliance.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('technical-register')
  @Roles('admin', 'analyst', 'technical_admin', 'judicial_officer')
  technicalRegister(@CurrentUser() user: AuthenticatedUser) {
    return { register: this.complianceService.technicalRegister(user) }
  }

  @Get('retention-policy')
  @Roles('admin', 'analyst', 'technical_admin', 'judicial_officer')
  retentionPolicy() {
    return { policy: this.complianceService.retentionPolicy() }
  }

  @Post('maintenance/expire-invitations')
  @Roles('admin', 'technical_admin')
  async expireInvitations(@CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    const result = await this.complianceService.expireInvitations(user, request)
    return { result }
  }

  @Post('maintenance/cleanup-drafts')
  @Roles('admin', 'technical_admin')
  async cleanupDrafts(@CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    const result = await this.complianceService.cleanupExpiredDrafts(user, request)
    return { result }
  }

  @Get('exports/pseudonymized')
  @Roles('admin', 'analyst')
  async pseudonymizedExport(
    @Query() query: PseudonymizedExportQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const exportPayload = await this.complianceService.pseudonymizedExport(query.questionnaireId, user, request)
    return { export: exportPayload }
  }
}
