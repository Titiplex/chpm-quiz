import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { AuthModule } from './auth/auth.module'
import { BuildingsModule } from './buildings/buildings.module'
import { PrismaModule } from './prisma/prisma.module'
import { QuestionnairesModule } from './questionnaires/questionnaires.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    BuildingsModule,
    QuestionnairesModule,
  ],
})
export class AppModule {}
