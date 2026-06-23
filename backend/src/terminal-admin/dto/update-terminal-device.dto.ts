import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

const terminalStatuses = ['active', 'paused', 'revoked'] as const

export class UpdateTerminalDeviceDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label?: string

  @IsOptional()
  @IsIn(terminalStatuses)
  status?: typeof terminalStatuses[number]
}
