import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'

import { AuthService } from '../../auth/auth.service'
import type { AuthenticatedSession, AuthenticatedUser } from '../../auth/auth.types'

type AuthenticatedRequest = Request & {
  authSession?: AuthenticatedSession
  user?: AuthenticatedUser
  cookies: Record<string, string | undefined>
}

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = request.cookies[this.authService.cookieName]

    if (!token) {
      throw new UnauthorizedException('Authentification requise')
    }

    const session = await this.authService.validateSessionToken(token)

    if (!session) {
      throw new UnauthorizedException('Session invalide ou expirée')
    }

    request.authSession = session
    request.user = session.user

    return true
  }
}
