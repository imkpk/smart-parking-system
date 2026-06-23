import { Global, Module } from '@nestjs/common';
import { AccessPolicyService } from './access-policy.service';
import { MailerService } from './mailer.service';

@Global()
@Module({
  providers: [AccessPolicyService, MailerService],
  exports: [AccessPolicyService, MailerService],
})
export class CommonModule {}