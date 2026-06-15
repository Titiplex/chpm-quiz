import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator'

export class CreateConditionalRuleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code!: string

  @IsObject()
  trigger!: Record<string, unknown>

  @IsObject()
  effect!: Record<string, unknown>

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  priority?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class UpdateConditionalRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code?: string

  @IsOptional()
  @IsObject()
  trigger?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  effect?: Record<string, unknown>

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  priority?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
