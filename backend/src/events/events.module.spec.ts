import { MODULE_METADATA } from '@nestjs/common/constants';
import { EventHandlerRegistry } from './event-handler.registry';
import { EventPublisherService } from './event-publisher.service';
import { EventsModule } from './events.module';
import { OutboxWorkerService } from './outbox-worker.service';

describe('EventsModule', () => {
  it('registers publisher and worker providers without public controllers', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, EventsModule) ?? [];
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, EventsModule) ?? [];

    expect(controllers).toEqual([]);
    expect(providers).toEqual(
      expect.arrayContaining([
        EventPublisherService,
        OutboxWorkerService,
        EventHandlerRegistry,
      ]),
    );
  });
});