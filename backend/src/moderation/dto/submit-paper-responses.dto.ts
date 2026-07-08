import { Type } from 'class-transformer'
import { IsArray, IsDefined, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator'

export class PaperAnswerDto {
  @IsUUID()
  questionId!: string

  @IsDefined()
  value!: unknown
}

export class SubmitPaperResponsesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaperAnswerDto)
  answers!: PaperAnswerDto[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  moderatorNote?: string
}
