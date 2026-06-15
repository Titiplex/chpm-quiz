import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateQuestionnaireDto {
  @IsString()
  @MinLength(3)
  @MaxLength(40)
  code!: string

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  description?: string

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(12)
  defaultLanguage?: string

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  finality?: string
}
