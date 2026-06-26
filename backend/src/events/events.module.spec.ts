import { MODULE_METADATA } from '@nestjs/common/constants';
import { EventHandlerRegistry } from './event-handler.registry';
import { EventPublisherService } from './event-publisher.service';
import { EventsModule } from './events.module';
import { OutboxMonitorController } from './outbox-monitor.controller';
import { OutboxMonitorService } from './outbox-monitor.service';
import { OutboxWorkerService } from './outbox-worker.service';

describe('EventsModule', () => {
  it('registers publisher, worker, and protected monitor providers', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, EventsModule) ?? [];
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, EventsModule) ?? [];

    expect(controllers).toEqual([OutboxMonitorController]);
    expect(providers).toEqual(
      expect.arrayContaining([
        EventPublisherService,
        OutboxWorkerService,
        EventHandlerRegistry,
        OutboxMonitorService,
      ]),
    );
  });
});
