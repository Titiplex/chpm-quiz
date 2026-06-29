import { Module } from '@nestjs/common'

import { AuthController } from './auth.controller'
import { MeController } from '../profile/me.controller'
import { AuthService } from './auth.service'
import { IdentityProviderConfigService } from './identity-provider.config'

@Module({
  controllers: [AuthController, MeController],
  providers: [AuthService, IdentityProviderConfigService],
  exports: [AuthService, IdentityProviderConfigService],
})
export class AuthModule {}
