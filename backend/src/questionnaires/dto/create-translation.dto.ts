import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateTranslationDto {
  @IsString()
  @IsIn(['fr', 'en', 'es'])
  language!: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  finality?: string
}
