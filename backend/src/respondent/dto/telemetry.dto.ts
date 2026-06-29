import { IsDateString, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator'

const respondentTelemetryEvents = [
  'session_open',
  'questionnaire_resume',
  'answer_change',
  'popup_open',
  'popup_close',
  'forward_navigation',
  'backward_navigation',
  'questionnaire_total_time',
  'questionnaire_abandon',
] as const

export class TelemetryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  terminalToken?: string

  @IsOptional()
  @IsUUID()
  questionId?: string

  @IsOptional()
  @IsUUID()
  popupDefinitionId?: string

  @IsString()
  @IsIn(respondentTelemetryEvents)
  eventType!: string

  @IsOptional()
  @IsObject()
  eventPayload?: Record<string, unknown>

  @IsOptional()
  @IsInt()
  @Min(1)
  currentPage?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number

  @IsOptional()
  @IsDateString()
  occurredAt?: string
}
