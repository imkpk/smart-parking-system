import { GateAccessDecision, GateAccessSource } from '@prisma/client';
import { GateAccessReasonCode } from '../gate-access-reason-codes';
import { GateAccessDecisionService } from './gate-access-decision.service';
import { GateDetectionProcessorService } from './gate-detection-processor.service';
import { IotParkingOrchestrationService } from './iot-parking-orchestration.service';
import { IotDevicesService } from './iot-devices.service';

describe('GateDetectionProcessorService', () => {
  const prisma = {
    gate: { findFirst: jest.fn() },
    organization: { findFirst: jest.fn() },
    parkingLot: { findFirst: jest.fn() },
    gateDetection: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    vehicle: { findMany: jest.fn() },
    vehicleAccessCredential: { findFirst: jest.fn() },
    parkingEvent: { findFirst: jest.fn() },
    booking: { findFirst: jest.fn() },
    slotAssignment: { findFirst: jest.fn() },
    gateAccessAttempt: { create: jest.fn() },
  };

  const gateAccessDecisionService = {
    evaluate: jest.fn(),
  } as unknown as GateAccessDecisionService;

  const orchestrationService = {
    orchestrateGrantedAccess: jest.fn(),
  } as unknown as IotParkingOrchestrationService;

  const iotDevicesService = {
    findByExternalDeviceId: jest.fn(),
    verifyDeviceCredential: jest.fn(),
  } as unknown as IotDevicesService;

  const service = new GateDetectionProcessorService(
    prisma as never,
    gateAccessDecisionService,
    orchestrationService,
    iotDevicesService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores detections from unknown devices', async () => {
    (iotDevicesService.findByExternalDeviceId as jest.Mock).mockResolvedValue(null);

    const result = await service.processDetection({
      organizationId: 1,
      externalDeviceId: 'unknown-device',
      message: {
        messageId: 'msg-1',
        identifierType: 'PLATE',
        identifier: 'KA05GH1212',
        confidence: 0.95,
        occurredAt: new Date().toISOString(),
        deviceAuth: 'credential',
      },
    });

    expect(result).toBeNull();
    expect(iotDevicesService.findByExternalDeviceId).toHaveBeenCalledWith(1, 'unknown-device');
  });

  it('denies detections without device authentication', async () => {
    const device = {
      id: 1,
      organizationId: 1,
      gateId: 2,
      externalDeviceId: 'cam-1',
      isEnabled: true,
      status: 'ONLINE',
      gate: { id: 2 },
    };

    (iotDevicesService.findByExternalDeviceId as jest.Mock).mockResolvedValue(device);
    (prisma.gateAccessAttempt.create as jest.Mock).mockResolvedValue({ id: 1 });

    await service.processDetection({
      organizationId: 1,
      externalDeviceId: 'cam-1',
      message: {
        messageId: 'msg-auth',
        identifierType: 'PLATE',
        identifier: 'KA05GH1212',
        confidence: 0.95,
        occurredAt: new Date().toISOString(),
      },
    });

    expect(prisma.gateAccessAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          decision: GateAccessDecision.DENIED,
          reasonCode: GateAccessReasonCode.DEVICE_NOT_AUTHENTICATED,
        }),
      }),
    );
  });

  it('records denied attempts without orchestration', async () => {
    const device = {
      id: 1,
      organizationId: 1,
      gateId: 2,
      externalDeviceId: 'cam-1',
      isEnabled: true,
      status: 'ONLINE',
      gate: { id: 2 },
    };
    const gate = {
      id: 2,
      organizationId: 1,
      parkingLotId: 10,
      duplicateWindowSeconds: 30,
      anprConfidenceThreshold: 0.85,
      isActive: true,
      autoOpenEnabled: true,
      direction: 'ENTRY',
    };

    (iotDevicesService.findByExternalDeviceId as jest.Mock).mockResolvedValue(device);
    (iotDevicesService.verifyDeviceCredential as jest.Mock).mockReturnValue(true);
    (prisma.gate.findFirst as jest.Mock).mockResolvedValue(gate);
    (prisma.organization.findFirst as jest.Mock).mockResolvedValue({ isActive: true });
    (prisma.parkingLot.findFirst as jest.Mock).mockResolvedValue({ isActive: true });
    (prisma.gateDetection.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.gateDetection.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.vehicle.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.parkingEvent.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.booking.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.slotAssignment.findFirst as jest.Mock).mockResolvedValue(null);
    (gateAccessDecisionService.evaluate as jest.Mock).mockReturnValue({
      decision: GateAccessDecision.DENIED,
      reasonCode: GateAccessReasonCode.VEHICLE_NOT_FOUND,
      flow: 'NONE',
    });
    (prisma.gateDetection.create as jest.Mock).mockResolvedValue({ id: 99 });
    (prisma.gateAccessAttempt.create as jest.Mock).mockResolvedValue({ id: 1 });

    await service.processDetection({
      organizationId: 1,
      externalDeviceId: 'cam-1',
      message: {
        messageId: 'msg-2',
        identifierType: 'PLATE',
        identifier: 'KA05GH1212',
        confidence: 0.95,
        occurredAt: new Date().toISOString(),
        deviceAuth: 'credential',
      },
    });

    expect(orchestrationService.orchestrateGrantedAccess).not.toHaveBeenCalled();
    expect(prisma.gateAccessAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: GateAccessSource.ANPR,
          decision: GateAccessDecision.DENIED,
          reasonCode: GateAccessReasonCode.VEHICLE_NOT_FOUND,
        }),
      }),
    );
  });
});