import { Module, forwardRef } from '@nestjs/common';
import { IotModule } from '../iot/iot.module';
import { EventHandlerRegistry } from './event-handler.registry';
import { EventPublisherService } from './event-publisher.service';
import { GateOpenRequestedHandler } from './gate-open-requested.handler';
import { OutboxMonitorController } from './outbox-monitor.controller';
import { OutboxMonitorService } from './outbox-monitor.service';
import { OutboxWorkerService } from './outbox-worker.service';

@Module({
  imports: [forwardRef(() => IotModule)],
  controllers: [OutboxMonitorController],
  providers: [
    EventPublisherService,
    EventHandlerRegistry,
    OutboxWorkerService,
    OutboxMonitorService,
    GateOpenRequestedHandler,
  ],
  exports: [EventPublisherService, EventHandlerRegistry],
})
export class EventsModule {}
