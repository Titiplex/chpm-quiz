import { Global, Module } from '@nestjs/common'

import { AccessTokenService } from './access-token.service'

@Global()
@Module({
  providers: [AccessTokenService],
  exports: [AccessTokenService],
})
export class SecurityModule {}
