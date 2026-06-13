import { Module } from '@nestjs/common'

import { AuthController } from './auth.controller'
import { MeController } from '../profile/me.controller'
import { AuthService } from './auth.service'

@Module({
  controllers: [AuthController, MeController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
