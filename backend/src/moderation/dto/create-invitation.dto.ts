import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator'

export const invitationDeliveryModes = ['email', 'email_simulation', 'sms', 'sms_simulation', 'onsite_terminal', 'paper_form', 'refusal_record'] as const
export const assistanceModes = ['none', 'technical_help', 'full_assisted_entry'] as const
export type InvitationDeliveryModeDto = typeof invitationDeliveryModes[number]
export type AssistanceModeDto = typeof assistanceModes[number]

export class CreateInvitationDto {
  @IsUUID()
  questionnaireVersionId!: string

  @IsUUID()
  buildingId!: string

  @ValidateIf((dto: CreateInvitationDto) => !['onsite_terminal', 'paper_form', 'refusal_record'].includes(dto.deliveryMode ?? ''))
  @ValidateIf((dto: CreateInvitationDto) => dto.deliveryMode === undefined || dto.deliveryMode === 'email' || dto.deliveryMode === 'email_simulation')
  @IsEmail()
  @MaxLength(254)
  email?: string

  @ValidateIf((dto: CreateInvitationDto) => dto.deliveryMode === 'sms' || dto.deliveryMode === 'sms_simulation')
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'phone doit être un numéro E.164, par exemple +33600000000' })
  @MaxLength(32)
  phone?: string

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
