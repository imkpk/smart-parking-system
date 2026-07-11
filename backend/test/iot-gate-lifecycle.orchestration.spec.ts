/// <reference types="jest" />

import {
  GateAccessDecision,
  GateAccessSource,
  GateCommandStatus,
  GateDirection,
  IotDeviceType,
  OutboxEventType,
} from '@prisma/client';
import { EventPublisherService } from '../src/events/event-publisher.service';
import { GateAccessReasonCode } from '../src/iot/gate-access-reason-codes';
import { GateAccessDecisionService } from '../src/iot/services/gate-access-decision.service';
import { GateCommandsService } from '../src/iot/services/gate-commands.service';
import { GateDetectionProcessorService } from '../src/iot/services/gate-detection-processor.service';
import { IotDevicesService } from '../src/iot/services/iot-devices.service';
import { IotParkingOrchestrationService } from '../src/iot/services/iot-parking-orchestration.service';

describe('IoT gate lifecycle orchestration (mocked services)', () => {
  const gate = {
    id: 2,
    organizationId: 1,
    parkingLotId: 10,
    duplicateWindowSeconds: 30,
    anprConfidenceThreshold: 0.85,
    isActive: true,
    autoOpenEnabled: true,
    direction: GateDirection.ENTRY,
    commandTtlSeconds: 15,
  };

  const device = {
    id: 1,
    organizationId: 1,
    gateId: gate.id,
    externalDeviceId: 'cam-entry-1',
    isEnabled: true,
    status: 'ONLINE',
    gate,
  };

  const controller = {
    id: 7,
    organizationId: 1,
    gateId: gate.id,
    externalDeviceId: 'edge-gw-demo-001',
    deviceType: IotDeviceType.EDGE_GATEWAY,
    isEnabled: true,
  };

  const vehicle = {
    id: 5,
    organizationId: 1,
    vehicleNumber: 'KA05GH1212',
  };

  const booking = {
    id: 100,
    organizationId: 1,
    vehicleId: vehicle.id,
    status: 'CONFIRMED',
    startTime: new Date('2026-07-11T09:00:00.000Z'),
    endTime: new Date('2026-07-11T18:00:00.000Z'),
  };

  const detectionMessage = {
    messageId: 'msg-integration-1',
    identifierType: 'PLATE' as const,
    identifier: 'KA05GH1212',
    confidence: 0.95,
    occurredAt: '2026-07-11T10:00:00.000Z',
    deviceAuth: 'device-auth-token',
  };

  const createHarness = () => {
    const prisma = {
      organization: { findFirst: jest.fn() },
      parkingLot: { findFirst: jest.fn() },
      gate: { findFirst: jest.fn() },
      gateDetection: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      vehicle: { findMany: jest.fn(), findFirst: jest.fn() },
      vehicleAccessCredential: { findFirst: jest.fn() },
      parkingEvent: { findFirst: jest.fn() },
      booking: { findFirst: jest.fn() },
      slotAssignment: { findFirst: jest.fn() },
      gateAccessAttempt: { create: jest.fn(), count: jest.fn(), update: jest.fn() },
      iotDevice: { findFirst: jest.fn() },
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

    const iotDevicesService = {
      findByExternalDeviceId: jest.fn(),
      verifyDeviceCredential: jest.fn().mockReturnValue(true),
    } as unknown as IotDevicesService;

    const gateAccessDecisionService = new GateAccessDecisionService();
    const gateCommandsService = new GateCommandsService(
      prisma as never,
      eventPublisher,
      gateAccessDecisionService,
    );

    const parkingEventsService = {
      checkInForSystem: jest.fn().mockResolvedValue({ id: 200 }),
      checkOutForSystem: jest.fn(),
    };

    const orchestrationService = new IotParkingOrchestrationService(
      prisma as never,
      parkingEventsService as never,
      { releaseSlotForBooking: jest.fn() } as never,
      gateCommandsService,
    );

    const detectionProcessor = new GateDetectionProcessorService(
      prisma as never,
      gateAccessDecisionService,
      orchestrationService,
      iotDevicesService,
    );

    return {
      prisma,
      eventPublisher,
      gateCommandsService,
      detectionProcessor,
      parkingEventsService,
      iotDevicesService,
    };
  };

  const primeCommonMocks = (
    prisma: ReturnType<typeof createHarness>['prisma'],
    iotDevicesService: IotDevicesService,
  ) => {
    (iotDevicesService.findByExternalDeviceId as jest.Mock).mockResolvedValue(device);
    prisma.organization.findFirst.mockResolvedValue({ isActive: true });
    prisma.parkingLot.findFirst.mockResolvedValue({ isActive: true });
    prisma.gate.findFirst.mockResolvedValue(gate);
    prisma.gateDetection.findUnique.mockResolvedValue(null);
    prisma.gateDetection.findFirst.mockResolvedValue(null);
    prisma.parkingEvent.findFirst.mockResolvedValue(null);
    prisma.slotAssignment.findFirst.mockResolvedValue(null);
    prisma.gateDetection.create.mockResolvedValue({ id: 101 });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records a denied access attempt when no vehicle matches the plate', async () => {
    const { prisma, detectionProcessor, iotDevicesService } = createHarness();
    primeCommonMocks(prisma, iotDevicesService);

    prisma.vehicle.findMany.mockResolvedValue([]);
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.gateAccessAttempt.create.mockResolvedValue({ id: 1 });

    await detectionProcessor.processDetection({
      organizationId: gate.organizationId,
      externalDeviceId: device.externalDeviceId,
      message: detectionMessage,
    });

    expect(prisma.gateAccessAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: GateAccessSource.ANPR,
          decision: GateAccessDecision.DENIED,
          reasonCode: GateAccessReasonCode.VEHICLE_NOT_FOUND,
        }),
      }),
    );
    expect(prisma.gateCommand.create).not.toHaveBeenCalled();
  });

  it('grants entry, checks in, and queues an OPEN command through the outbox', async () => {
    const { prisma, eventPublisher, detectionProcessor, parkingEventsService, iotDevicesService } =
      createHarness();
    primeCommonMocks(prisma, iotDevicesService);

    prisma.vehicle.findMany.mockResolvedValue([vehicle]);
    prisma.booking.findFirst.mockResolvedValue(booking);
    prisma.iotDevice.findFirst.mockResolvedValue(controller);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        $executeRaw: jest.fn(),
        gateAccessAttempt: {
          create: jest.fn().mockResolvedValue({ id: 10 }),
          update: jest.fn(),
        },
        gateCommand: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 1,
            commandId: 'cmd-entry-1',
            gateId: gate.id,
            organizationId: gate.organizationId,
          }),
        },
      }),
    );

    await detectionProcessor.processDetection({
      organizationId: gate.organizationId,
      externalDeviceId: device.externalDeviceId,
      message: {
        ...detectionMessage,
        messageId: 'msg-granted-1',
      },
    });

    expect(parkingEventsService.checkInForSystem).toHaveBeenCalledWith({
      organizationId: gate.organizationId,
      bookingId: booking.id,
    });
    expect(eventPublisher.publishEventInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: OutboxEventType.GATE_OPEN_REQUESTED,
      }),
    );
  });

  it('marks a published command EXECUTED when the edge gateway sends an ack', async () => {
    const { prisma, eventPublisher, gateCommandsService } = createHarness();

    const command = {
      id: 1,
      commandId: 'cmd-entry-1',
      organizationId: 1,
      gateId: gate.id,
      status: GateCommandStatus.PUBLISHED,
      acknowledgedAt: null,
      failureCode: null,
      failureMessage: null,
    };

    prisma.iotDevice.findFirst.mockResolvedValue(controller);
    prisma.gateCommand.findFirst.mockResolvedValue(command);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        gateCommand: {
          update: jest.fn().mockResolvedValue({
            ...command,
            status: GateCommandStatus.EXECUTED,
          }),
        },
      }),
    );

    await gateCommandsService.handleAck({
      organizationId: gate.organizationId,
      externalDeviceId: controller.externalDeviceId,
      ack: {
        commandId: command.commandId,
        status: 'EXECUTED',
      },
    });

    expect(eventPublisher.publishEventInTransaction).toHaveBeenCalled();
  });
});