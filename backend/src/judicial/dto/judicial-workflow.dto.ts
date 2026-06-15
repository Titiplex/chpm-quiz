import { IsOptional, IsString, MaxLength } from 'class-validator'

export class JudicialWorkflowCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  comments?: string
}

export class RejectJudicialRequestDto extends JudicialWorkflowCommentDto {
  @IsString()
  @MaxLength(2_000)
  reason!: string
}
