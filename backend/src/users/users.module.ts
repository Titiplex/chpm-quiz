import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { ProjectAdministrationController, SiteAdministrationController, UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  imports: [AuthModule],
  controllers: [ProjectAdministrationController, SiteAdministrationController, UsersController],
  providers: [UsersService],
})
export class UsersModule {}
