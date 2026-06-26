import { OutboxEventType, Prisma } from '@prisma/client';

export type PublishEventInput = {
  eventType: OutboxEventType;
  organizationId?: number | null;
  aggregateType?: string | null;
  aggregateId?: string | null;
  payload: Prisma.InputJsonValue;
};

export type PublishedOutboxEventSummary = {
  id: number;
  eventId: string;
  eventType: OutboxEventType;
  status: 'PENDING';
};

export type OutboxWorkerConfig = {
  enabled: boolean;
  intervalMs: number;
  batchSize: number;
  workerId: string;
};

export type OutboxEventHandler = (event: {
  eventId: string;
  eventType: OutboxEventType;
  organizationId: number | null;
  aggregateType: string | null;
  aggregateId: string | null;
  payload: Prisma.JsonValue;
}) => Promise<void>;