import { IsArray, IsDefined, IsNotEmpty, IsOptional, IsString, IsUUID, ArrayMaxSize, ArrayNotEmpty, ValidateNested, MaxLength } from 'class-validator'
import { Type } from 'class-transformer'

export class SaveAnswerItemDto {
  @IsUUID()
  questionId!: string

  @IsDefined()
  value!: unknown
}

export class SaveAnswersDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  terminalToken?: string

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SaveAnswerItemDto)
  answers!: SaveAnswerItemDto[]
}
