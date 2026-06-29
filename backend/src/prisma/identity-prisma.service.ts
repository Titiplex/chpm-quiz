import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { loadPrismaClient } from './prisma-client.loader'

const PrismaClientBase = loadPrismaClient()

@Injectable()
export class IdentityPrismaService extends PrismaClientBase implements OnModuleInit, OnModuleDestroy {
  [key: string]: any

  constructor(config: ConfigService) {
    super({
      datasourceUrl: config.get<string>('IDENTITY_DATABASE_URL') || config.get<string>('DATABASE_URL'),
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
