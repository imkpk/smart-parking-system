import { Module } from '@nestjs/common';
import { SecurityGateController } from './security-gate.controller';
import { SecurityGateService } from './security-gate.service';

@Module({
  controllers: [SecurityGateController],
  providers: [SecurityGateService],
})
export class SecurityModule {}