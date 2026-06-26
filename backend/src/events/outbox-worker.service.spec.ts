import { OutboxEventStatus, OutboxEventType } from '@prisma/client';
import { EventHandlerRegistry } from './event-handler.registry';
import { OutboxWorkerService } from './outbox-worker.service';

function buildEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1,
    eventId: 'evt-1',
    organizationId: 1,
    eventType: OutboxEventType.GENERIC,
    aggregateType: null,
    aggregateId: null,
    payload: { ok: true },
    status: OutboxEventStatus.PENDING,
    attempts: 0,
    maxAttempts: 5,
    nextRunAt: new Date('2026-06-26T12:00:00.000Z'),
    lockedAt: null,
    lockedBy: null,
    processedAt: null,
    lastError: null,
    createdAt: new Date('2026-06-26T12:00:00.000Z'),
    updatedAt: new Date('2026-06-26T12:00:00.000Z'),
    ...overrides,
  };
}

describe('OutboxWorkerService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      OUTBOX_WORKER_ENABLED: 'true',
      OUTBOX_WORKER_INTERVAL_MS: '5000',
      OUTBOX_WORKER_BATCH_SIZE: '10',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('marks claimed events as processed on handler success', async () => {
    const event = buildEvent();
    const prisma = {
      outboxEvent: {
        findMany: jest.fn().mockResolvedValue([event]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const registry = new EventHandlerRegistry();
    const worker = new OutboxWorkerService(prisma as never, registry);

    await worker.processClaimedEvent({
      ...event,
      status: OutboxEventStatus.PROCESSING,
    });

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: OutboxEventStatus.PROCESSED,
        lastError: null,
      }),
    });
  });

  it('increments attempts and schedules retry on handler failure', async () => {
    const event = buildEvent({ attempts: 1, maxAttempts: 5 });
    const prisma = {
      outboxEvent: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const registry = new EventHandlerRegistry();
    registry.register(OutboxEventType.GENERIC, async () => {
      throw new Error('handler failed');
    });
    const worker = new OutboxWorkerService(prisma as never, registry);

    await worker.processClaimedEvent({
      ...event,
      status: OutboxEventStatus.PROCESSING,
    });

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: OutboxEventStatus.PENDING,
        attempts: 2,
        lastError: 'handler failed',
      }),
    });
  });

  it('marks event failed after max attempts', async () => {
    const event = buildEvent({ attempts: 4, maxAttempts: 5 });
    const prisma = {
      outboxEvent: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const registry = new EventHandlerRegistry();
    registry.register(OutboxEventType.GENERIC, async () => {
      throw new Error('still failing');
    });
    const worker = new OutboxWorkerService(prisma as never, registry);

    await worker.processClaimedEvent({
      ...event,
      status: OutboxEventStatus.PROCESSING,
    });

    expect(prisma.outboxEvent.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        status: OutboxEventStatus.FAILED,
        attempts: 5,
      }),
    });
  });

  it('does not process events when worker is disabled', async () => {
    process.env.OUTBOX_WORKER_ENABLED = 'false';

    const prisma = {
      outboxEvent: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
    };
    const registry = new EventHandlerRegistry();
    const worker = new OutboxWorkerService(prisma as never, registry);

    worker.onModuleInit();
    await worker.tick();

    expect(prisma.outboxEvent.findMany).not.toHaveBeenCalled();
  });
});