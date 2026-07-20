import { IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class CreateBuildingDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
  code!: string

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  label!: string

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city!: string

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country!: string

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  timezone!: string
}
