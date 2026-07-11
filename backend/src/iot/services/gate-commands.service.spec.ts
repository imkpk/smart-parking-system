import { BadRequestException } from '@nestjs/common';
import { GateAccessSource, GateCommandStatus } from '@prisma/client';
import { EventPublisherService } from '../../events/event-publisher.service';
import { GateAccessReasonCode } from '../gate-access-reason-codes';
import { GateAccessDecisionService } from './gate-access-decision.service';
import { GateCommandsService } from './gate-commands.service';

describe('GateCommandsService', () => {
  const prisma = {
    iotDevice: { findFirst: jest.fn() },
    gate: { findFirst: jest.fn() },
    gateAccessAttempt: {
      create: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    gateCommand: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const eventPublisher = {
    publishEventInTransaction: jest.fn(),
  } as unknown as EventPublisherService;

  const gateAccessDecisionService = {
    evaluateManualOverride: jest.fn(),
  } as unknown as GateAccessDecisionService;

  const service = new GateCommandsService(
    prisma as never,
    eventPublisher,
    gateAccessDecisionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a pending open command and outbox event', async () => {
    const controller = {
      id: 7,
      externalDeviceId: 'barrier-1',
      organizationId: 1,
      gateId: 2,
      deviceType: 'BARRIER_CONTROLLER',
      isEnabled: true,
    };
    const gate = {
      id: 2,
      organizationId: 1,
      commandTtlSeconds: 15,
    };

    (prisma.iotDevice.findFirst as jest.Mock).mockResolvedValue(controller);
    (prisma.gate.findFirst as jest.Mock).mockResolvedValue(gate);
    (prisma.gateCommand.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        gateAccessAttempt: {
          create: jest.fn().mockResolvedValue({ id: 10 }),
          update: jest.fn(),
        },
        gateCommand: {
          create: jest.fn().mockResolvedValue({
            id: 1,
            commandId: 'cmd-1',
            gateId: 2,
            organizationId: 1,
          }),
        },
      }),
    );

    await service.createOpenCommand({
      organizationId: 1,
      gateId: 2,
      source: GateAccessSource.ANPR,
      reasonCode: GateAccessReasonCode.ENTRY_BOOKING_CONFIRMED,
      vehicleId: 5,
      bookingId: 100,
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(eventPublisher.publishEventInTransaction).toHaveBeenCalled();
  });

  it('blocks a new command when a non-expired command is already pending', async () => {
    const controller = {
      id: 7,
      externalDeviceId: 'barrier-1',
      organizationId: 1,
      gateId: 2,
      deviceType: 'BARRIER_CONTROLLER',
      isEnabled: true,
    };
    const gate = {
      id: 2,
      organizationId: 1,
      commandTtlSeconds: 15,
    };

    (prisma.iotDevice.findFirst as jest.Mock).mockResolvedValue(controller);
    (prisma.gate.findFirst as jest.Mock).mockResolvedValue(gate);
    (prisma.gateCommand.findFirst as jest.Mock).mockResolvedValue({
      commandId: 'cmd-existing',
      status: GateCommandStatus.PUBLISHED,
      expiresAt: new Date(Date.now() + 10_000),
    });
    (prisma.gateAccessAttempt.create as jest.Mock).mockResolvedValue({ id: 99 });

    await service.createOpenCommand({
      organizationId: 1,
      gateId: 2,
      source: GateAccessSource.ANPR,
      reasonCode: GateAccessReasonCode.ENTRY_BOOKING_CONFIRMED,
    });

    expect(prisma.gateAccessAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reasonCode: GateAccessReasonCode.COMMAND_ALREADY_PENDING,
        }),
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rate limits manual overrides', async () => {
    (prisma.gateAccessAttempt.count as jest.Mock).mockResolvedValue(10);

    await expect(
      service.manualOpenGate({
        organizationId: 1,
        gateId: 2,
        actorUserId: 9,
        reason: 'Security override for stuck vehicle',
      }),
    ).rejects.toMatchObject({
      status: 429,
    });
  });

  it('marks published commands from acks using tenant-scoped device lookup', async () => {
    const device = { id: 7, organizationId: 1, externalDeviceId: 'barrier-1' };
    const command = {
      id: 1,
      commandId: 'cmd-1',
      organizationId: 1,
      gateId: 2,
      status: GateCommandStatus.PUBLISHED,
      acknowledgedAt: null,
      failureCode: null,
      failureMessage: null,
    };

    (prisma.iotDevice.findFirst as jest.Mock).mockResolvedValue(device);
    (prisma.gateCommand.findFirst as jest.Mock).mockResolvedValue(command);
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) =>
      callback({
        gateCommand: {
          update: jest.fn().mockResolvedValue({
            ...command,
            status: GateCommandStatus.EXECUTED,
          }),
        },
      }),
    );

    await service.handleAck({
      organizationId: 1,
      externalDeviceId: 'barrier-1',
      ack: {
        commandId: 'cmd-1',
        status: 'EXECUTED',
      },
    });

    expect(prisma.iotDevice.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 1,
        externalDeviceId: 'barrier-1',
      },
    });
    expect(eventPublisher.publishEventInTransaction).toHaveBeenCalled();
  });

  it('marks commands published only after publishable validation', async () => {
    const command = {
      id: 1,
      commandId: 'cmd-1',
      status: GateCommandStatus.PENDING,
      expiresAt: new Date(Date.now() + 10_000),
      controllerDevice: { externalDeviceId: 'barrier-1' },
    };

    (prisma.gateCommand.findFirst as jest.Mock).mockResolvedValue(command);
    (prisma.gateCommand.update as jest.Mock).mockResolvedValue({
      ...command,
      status: GateCommandStatus.PUBLISHED,
    });

    await service.markCommandPublished('cmd-1');

    expect(prisma.gateCommand.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        status: GateCommandStatus.PUBLISHED,
        publishedAt: expect.any(Date),
      },
      include: {
        controllerDevice: true,
      },
    });
  });

  it('expires publishable commands that are past TTL', async () => {
    const command = {
      id: 1,
      commandId: 'cmd-expired',
      status: GateCommandStatus.PENDING,
      expiresAt: new Date(Date.now() - 1_000),
      controllerDevice: { externalDeviceId: 'barrier-1' },
    };

    (prisma.gateCommand.findFirst as jest.Mock).mockResolvedValue(command);
    (prisma.gateCommand.update as jest.Mock).mockResolvedValue({
      ...command,
      status: GateCommandStatus.EXPIRED,
    });

    await expect(service.getPublishableCommand('cmd-expired')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.gateCommand.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: GateCommandStatus.EXPIRED },
    });
  });
});