import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PrismaClientBase = require('@prisma/client').PrismaClient as new () => any

@Injectable()
export class PrismaService extends PrismaClientBase implements OnModuleInit, OnModuleDestroy {
  [key: string]: any

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
