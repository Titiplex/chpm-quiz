import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateVersionDto {
  @IsString()
  @MinLength(1)
  versionLabel!: string

  @IsOptional()
  @IsString()
  language?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  finality?: string

  @IsOptional()
  @IsDateString()
  openFrom?: string

  @IsOptional()
  @IsDateString()
  openUntil?: string
}
