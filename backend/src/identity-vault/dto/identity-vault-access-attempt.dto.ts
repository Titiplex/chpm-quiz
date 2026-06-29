import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class IdentityVaultAccessAttemptDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9-]{4,64}$/)
  publicCode?: string

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2_000)
  justification?: string
}
