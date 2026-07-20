import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'

import { CurrentSession } from '../common/decorators/current-session.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'
import { AuthService } from './auth.service'
import type { AuthenticatedSession, AuthenticatedUser } from './auth.types'
import { LoginDto } from './dto/login.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { OidcService } from './oidc.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly oidcService: OidcService,
    private readonly config: ConfigService,
  ) {}

  @Get('config')
  configInfo() {
    const provider = this.config.get<string>('AUTH_PROVIDER', 'local')
    return { provider, localLoginEnabled: provider === 'local', oidcEnabled: this.oidcService.enabled() }
  }

  @Get('oidc/start')
  async startOidc(@Query('returnTo') returnTo: string | undefined, @Res() response: Response) {
    response.redirect(await this.oidcService.createAuthorizationUrl(returnTo))
  }

  @Get('oidc/callback')
  async completeOidc(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const result = await this.oidcService.completeAuthorization(code, state)
    await this.authService.loginExternal(result.email, request, response)
    const frontendOrigin = this.config.get<string>('FRONTEND_ORIGIN', '').split(',')[0]?.trim()
    response.redirect(`${frontendOrigin}${result.returnTo}`)
  }

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
  @Post('change-password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthenticatedUser,
    @CurrentSession() session: AuthenticatedSession,
  ) {
    const updatedUser = await this.authService.changePassword(
      user,
      session.id,
      dto.currentPassword,
      dto.newPassword,
    )
    return { user: updatedUser }
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
