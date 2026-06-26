import { OutboxEventStatus, OutboxEventType } from '@prisma/client';
import { OutboxMonitorService } from './outbox-monitor.service';

describe('OutboxMonitorService', () => {
  const createPrisma = () => ({
    outboxEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  });

  it('lists safe fields newest first with default limit', async () => {
    const prisma = createPrisma();
    const service = new OutboxMonitorService(prisma as never);

    await service.list({});

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith({
      where: {},
      select: expect.objectContaining({
        id: true,
        eventId: true,
        eventType: true,
        organizationId: true,
        aggregateType: true,
        aggregateId: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        nextRunAt: true,
        lockedAt: true,
        lockedBy: true,
        processedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      }),
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const select = prisma.outboxEvent.findMany.mock.calls[0][0].select;
    expect(select.payload).toBeUndefined();
  });

  it('filters by status', async () => {
    const prisma = createPrisma();
    const service = new OutboxMonitorService(prisma as never);

    await service.list({ status: OutboxEventStatus.FAILED });

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: OutboxEventStatus.FAILED },
      }),
    );
  });

  it('filters by eventType', async () => {
    const prisma = createPrisma();
    const service = new OutboxMonitorService(prisma as never);

    await service.list({ eventType: OutboxEventType.PARKING_CHECKED_OUT });

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventType: OutboxEventType.PARKING_CHECKED_OUT },
      }),
    );
  });

  it('filters by organizationId', async () => {
    const prisma = createPrisma();
    const service = new OutboxMonitorService(prisma as never);

    await service.list({ organizationId: 42 });

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 42 },
      }),
    );
  });

  it('caps list limit at 100', async () => {
    const prisma = createPrisma();
    const service = new OutboxMonitorService(prisma as never);

    await service.list({ limit: 500 });

    expect(prisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('returns counts by status', async () => {
    const prisma = createPrisma();
    prisma.outboxEvent.groupBy.mockResolvedValue([
      { status: OutboxEventStatus.PENDING, _count: { _all: 2 } },
      { status: OutboxEventStatus.PROCESSING, _count: { _all: 1 } },
      { status: OutboxEventStatus.PROCESSED, _count: { _all: 3 } },
      { status: OutboxEventStatus.FAILED, _count: { _all: 4 } },
    ]);
    const service = new OutboxMonitorService(prisma as never);

    await expect(service.getSummary()).resolves.toEqual({
      pending: 2,
      processing: 1,
      processed: 3,
      failed: 4,
    });
  });

  it('uses read-only outbox operations', async () => {
    const prisma = createPrisma();
    const service = new OutboxMonitorService(prisma as never);

    await service.list({});
    await service.getSummary();

    expect(prisma.outboxEvent.findMany).toHaveBeenCalled();
    expect(prisma.outboxEvent.groupBy).toHaveBeenCalled();
    expect(prisma.outboxEvent.create).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.update).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.updateMany).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.delete).not.toHaveBeenCalled();
    expect(prisma.outboxEvent.deleteMany).not.toHaveBeenCalled();
  });
});
