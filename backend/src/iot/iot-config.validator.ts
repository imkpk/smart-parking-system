import { Injectable, OnModuleInit } from '@nestjs/common';
import { resolveIotConfig, validateIotSecrets } from './iot.config';

@Injectable()
export class IotConfigValidator implements OnModuleInit {
  onModuleInit(): void {
    const config = resolveIotConfig();
    validateIotSecrets(config);
  }
}