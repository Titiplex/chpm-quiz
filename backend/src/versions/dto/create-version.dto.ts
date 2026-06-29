import { IsDateString, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class CreateVersionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9._-]+$/)
  versionLabel!: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(12)
  language?: string

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  finality?: string

  @IsOptional()
  @IsDateString()
  openFrom?: string

  @IsOptional()
  @IsDateString()
  openUntil?: string
}
