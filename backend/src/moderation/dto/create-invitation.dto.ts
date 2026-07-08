import { IsBoolean, IsDateString, IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength, ValidateIf } from 'class-validator'

export const invitationDeliveryModes = ['email', 'email_simulation', 'onsite_terminal', 'paper_form', 'refusal_record'] as const
export const assistanceModes = ['none', 'technical_help', 'full_assisted_entry'] as const
export type InvitationDeliveryModeDto = typeof invitationDeliveryModes[number]
export type AssistanceModeDto = typeof assistanceModes[number]

export class CreateInvitationDto {
  @IsUUID()
  questionnaireVersionId!: string

  @IsUUID()
  buildingId!: string

  @ValidateIf((dto: CreateInvitationDto) => !['onsite_terminal', 'paper_form', 'refusal_record'].includes(dto.deliveryMode ?? ''))
  @IsEmail()
  @MaxLength(254)
  email?: string

  @IsOptional()
  @IsIn(invitationDeliveryModes)
  deliveryMode?: InvitationDeliveryModeDto

  @ValidateIf((dto: CreateInvitationDto) => dto.deliveryMode === 'onsite_terminal')
  @IsUUID()
  terminalDeviceId?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  refusalReason?: string

  @IsOptional()
  @IsIn(assistanceModes)
  assistanceMode?: AssistanceModeDto

  @IsOptional()
  @IsBoolean()
  notifyModerator?: boolean

  @IsOptional()
  @IsBoolean()
  notifyAdmins?: boolean

  @IsOptional()
  @IsDateString()
  expiresAt?: string
}
