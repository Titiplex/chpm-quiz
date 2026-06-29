import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

const notificationEvents = [
  'submission_received',
  'difficult_question',
  'invitation_expired',
  'campaign_finished',
  'double_submission_attempt',
  'judicial_access_executed',
] as const

const notificationChannels = ['email', 'internal', 'simulation'] as const
const notificationFrequencies = ['none', 'immediate', 'daily'] as const

export class UpsertNotificationSubscriptionDto {
  @IsIn(notificationEvents)
  eventType!: (typeof notificationEvents)[number]

  @IsOptional()
  @IsString()
  @IsIn(notificationChannels)
  channel?: (typeof notificationChannels)[number]

  @IsOptional()
  @IsString()
  @IsIn(notificationFrequencies)
  frequency?: (typeof notificationFrequencies)[number]

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  digestHour?: number

  @IsOptional()
  @IsUUID()
  questionnaireVersionId?: string

  @IsOptional()
  @IsUUID()
  buildingId?: string

  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean
}
