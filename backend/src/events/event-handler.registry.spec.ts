import { OutboxEventType } from '@prisma/client';
import { EventHandlerRegistry } from './event-handler.registry';

describe('EventHandlerRegistry', () => {
  it('invokes a registered handler for the event type', async () => {
    const registry = new EventHandlerRegistry();
    const handler = jest.fn().mockResolvedValue(undefined);

    registry.register(OutboxEventType.PAYMENT_VERIFIED, handler);

    await registry.handle({
      eventId: 'evt-1',
      eventType: OutboxEventType.PAYMENT_VERIFIED,
      organizationId: 1,
      aggregateType: 'payment',
      aggregateId: '9',
      payload: { paymentId: 9 },
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('uses noop handlers for known event types by default', async () => {
    const registry = new EventHandlerRegistry();

    await expect(
      registry.handle({
        eventId: 'evt-2',
        eventType: OutboxEventType.GENERIC,
        organizationId: null,
        aggregateType: null,
        aggregateId: null,
        payload: {},
      }),
    ).resolves.toBeUndefined();
  });
});