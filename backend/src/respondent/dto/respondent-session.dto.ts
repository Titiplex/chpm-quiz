import { IsOptional, IsString } from 'class-validator'

export class RespondentTokenDto {
  @IsString()
  token!: string

  @IsOptional()
  @IsString()
  terminalToken?: string
}
