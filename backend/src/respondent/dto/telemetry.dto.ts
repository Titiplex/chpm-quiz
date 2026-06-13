import { IsDateString, IsInt, IsObject, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export class TelemetryDto {
  @IsString()
  token!: string

  @IsOptional()
  @IsUUID()
  questionId?: string

  @IsOptional()
  @IsUUID()
  popupDefinitionId?: string

  @IsString()
  eventType!: string

  @IsOptional()
  @IsObject()
  eventPayload?: Record<string, unknown>

  @IsOptional()
  @IsInt()
  @Min(0)
  durationMs?: number

  @IsOptional()
  @IsDateString()
  occurredAt?: string
}
