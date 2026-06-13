import { Body, Controller, Get, Post, Put, Query } from '@nestjs/common'

import { RespondentTokenDto } from './dto/respondent-session.dto'
import { SaveAnswersDto } from './dto/save-answers.dto'
import { TelemetryDto } from './dto/telemetry.dto'
import { RespondentService } from './respondent.service'

@Controller('respondent')
export class RespondentController {
  constructor(private readonly respondentService: RespondentService) {}

  @Get('session')
  async getSession(@Query('token') token: string) {
    return this.respondentService.getSession(token)
  }

  @Put('answers')
  async saveAnswers(@Body() dto: SaveAnswersDto) {
    return this.respondentService.saveAnswers(dto)
  }

  @Post('telemetry')
  async telemetry(@Body() dto: TelemetryDto) {
    return this.respondentService.recordTelemetry(dto)
  }

  @Post('submit')
  async submit(@Body() dto: RespondentTokenDto) {
    return this.respondentService.submit(dto.token)
  }
}
