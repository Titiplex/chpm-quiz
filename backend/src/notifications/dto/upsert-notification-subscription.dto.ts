import { IsBoolean, IsIn, IsOptional, IsString, IsUUID } from 'class-validator'

const notificationEvents = [
  'submission_received',
  'difficult_question',
  'invitation_expired',
  'campaign_finished',
  'double_submission_attempt',
  'judicial_access_executed',
] as const

export class UpsertNotificationSubscriptionDto {
  @IsIn(notificationEvents)
  eventType!: (typeof notificationEvents)[number]

  @IsOptional()
  @IsString()
  @IsIn(['email', 'internal'])
  channel?: string

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
