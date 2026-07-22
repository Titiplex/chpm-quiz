import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class UpdateSiteModeratorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string

  @IsOptional()
  @IsUUID()
  buildingId?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
