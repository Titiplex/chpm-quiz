import { IsOptional, IsString, MaxLength } from 'class-validator'

export class IdentityVaultAccessAttemptDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  publicCode?: string

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justification?: string
}
