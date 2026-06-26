import { Module } from '@nestjs/common';
import { EventHandlerRegistry } from './event-handler.registry';
import { EventPublisherService } from './event-publisher.service';
import { OutboxWorkerService } from './outbox-worker.service';

@Module({
  providers: [EventPublisherService, EventHandlerRegistry, OutboxWorkerService],
  exports: [EventPublisherService, EventHandlerRegistry],
})
export class EventsModule {}