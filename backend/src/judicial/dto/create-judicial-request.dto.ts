import { ArrayNotEmpty, IsArray, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateJudicialRequestDto {
  @IsString()
  @MinLength(3)
  requestReference!: string

  @IsString()
  @MinLength(10)
  legalBasisDescription!: string

  @IsOptional()
  @IsString()
  courtOrderReference?: string

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  requestedPublicCodes!: string[]

  @IsString()
  @MinLength(3)
  requestedBy!: string

  @IsOptional()
  @IsString()
  comments?: string
}
