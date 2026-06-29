import { Global, Module } from '@nestjs/common'

import { IdentityPrismaService } from './identity-prisma.service'
import { PrismaService } from './prisma.service'

@Global()
@Module({
  providers: [PrismaService, IdentityPrismaService],
  exports: [PrismaService, IdentityPrismaService],
})
export class PrismaModule {}
