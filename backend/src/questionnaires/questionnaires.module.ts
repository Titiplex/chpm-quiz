import { Module } from '@nestjs/common'

import { AuditModule } from '../audit/audit.module'
import { AuthModule } from '../auth/auth.module'
import { QuestionnairesController } from './questionnaires.controller'
import { QuestionnairesService } from './questionnaires.service'

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [QuestionnairesController],
  providers: [QuestionnairesService],
})
export class QuestionnairesModule {}
