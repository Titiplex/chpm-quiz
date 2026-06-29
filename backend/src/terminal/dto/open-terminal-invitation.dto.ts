import { IsString } from 'class-validator'

export class TerminalTokenDto {
  @IsString()
  terminalToken!: string
}
