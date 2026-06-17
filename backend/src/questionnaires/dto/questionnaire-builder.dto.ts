import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator'
const supportedBuilderQuestionTypes = ['free_text', 'free_text_short', 'free_text_long', 'likert', 'single_choice', 'multiple_choice', 'number', 'date', 'information'] as const
type BuilderQuestionType = (typeof supportedBuilderQuestionTypes)[number]

export class UpdateQuestionnaireDto {
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
  @MinLength(2)
  @MaxLength(12)
  defaultLanguage?: string

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  finality?: string
}

export class CreateQuestionGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  description?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  displayOrder?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  questionsPerPage?: number

  @IsOptional()
  @IsBoolean()
  randomize?: boolean

  @IsOptional()
  @IsObject()
  conditionExpression?: Record<string, unknown>
}

export class UpdateQuestionGroupDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  description?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  displayOrder?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  questionsPerPage?: number

  @IsOptional()
  @IsBoolean()
  randomize?: boolean

  @IsOptional()
  @IsObject()
  conditionExpression?: Record<string, unknown>
}

export class LikertScaleDto {
  @IsInt()
  @Min(3)
  @Max(10)
  points!: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  minValue?: number

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  leftAnchor!: string

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  rightAnchor!: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  neutralLabel?: string

  @IsOptional()
  @IsBoolean()
  allowNotApplicable?: boolean
}

export class PopupDefinitionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  title!: string

  @IsString()
  @MinLength(5)
  @MaxLength(2_000)
  body!: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  termsExplained?: string[]
}

export class AnswerOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  value!: string

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  label!: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  displayOrder?: number

  @IsOptional()
  @IsBoolean()
  isExclusive?: boolean
}

export class CreateQuestionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code!: string

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  label!: string

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  helperText?: string

  @IsIn(supportedBuilderQuestionTypes, {
    message: 'Type de question non pris en charge par le constructeur administrateur.',
  })
  responseType!: BuilderQuestionType

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  displayOrder?: number

  @IsOptional()
  @IsObject()
  conditionExpression?: Record<string, unknown>

  @ValidateIf((dto: CreateQuestionDto) => dto.responseType === 'single_choice' || dto.responseType === 'multiple_choice')
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  answerOptions?: AnswerOptionDto[]

  @ValidateIf((dto: CreateQuestionDto) => dto.responseType === 'likert')
  @ValidateNested()
  @Type(() => LikertScaleDto)
  likertScale?: LikertScaleDto

  @IsOptional()
  @ValidateNested()
  @Type(() => PopupDefinitionDto)
  popupDefinition?: PopupDefinitionDto
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  code?: string

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  label?: string

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  helperText?: string

  @IsOptional()
  @IsIn(supportedBuilderQuestionTypes, {
    message: 'Type de question non pris en charge par le constructeur administrateur.',
  })
  responseType?: BuilderQuestionType

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  displayOrder?: number

  @IsOptional()
  @IsObject()
  conditionExpression?: Record<string, unknown>

  @ValidateIf((dto: UpdateQuestionDto) => dto.responseType === 'single_choice' || dto.responseType === 'multiple_choice' || dto.answerOptions !== undefined)
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => AnswerOptionDto)
  answerOptions?: AnswerOptionDto[]

  @ValidateIf((dto: UpdateQuestionDto) => dto.responseType === 'likert' || dto.likertScale !== undefined)
  @ValidateNested()
  @Type(() => LikertScaleDto)
  likertScale?: LikertScaleDto

  @IsOptional()
  @ValidateNested()
  @Type(() => PopupDefinitionDto)
  popupDefinition?: PopupDefinitionDto | null
}
