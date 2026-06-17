import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateJudicialRequestDto } from './dto/create-judicial-request.dto'
import { JudicialWorkflowCommentDto, RejectJudicialRequestDto } from './dto/judicial-workflow.dto'
import { JudicialService } from './judicial.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('judicial-access/requests')
export class JudicialController {
  constructor(private readonly judicialService: JudicialService) {}

  @Get()
  @Roles('dpo', 'judicial_officer')
  async list() {
    const requests = await this.judicialService.list()
    return { requests }
  }

  @Post()
  @Roles('dpo', 'judicial_officer')
  async create(
    @Body() dto: CreateJudicialRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const judicialRequest = await this.judicialService.create(dto, user, request)
    return { judicialRequest }
  }

  @Post(':id/validate-dpo')
  @Roles('dpo')
  async validateDpo(
    @Param('id') id: string,
    @Body() dto: JudicialWorkflowCommentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const judicialRequest = await this.judicialService.validateDpo(id, user, dto, request)
    return { judicialRequest }
  }

  @Post(':id/validate-legal')
  @Roles('judicial_officer')
  async validateLegal(
    @Param('id') id: string,
    @Body() dto: JudicialWorkflowCommentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const judicialRequest = await this.judicialService.validateLegal(id, user, dto, request)
    return { judicialRequest }
  }

  @Post(':id/reject')
  @Roles('dpo', 'judicial_officer')
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectJudicialRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const judicialRequest = await this.judicialService.reject(id, user, dto, request)
    return { judicialRequest }
  }

  @Post(':id/execute')
  @Roles('judicial_officer')
  async execute(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.judicialService.execute(id, user, request)
  }

  @Post(':id/close')
  @Roles('dpo', 'judicial_officer')
  async close(
    @Param('id') id: string,
    @Body() dto: JudicialWorkflowCommentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    const judicialRequest = await this.judicialService.close(id, user, dto, request)
    return { judicialRequest }
  }
}
