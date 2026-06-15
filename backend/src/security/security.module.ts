import { Global, Module } from '@nestjs/common'

import { AccessTokenService } from './access-token.service'
import { EmailCryptoService } from './email-crypto.service'

@Global()
@Module({
  providers: [AccessTokenService, EmailCryptoService],
  exports: [AccessTokenService, EmailCryptoService],
})
export class SecurityModule {}
