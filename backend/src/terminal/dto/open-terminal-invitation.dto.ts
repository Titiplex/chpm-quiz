import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class TerminalTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  terminalToken!: string
}
