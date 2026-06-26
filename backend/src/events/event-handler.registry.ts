import { Injectable, Logger } from '@nestjs/common';
import { OutboxEventType } from '@prisma/client';
import { OutboxEventHandler } from './event-types';

@Injectable()
export class EventHandlerRegistry {
  private readonly logger = new Logger(EventHandlerRegistry.name);
  private readonly handlers = new Map<OutboxEventType, OutboxEventHandler>();

  constructor() {
    const noopHandler: OutboxEventHandler = async (event) => {
      this.logger.debug(`Handled outbox event ${event.eventType} (${event.eventId})`);
    };

    for (const eventType of Object.values(OutboxEventType)) {
      this.handlers.set(eventType, noopHandler);
    }
  }

  register(eventType: OutboxEventType, handler: OutboxEventHandler): void {
    this.handlers.set(eventType, handler);
  }

  async handle(event: Parameters<OutboxEventHandler>[0]): Promise<void> {
    const handler = this.handlers.get(event.eventType);

    if (!handler) {
      this.logger.warn(`No handler registered for outbox event type ${event.eventType}`);
      return;
    }

    await handler(event);
  }
}