import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthenticatedSession } from '../../auth/auth.types'

type AuthenticatedRequest = Request & {
  authSession?: AuthenticatedSession
}

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedSession => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()

    if (!request.authSession) {
      throw new Error('CurrentSession decorator used without SessionAuthGuard')
    }

    return request.authSession
  },
)
