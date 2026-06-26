import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PublishEventInput, PublishedOutboxEventSummary } from './event-types';

type PrismaTransactionClient = Prisma.TransactionClient;

@Injectable()
export class EventPublisherService {
  constructor(private readonly prisma: PrismaService) {}

  async publishEvent(input: PublishEventInput): Promise<PublishedOutboxEventSummary> {
    const created = await this.prisma.outboxEvent.create({
      data: this.buildCreateData(input),
      select: {
        id: true,
        eventId: true,
        eventType: true,
        status: true,
      },
    });

    return this.toSummary(created);
  }

  async publishEventInTransaction(
    tx: PrismaTransactionClient,
    input: PublishEventInput,
  ): Promise<PublishedOutboxEventSummary> {
    const created = await tx.outboxEvent.create({
      data: this.buildCreateData(input),
      select: {
        id: true,
        eventId: true,
        eventType: true,
        status: true,
      },
    });

    return this.toSummary(created);
  }

  private buildCreateData(input: PublishEventInput): Prisma.OutboxEventCreateInput {
    this.assertValidPayload(input.payload);

    return {
      eventType: input.eventType,
      organizationId: input.organizationId ?? undefined,
      aggregateType: input.aggregateType ?? undefined,
      aggregateId: input.aggregateId ?? undefined,
      payload: input.payload,
    };
  }

  private assertValidPayload(payload: Prisma.InputJsonValue | undefined): void {
    if (payload === undefined) {
      throw new BadRequestException('Outbox event payload is required.');
    }

    if (!this.isSerializableJson(payload)) {
      throw new BadRequestException('Outbox event payload must be serializable JSON.');
    }
  }

  private isSerializableJson(value: Prisma.InputJsonValue): boolean {
    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  }

  private toSummary(created: {
    id: number;
    eventId: string;
    eventType: PublishedOutboxEventSummary['eventType'];
    status: PublishedOutboxEventSummary['status'] | 'PROCESSING' | 'PROCESSED' | 'FAILED';
  }): PublishedOutboxEventSummary {
    return {
      id: created.id,
      eventId: created.eventId,
      eventType: created.eventType,
      status: 'PENDING',
    };
  }
}