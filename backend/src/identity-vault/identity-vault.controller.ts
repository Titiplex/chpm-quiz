import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { IdentityVaultAccessAttemptDto } from './dto/identity-vault-access-attempt.dto'
import { IdentityVaultService } from './identity-vault.service'

@UseGuards(SessionAuthGuard)
@Controller('identity-vault')
export class IdentityVaultController {
  constructor(private readonly identityVaultService: IdentityVaultService) {}

  @Get('status')
  async status(@CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    const status = await this.identityVaultService.status(user, request)
    return { status }
  }

  @Post('access-attempt')
  async recordAccessAttempt(
    @Body() dto: IdentityVaultAccessAttemptDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: Request,
  ) {
    return this.identityVaultService.recordAccessAttempt(user, dto, request)
  }
}
