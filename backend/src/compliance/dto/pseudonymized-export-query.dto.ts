import { IsOptional, IsUUID } from 'class-validator'

export class PseudonymizedExportQueryDto {
  @IsOptional()
  @IsUUID()
  questionnaireId?: string
}
