import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

export class CreateJudicialRequestDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  requestReference!: string

  @IsString()
  @MinLength(10)
  @MaxLength(2_000)
  legalBasisDescription!: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  courtOrderReference?: string

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  requestedPublicCodes!: string[]

  @IsString()
  @MinLength(3)
  @MaxLength(254)
  requestedBy!: string

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  comments?: string
}
