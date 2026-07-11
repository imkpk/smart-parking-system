import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GateAccessDecision,
  GateAccessSource,
  GateCommandStatus,
  IotDeviceType,
  OutboxEventType,
  Prisma,
} from '@prisma/client';
import { EventPublisherService } from '../../events/event-publisher.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GateAccessReasonCode } from '../gate-access-reason-codes';
import { resolveIotConfig } from '../iot.config';
import { MqttCommandAckMessage } from '../mqtt/mqtt.types';
import { GateAccessDecisionService } from './gate-access-decision.service';

@Injectable()
export class GateCommandsService {
  private readonly config = resolveIotConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly gateAccessDecisionService: GateAccessDecisionService,
  ) {}

  async createOpenCommand(input: {
    organizationId: number;
    gateId: number;
    source: GateAccessSource;
    detectionId?: number;
    vehicleId?: number;
    bookingId?: number;
    parkingEventId?: number;
    actorUserId?: number;
    reasonCode: string;
    reasonDetail?: string;
  }) {
    const controller = await this.prisma.iotDevice.findFirst({
      where: {
        organizationId: input.organizationId,
        gateId: input.gateId,
        deviceType: IotDeviceType.BARRIER_CONTROLLER,
        isEnabled: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    if (!controller) {
      return this.prisma.gateAccessAttempt.create({
        data: {
          organizationId: input.organizationId,
          gateId: input.gateId,
          detectionId: input.detectionId,
          source: input.source,
          decision: GateAccessDecision.ERROR,
          reasonCode: GateAccessReasonCode.NO_BARRIER_CONTROLLER,
          reasonDetail: 'No enabled barrier controller found for gate',
          vehicleId: input.vehicleId,
          bookingId: input.bookingId,
          parkingEventId: input.parkingEventId,
          actorUserId: input.actorUserId,
        },
      });
    }

    const gate = await this.prisma.gate.findFirst({
      where: {
        id: input.gateId,
        organizationId: input.organizationId,
      },
    });

    if (!gate) {
      throw new NotFoundException('Gate not found');
    }

    const pendingCommand = await this.prisma.gateCommand.findFirst({
      where: {
        organizationId: input.organizationId,
        gateId: input.gateId,
        status: {
          in: [
            GateCommandStatus.PENDING,
            GateCommandStatus.PUBLISHED,
            GateCommandStatus.ACKNOWLEDGED,
          ],
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    if (pendingCommand) {
      return this.prisma.gateAccessAttempt.create({
        data: {
          organizationId: input.organizationId,
          gateId: input.gateId,
          detectionId: input.detectionId,
          source: input.source,
          decision: GateAccessDecision.DENIED,
          reasonCode: GateAccessReasonCode.COMMAND_ALREADY_PENDING,
          reasonDetail: `Gate command ${pendingCommand.commandId} is already pending`,
          vehicleId: input.vehicleId,
          bookingId: input.bookingId,
          parkingEventId: input.parkingEventId,
          actorUserId: input.actorUserId,
        },
      });
    }

    const expiresAt = new Date(Date.now() + gate.commandTtlSeconds * 1000);

    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.gateAccessAttempt.create({
        data: {
          organizationId: input.organizationId,
          gateId: input.gateId,
          detectionId: input.detectionId,
          source: input.source,
          decision: GateAccessDecision.GRANTED,
          reasonCode: input.reasonCode,
          reasonDetail: input.reasonDetail,
          vehicleId: input.vehicleId,
          bookingId: input.bookingId,
          parkingEventId: input.parkingEventId,
          actorUserId: input.actorUserId,
        },
      });

      const command = await tx.gateCommand.create({
        data: {
          organizationId: input.organizationId,
          gateId: input.gateId,
          controllerDeviceId: controller.id,
          accessAttemptId: attempt.id,
          expiresAt,
        },
      });

      await tx.gateAccessAttempt.update({
        where: { id: attempt.id },
        data: {
          commandId: command.commandId,
        },
      });

      await this.eventPublisher.publishEventInTransaction(tx, {
        eventType: OutboxEventType.GATE_OPEN_REQUESTED,
        organizationId: input.organizationId,
        aggregateType: 'GateCommand',
        aggregateId: command.commandId,
        payload: {
          organizationId: input.organizationId,
          gateId: input.gateId,
          commandId: command.commandId,
          controllerDeviceId: controller.id,
          externalDeviceId: controller.externalDeviceId,
          action: 'OPEN',
          expiresAt: expiresAt.toISOString(),
        },
      });

      return {
        attempt,
        command,
      };
    });
  }

  async manualOpenGate(input: {
    organizationId: number;
    gateId: number;
    actorUserId: number;
    reason: string;
  }) {
    await this.assertManualOverrideRateLimit(input.gateId, input.actorUserId);

    const gate = await this.prisma.gate.findFirst({
      where: {
        id: input.gateId,
        organizationId: input.organizationId,
      },
    });

    if (!gate) {
      throw new NotFoundException('Gate not found');
    }

    if (!gate.isActive) {
      throw new BadRequestException('Gate is inactive');
    }

    const decision = this.gateAccessDecisionService.evaluateManualOverride();

    return this.createOpenCommand({
      organizationId: input.organizationId,
      gateId: input.gateId,
      source: GateAccessSource.MANUAL_OVERRIDE,
      actorUserId: input.actorUserId,
      reasonCode: decision.reasonCode,
      reasonDetail: input.reason,
    });
  }

  async handleAck(input: {
    organizationId: number;
    externalDeviceId: string;
    ack: MqttCommandAckMessage;
  }) {
    const device = await this.prisma.iotDevice.findFirst({
      where: {
        organizationId: input.organizationId,
        externalDeviceId: input.externalDeviceId,
      },
    });

    if (!device) {
      return null;
    }

    const command = await this.prisma.gateCommand.findFirst({
      where: {
        commandId: input.ack.commandId,
        organizationId: device.organizationId,
        controllerDeviceId: device.id,
      },
    });

    if (!command) {
      return null;
    }

    if (
      command.status === GateCommandStatus.EXECUTED ||
      command.status === GateCommandStatus.FAILED ||
      command.status === GateCommandStatus.EXPIRED
    ) {
      return command;
    }

    const now = new Date();
    const updateData: Prisma.GateCommandUpdateInput = {};

    if (input.ack.status === 'ACKNOWLEDGED' || input.ack.status === 'RECEIVED') {
      updateData.status = GateCommandStatus.ACKNOWLEDGED;
      updateData.acknowledgedAt = now;
    } else if (input.ack.status === 'EXECUTED') {
      updateData.status = GateCommandStatus.EXECUTED;
      updateData.executedAt = now;
      if (!command.acknowledgedAt) {
        updateData.acknowledgedAt = now;
      }
    } else {
      updateData.status = GateCommandStatus.FAILED;
      updateData.failureCode = input.ack.failureCode;
      updateData.failureMessage = input.ack.failureMessage;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.gateCommand.update({
        where: { id: command.id },
        data: updateData,
      });

      const eventType =
        updated.status === GateCommandStatus.EXECUTED
          ? OutboxEventType.GATE_COMMAND_EXECUTED
          : updated.status === GateCommandStatus.FAILED
            ? OutboxEventType.GATE_COMMAND_FAILED
            : OutboxEventType.GATE_COMMAND_PUBLISHED;

      await this.eventPublisher.publishEventInTransaction(tx, {
        eventType,
        organizationId: updated.organizationId,
        aggregateType: 'GateCommand',
        aggregateId: updated.commandId,
        payload: {
          organizationId: updated.organizationId,
          gateId: updated.gateId,
          commandId: updated.commandId,
          status: updated.status,
          failureCode: updated.failureCode,
          failureMessage: updated.failureMessage,
        },
      });

      return updated;
    });
  }

  async getPublishableCommand(commandId: string) {
    const command = await this.prisma.gateCommand.findFirst({
      where: {
        commandId,
        status: GateCommandStatus.PENDING,
      },
      include: {
        controllerDevice: true,
      },
    });

    if (!command) {
      throw new NotFoundException('Pending gate command not found');
    }

    if (command.expiresAt <= new Date()) {
      await this.prisma.gateCommand.update({
        where: { id: command.id },
        data: {
          status: GateCommandStatus.EXPIRED,
        },
      });
      throw new BadRequestException('Gate command has expired');
    }

    return command;
  }

  async markCommandPublished(commandId: string) {
    const command = await this.prisma.gateCommand.findFirst({
      where: {
        commandId,
        status: GateCommandStatus.PENDING,
      },
    });

    if (!command) {
      throw new NotFoundException('Pending gate command not found');
    }

    if (command.expiresAt <= new Date()) {
      await this.prisma.gateCommand.update({
        where: { id: command.id },
        data: {
          status: GateCommandStatus.EXPIRED,
        },
      });
      throw new BadRequestException('Gate command has expired');
    }

    return this.prisma.gateCommand.update({
      where: { id: command.id },
      data: {
        status: GateCommandStatus.PUBLISHED,
        publishedAt: new Date(),
      },
      include: {
        controllerDevice: true,
      },
    });
  }

  async publishPendingCommand(commandId: string) {
    await this.getPublishableCommand(commandId);
    return this.markCommandPublished(commandId);
  }

  private async assertManualOverrideRateLimit(gateId: number, actorUserId: number) {
    const windowStart = new Date(Date.now() - 60_000);
    const recentCount = await this.prisma.gateAccessAttempt.count({
      where: {
        gateId,
        actorUserId,
        source: GateAccessSource.MANUAL_OVERRIDE,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    if (recentCount >= this.config.manualOverrideRateLimitPerMinute) {
      throw new HttpException(
        GateAccessReasonCode.MANUAL_OVERRIDE_RATE_LIMITED,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}