import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedSession, AuthenticatedUser } from '../../auth/auth.types'

type AuthenticatedRequest = Request & {
  authSession?: AuthenticatedSession
  user?: AuthenticatedUser
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

    if (!request.user) {
      throw new Error('CurrentUser decorator used without SessionAuthGuard')
    }

    return request.user
  },
)
