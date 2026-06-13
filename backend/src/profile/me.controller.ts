import { Controller, Get, UseGuards } from '@nestjs/common'

import { AuthService } from '../auth/auth.service'
import type { AuthenticatedUser } from '../auth/auth.types'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { SessionAuthGuard } from '../common/guards/session-auth.guard'

@Controller()
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(SessionAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return { user: this.authService.toPublicProfile(user) }
  }
}
