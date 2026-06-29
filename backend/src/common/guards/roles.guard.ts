import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import type { AuthenticatedUser } from '../../auth/auth.types'
import type { UserRole } from '../../auth/role-permissions'
import { ROLES_KEY } from '../decorators/roles.decorator'

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles?.length) {
      throw new ForbiddenException('Route protégée sans autorisation explicite : refus par défaut')
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Droits insuffisants pour cette ressource')
    }

    return true
  }
}
