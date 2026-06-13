import { IsOptional, IsString, MinLength } from 'class-validator'

export class CreateQuestionnaireDto {
  @IsString()
  @MinLength(3)
  code!: string

  @IsString()
  @MinLength(3)
  title!: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  defaultLanguage?: string

  @IsOptional()
  @IsString()
  finality?: string
}
