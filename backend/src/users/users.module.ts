import { Module } from '@nestjs/common';
import { UsageLimitsModule } from '../usage-limits/usage-limits.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [UsageLimitsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
