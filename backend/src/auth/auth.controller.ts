import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import type { Request, Response } from 'express'

import { CurrentSession } from '../common/decorators/current-session.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { AuthService } from './auth.service'
import type { AuthenticatedSession, AuthenticatedUser } from './auth.types'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.login(dto.email, dto.password, request, response)
    return { user }
  }

  @UseGuards(SessionAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user: this.authService.toPublicProfile(user) }
  }

  @UseGuards(SessionAuthGuard)
  @Post('logout')
  async logout(
    @CurrentSession() session: AuthenticatedSession,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(session.id, response)
    return { ok: true }
  }
}
