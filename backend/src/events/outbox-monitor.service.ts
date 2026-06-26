import { Injectable } from '@nestjs/common';
import { OutboxEventStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxMonitorQueryDto } from './dto/outbox-monitor-query.dto';

const DEFAULT_OUTBOX_MONITOR_LIMIT = 50;
const MAX_OUTBOX_MONITOR_LIMIT = 100;

const OUTBOX_MONITOR_SAFE_SELECT = {
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
} satisfies Prisma.OutboxEventSelect;

export type OutboxMonitorEvent = Prisma.OutboxEventGetPayload<{
  select: typeof OUTBOX_MONITOR_SAFE_SELECT;
}>;

export type OutboxStatusSummary = Record<
  Lowercase<keyof typeof OutboxEventStatus>,
  number
>;

@Injectable()
export class OutboxMonitorService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: OutboxMonitorQueryDto): Promise<OutboxMonitorEvent[]> {
    return this.prisma.outboxEvent.findMany({
      where: this.buildWhere(query),
      select: OUTBOX_MONITOR_SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: this.resolveLimit(query.limit),
    });
  }

  async getSummary(): Promise<OutboxStatusSummary> {
    const grouped = await this.prisma.outboxEvent.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const summary = {
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
    };

    for (const item of grouped) {
      summary[item.status.toLowerCase() as keyof typeof summary] = item._count._all;
    }

    return summary;
  }

  private buildWhere(query: OutboxMonitorQueryDto): Prisma.OutboxEventWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    };
  }

  private resolveLimit(limit?: number): number {
    if (!limit) {
      return DEFAULT_OUTBOX_MONITOR_LIMIT;
    }

    return Math.min(limit, MAX_OUTBOX_MONITOR_LIMIT);
  }
}
