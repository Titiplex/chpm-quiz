import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

export class RespondentTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token!: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  terminalToken?: string
}
