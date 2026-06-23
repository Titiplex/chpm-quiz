import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AuditModule } from './audit/audit.module'
import { AuthModule } from './auth/auth.module'
import { BuildingsModule } from './buildings/buildings.module'
import { ComplianceModule } from './compliance/compliance.module'
import { IdentityVaultModule } from './identity-vault/identity-vault.module'
import { JudicialModule } from './judicial/judicial.module'
import { ModerationModule } from './moderation/moderation.module'
import { NotificationsModule } from './notifications/notifications.module'
import { PrismaModule } from './prisma/prisma.module'
import { QuestionnairesModule } from './questionnaires/questionnaires.module'
import { RespondentModule } from './respondent/respondent.module'
import { SecurityModule } from './security/security.module'
import { StatsModule } from './stats/stats.module'
import { TerminalModule } from './terminal/terminal.module'
import { TerminalAdminModule } from './terminal-admin/terminal-admin.module'
import { VersionsModule } from './versions/versions.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    SecurityModule,
    AuthModule,
    AuditModule,
    BuildingsModule,
    ComplianceModule,
    IdentityVaultModule,
    QuestionnairesModule,
    VersionsModule,
    ModerationModule,
    NotificationsModule,
    RespondentModule,
    StatsModule,
    TerminalModule,
    TerminalAdminModule,
    JudicialModule,
  ],
})
export class AppModule {}
