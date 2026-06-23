import { Module } from '@nestjs/common';
import { UsageLimitsService } from './usage-limits.service';

@Module({
  providers: [UsageLimitsService],
  exports: [UsageLimitsService],
})
export class UsageLimitsModule {}