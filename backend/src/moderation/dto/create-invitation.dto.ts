import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateInvitationDto {
  @IsUUID()
  questionnaireVersionId!: string

  @IsUUID()
  buildingId!: string

  @IsEmail()
  email!: string

  @IsOptional()
  @IsBoolean()
  notifyModerator?: boolean

  @IsOptional()
  @IsBoolean()
  notifyAdmins?: boolean

  @IsOptional()
  @IsString()
  expiresAt?: string
}
