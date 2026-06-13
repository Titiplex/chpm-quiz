import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { CreateJudicialRequestDto } from './dto/create-judicial-request.dto'
import { JudicialService } from './judicial.service'

@UseGuards(SessionAuthGuard, RolesGuard)
@Controller('judicial-access/requests')
export class JudicialController {
  constructor(private readonly judicialService: JudicialService) {}

  @Get()
  @Roles('admin', 'dpo', 'judicial_officer')
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
}
