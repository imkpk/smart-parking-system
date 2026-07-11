import {
  BookingStatus,
  GateAccessSource,
  GateDirection,
  GateIdentifierType,
  ParkingEventStatus,
  VehicleCredentialStatus,
} from '@prisma/client';
import { GateAccessReasonCode } from '../gate-access-reason-codes';
import { GateAccessDecisionService } from './gate-access-decision.service';

describe('GateAccessDecisionService', () => {
  const service = new GateAccessDecisionService();

  const baseGate = {
    id: 1,
    organizationId: 1,
    parkingLotId: 10,
    externalId: 'gate-1',
    name: 'Main Entry',
    direction: GateDirection.ENTRY,
    isActive: true,
    autoOpenEnabled: true,
    anprConfidenceThreshold: 0.85,
    duplicateWindowSeconds: 30,
    commandTtlSeconds: 15,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseDevice = {
    id: 1,
    organizationId: 1,
    gateId: 1,
    externalDeviceId: 'cam-1',
    name: 'ANPR Camera',
    deviceType: 'ANPR_CAMERA' as const,
    status: 'ONLINE' as const,
    isEnabled: true,
    credentialHash: null,
    lastSeenAt: new Date(),
    firmwareVersion: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const vehicle = {
    id: 5,
    organizationId: 1,
    userId: 2,
    vehicleNumber: 'KA05GH1212',
    vehicleType: 'CAR' as const,
    brand: null,
    model: null,
    color: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseContext = {
    organization: { isActive: true },
    parkingLot: { isActive: true },
    gate: baseGate,
    device: baseDevice,
    source: GateAccessSource.ANPR,
    identifierType: GateIdentifierType.PLATE,
    confidence: 0.95,
    vehicle,
    credential: null,
    activeBooking: {
      id: 100,
      status: BookingStatus.CONFIRMED,
      startTime: new Date('2026-06-14T09:00:00.000Z'),
      endTime: new Date('2026-06-14T18:00:00.000Z'),
    },
    activeParkingEvent: null,
    activeAssignment: null,
    isDuplicate: false,
    plateMatchCount: 1,
    evaluatedAt: new Date('2026-06-14T10:00:00.000Z'),
  };

  it('grants entry for a confirmed booking', () => {
    const result = service.evaluate(baseContext);

    expect(result.decision).toBe('GRANTED');
    expect(result.reasonCode).toBe(GateAccessReasonCode.ENTRY_BOOKING_CONFIRMED);
    expect(result.bookingId).toBe(100);
  });

  it('denies duplicate detections', () => {
    const result = service.evaluate({
      ...baseContext,
      isDuplicate: true,
    });

    expect(result.decision).toBe('DENIED');
    expect(result.reasonCode).toBe(GateAccessReasonCode.DUPLICATE_DETECTION);
  });

  it('requires review for low-confidence ANPR reads', () => {
    const result = service.evaluate({
      ...baseContext,
      confidence: 0.5,
    });

    expect(result.decision).toBe('REVIEW_REQUIRED');
    expect(result.reasonCode).toBe(GateAccessReasonCode.ANPR_LOW_CONFIDENCE);
  });

  it('denies entry when booking is too early', () => {
    const result = service.evaluate({
      ...baseContext,
      activeBooking: {
        id: 100,
        status: BookingStatus.CONFIRMED,
        startTime: new Date('2026-06-14T12:00:00.000Z'),
        endTime: null,
      },
      evaluatedAt: new Date('2026-06-14T10:00:00.000Z'),
    });

    expect(result.decision).toBe('DENIED');
    expect(result.reasonCode).toBe(GateAccessReasonCode.BOOKING_TOO_EARLY);
  });

  it('denies entry when organization is inactive', () => {
    const result = service.evaluate({
      ...baseContext,
      organization: { isActive: false },
    });

    expect(result.decision).toBe('DENIED');
    expect(result.reasonCode).toBe(GateAccessReasonCode.ORGANIZATION_INACTIVE);
  });

  it('grants exit when an active session exists on exit gate', () => {
    const result = service.evaluate({
      ...baseContext,
      gate: {
        ...baseGate,
        direction: GateDirection.EXIT,
      },
      source: GateAccessSource.RFID,
      identifierType: GateIdentifierType.UHF_RFID,
      credential: {
        id: 1,
        organizationId: 1,
        vehicleId: 5,
        credentialType: 'UHF_RFID',
        credentialHash: 'hash',
        displaySuffix: '2345',
        status: VehicleCredentialStatus.ACTIVE,
        validFrom: new Date(),
        validUntil: null,
        createdByUserId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      activeBooking: null,
      activeParkingEvent: {
        id: 55,
        status: ParkingEventStatus.ACTIVE,
        parkingLotId: 10,
      },
      activeAssignment: null,
      isDuplicate: false,
    });

    expect(result.decision).toBe('GRANTED');
    expect(result.reasonCode).toBe(GateAccessReasonCode.EXIT_ACTIVE_SESSION);
    expect(result.parkingEventId).toBe(55);
  });
});