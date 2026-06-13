import { IsArray, IsString, IsUUID, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class SaveAnswerItemDto {
  @IsUUID()
  questionId!: string

  value!: unknown
}

export class SaveAnswersDto {
  @IsString()
  token!: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveAnswerItemDto)
  answers!: SaveAnswerItemDto[]
}
