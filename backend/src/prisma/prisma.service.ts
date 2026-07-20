import { ForbiddenException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { loadPrismaClient } from './prisma-client.loader'

const PrismaClientBase = loadPrismaClient()

const identityDelegates = ['identityVaultEntry', 'emailDeliveryEvent', 'identityVaultAuditLog', 'outboundDeliveryJob'] as const

@Injectable()
export class PrismaService extends PrismaClientBase implements OnModuleInit, OnModuleDestroy {
  [key: string]: any

  constructor(config: ConfigService) {
    super({
      datasourceUrl: config.get<string>('OPERATIONAL_DATABASE_URL') || config.get<string>('DATABASE_URL'),
    })

    for (const delegateName of identityDelegates) {
      Object.defineProperty(this, delegateName, {
        configurable: true,
        enumerable: false,
        get: () => {
          throw new ForbiddenException(
            `Accès refusé à ${delegateName} depuis le client Prisma opérationnel. Utiliser IdentityPrismaService via IdentityVaultService.`,
          )
        },
      })
    }
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
