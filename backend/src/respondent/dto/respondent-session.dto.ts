import { IsString } from 'class-validator'

export class RespondentTokenDto {
  @IsString()
  token!: string
}
