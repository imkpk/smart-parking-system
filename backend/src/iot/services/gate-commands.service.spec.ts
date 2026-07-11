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

  it('rate limits manual overrides', async () => {
    (prisma.gateAccessAttempt.count as jest.Mock).mockResolvedValue(10);

    await expect(
      service.manualOpenGate({
        organizationId: 1,
        gateId: 2,
        actorUserId: 9,
      }),
    ).rejects.toMatchObject({
      status: 429,
    });
  });

  it('marks published commands from acks', async () => {
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
      externalDeviceId: 'barrier-1',
      ack: {
        commandId: 'cmd-1',
        status: 'EXECUTED',
      },
    });

    expect(eventPublisher.publishEventInTransaction).toHaveBeenCalled();
  });
});