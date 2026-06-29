import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common'
import type { Request } from 'express'

import { TerminalTokenDto } from './dto/open-terminal-invitation.dto'
import { TerminalService } from './terminal.service'

@Controller('terminal')
export class TerminalController {
  constructor(private readonly terminalService: TerminalService) {}

  @Get('session')
  async session(@Query('token') terminalToken: string) {
    return this.terminalService.getSession(terminalToken)
  }

  @Post('invitations/:id/open')
  async openInvitation(@Param('id') id: string, @Body() dto: TerminalTokenDto, @Req() request: Request) {
    return this.terminalService.openInvitation(id, dto.terminalToken, request)
  }
}
