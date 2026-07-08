import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class UpdateSiteAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName?: string

  @IsOptional()
  @IsUUID()
  siteId?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
