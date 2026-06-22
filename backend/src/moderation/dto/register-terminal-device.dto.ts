import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class RegisterTerminalDeviceDto {
  @IsUUID()
  buildingId!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string
}
