import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { OutboxEvent, OutboxEventStatus } from '@prisma/client';
import { EventHandlerRegistry } from './event-handler.registry';
import { computeNextRunAt, resolveOutboxWorkerConfig } from './outbox-worker.config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private readonly config = resolveOutboxWorkerConfig();
  private intervalHandle: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly handlerRegistry: EventHandlerRegistry,
  ) {}

  onModuleInit(): void {
    if (!this.config.enabled) {
      this.logger.log('Outbox worker disabled by OUTBOX_WORKER_ENABLED');
      return;
    }

    this.intervalHandle = setInterval(() => {
      void this.tick();
    }, this.config.intervalMs);

    this.logger.log(
      `Outbox worker started (interval=${this.config.intervalMs}ms, batch=${this.config.batchSize})`,
    );
  }

  onModuleDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  async tick(): Promise<void> {
    if (!this.config.enabled || this.processing) {
      return;
    }

    this.processing = true;

    try {
      const events = await this.claimPendingEvents();

      for (const event of events) {
        await this.processClaimedEvent(event);
      }
    } catch (error) {
      this.logger.error('Outbox worker tick failed', error instanceof Error ? error.stack : undefined);
    } finally {
      this.processing = false;
    }
  }

  async claimPendingEvents(now = new Date()): Promise<OutboxEvent[]> {
    const pending = await this.prisma.outboxEvent.findMany({
      where: {
        status: OutboxEventStatus.PENDING,
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: 'asc' },
      take: this.config.batchSize,
    });

    const claimed: OutboxEvent[] = [];

    for (const event of pending) {
      const updated = await this.prisma.outboxEvent.updateMany({
        where: {
          id: event.id,
          status: OutboxEventStatus.PENDING,
        },
        data: {
          status: OutboxEventStatus.PROCESSING,
          lockedAt: now,
          lockedBy: this.config.workerId,
        },
      });

      if (updated.count === 1) {
        claimed.push({
          ...event,
          status: OutboxEventStatus.PROCESSING,
          lockedAt: now,
          lockedBy: this.config.workerId,
        });
      }
    }

    return claimed;
  }

  async processClaimedEvent(event: OutboxEvent): Promise<void> {
    const now = new Date();

    try {
      await this.handlerRegistry.handle({
        eventId: event.eventId,
        eventType: event.eventType,
        organizationId: event.organizationId,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload,
      });

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxEventStatus.PROCESSED,
          processedAt: now,
          lockedAt: null,
          lockedBy: null,
          lastError: null,
        },
      });
    } catch (error) {
      const attempts = event.attempts + 1;
      const message = error instanceof Error ? error.message : 'Unknown outbox handler error';
      const failedPermanently = attempts >= event.maxAttempts;

      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: failedPermanently ? OutboxEventStatus.FAILED : OutboxEventStatus.PENDING,
          attempts,
          lastError: message.slice(0, 2_000),
          nextRunAt: failedPermanently ? event.nextRunAt : computeNextRunAt(attempts, now),
          lockedAt: null,
          lockedBy: null,
        },
      });
    }
  }
}