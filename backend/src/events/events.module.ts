import { Module } from '@nestjs/common';
import { EventHandlerRegistry } from './event-handler.registry';
import { EventPublisherService } from './event-publisher.service';
import { OutboxMonitorController } from './outbox-monitor.controller';
import { OutboxMonitorService } from './outbox-monitor.service';
import { OutboxWorkerService } from './outbox-worker.service';

@Module({
  controllers: [OutboxMonitorController],
  providers: [
    EventPublisherService,
    EventHandlerRegistry,
    OutboxWorkerService,
    OutboxMonitorService,
  ],
  exports: [EventPublisherService, EventHandlerRegistry],
})
export class EventsModule {}
