import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class CreateSiteModeratorDto {
  @IsEmail()
  @MaxLength(254)
  email!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string

  @IsUUID()
  buildingId!: string

  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  temporaryPassword?: string
}
