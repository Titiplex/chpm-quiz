import { Module } from '@nestjs/common'

import { ProjectAdministrationController, SiteAdministrationController, UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
  controllers: [ProjectAdministrationController, SiteAdministrationController, UsersController],
  providers: [UsersService],
})
export class UsersModule {}
