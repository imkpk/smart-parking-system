import { BadRequestException } from '@nestjs/common';
import { OutboxEventType } from '@prisma/client';
import { EventPublisherService } from './event-publisher.service';

describe('EventPublisherService', () => {
  let service: EventPublisherService;
  let prisma: {
    outboxEvent: { create: jest.Mock };
  };
  let tx: {
    outboxEvent: { create: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      outboxEvent: {
        create: jest.fn().mockResolvedValue({
          id: 1,
          eventId: 'evt-1',
          eventType: OutboxEventType.GENERIC,
          status: 'PENDING',
        }),
      },
    };
    tx = {
      outboxEvent: {
        create: jest.fn().mockResolvedValue({
          id: 2,
          eventId: 'evt-2',
          eventType: OutboxEventType.BOOKING_CREATED,
          status: 'PENDING',
        }),
      },
    };
    service = new EventPublisherService(prisma as never);
  });

  it('creates a pending outbox event', async () => {
    await expect(
      service.publishEvent({
        eventType: OutboxEventType.GENERIC,
        organizationId: 7,
        aggregateType: 'booking',
        aggregateId: '42',
        payload: { bookingId: 42 },
      }),
    ).resolves.toEqual({
      id: 1,
      eventId: 'evt-1',
      eventType: OutboxEventType.GENERIC,
      status: 'PENDING',
    });

    expect(prisma.outboxEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: OutboxEventType.GENERIC,
        organizationId: 7,
        aggregateType: 'booking',
        aggregateId: '42',
        payload: { bookingId: 42 },
      },
      select: {
        id: true,
        eventId: true,
        eventType: true,
        status: true,
      },
    });
  });

  it('publishes inside a transaction client', async () => {
    await expect(
      service.publishEventInTransaction(tx as never, {
        eventType: OutboxEventType.BOOKING_CREATED,
        payload: { id: 1 },
      }),
    ).resolves.toEqual({
      id: 2,
      eventId: 'evt-2',
      eventType: OutboxEventType.BOOKING_CREATED,
      status: 'PENDING',
    });

    expect(tx.outboxEvent.create).toHaveBeenCalled();
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
  });

  it('rejects undefined payload', async () => {
    await expect(
      service.publishEvent({
        eventType: OutboxEventType.GENERIC,
        payload: undefined as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});