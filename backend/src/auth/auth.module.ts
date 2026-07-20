import { Module } from '@nestjs/common'

import { AuthController } from './auth.controller'
import { MeController } from '../profile/me.controller'
import { AuthService } from './auth.service'
import { IdentityProviderConfigService } from './identity-provider.config'
import { OidcService } from './oidc.service'

@Module({
  controllers: [AuthController, MeController],
  providers: [AuthService, IdentityProviderConfigService, OidcService],
  exports: [AuthService, IdentityProviderConfigService, OidcService],
})
export class AuthModule {}
