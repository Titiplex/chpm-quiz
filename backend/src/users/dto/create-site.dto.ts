import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class CreateSiteDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  code!: string

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string
}
