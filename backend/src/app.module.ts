import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { validateEnvironment } from './config/env.validation'

import { AuditModule } from './audit/audit.module'
import { AuthModule } from './auth/auth.module'
import { BuildingsModule } from './buildings/buildings.module'
import { ComplianceModule } from './compliance/compliance.module'
import { IdentityVaultModule } from './identity-vault/identity-vault.module'
import { JudicialModule } from './judicial/judicial.module'
import { ModerationModule } from './moderation/moderation.module'
import { NotificationsModule } from './notifications/notifications.module'
import { ObservabilityModule } from './observability/observability.module'
import { PrismaModule } from './prisma/prisma.module'
import { QuestionnairesModule } from './questionnaires/questionnaires.module'
import { RespondentModule } from './respondent/respondent.module'
import { SecurityModule } from './security/security.module'
import { SmsModule } from './sms/sms.module'
import { StatsModule } from './stats/stats.module'
import { TerminalModule } from './terminal/terminal.module'
import { TerminalAdminModule } from './terminal-admin/terminal-admin.module'
import { UsersModule } from './users/users.module'
import { VersionsModule } from './versions/versions.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validateEnvironment,
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
    ObservabilityModule,
    RespondentModule,
    SmsModule,
    StatsModule,
    TerminalModule,
    TerminalAdminModule,
    UsersModule,
    JudicialModule,
  ],
})
export class AppModule {}
