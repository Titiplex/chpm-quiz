import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator'

export class CreateTerminalDeviceDto {
  @IsUUID()
  buildingId!: string

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  label!: string
}
