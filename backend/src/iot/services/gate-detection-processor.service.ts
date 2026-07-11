import { Injectable, Logger } from '@nestjs/common';
import {
  BookingStatus,
  GateAccessDecision,
  GateAccessSource,
  GateIdentifierType,
  ParkingEventStatus,
  Prisma,
  Vehicle,
  VehicleAccessCredential,
} from '@prisma/client';
import { normalizeVehicleNumber } from '../../common/vehicle-number.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildDisplaySuffix,
  hashIdentifier,
  hashPlateForDedup,
} from '../iot-identifier.util';
import { resolveIotConfig } from '../iot.config';
import { MqttDetectionMessage } from '../mqtt/mqtt.types';
import { GateAccessReasonCode } from '../gate-access-reason-codes';
import { GateAccessDecisionService } from './gate-access-decision.service';
import { IotParkingOrchestrationService } from './iot-parking-orchestration.service';
import { IotDevicesService } from './iot-devices.service';

@Injectable()
export class GateDetectionProcessorService {
  private readonly logger = new Logger(GateDetectionProcessorService.name);
  private readonly config = resolveIotConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateAccessDecisionService: GateAccessDecisionService,
    private readonly orchestrationService: IotParkingOrchestrationService,
    private readonly iotDevicesService: IotDevicesService,
  ) {}

  async processDetection(input: {
    organizationId: number;
    externalDeviceId: string;
    message: MqttDetectionMessage;
  }) {
    const device = await this.iotDevicesService.findByExternalDeviceId(
      input.organizationId,
      input.externalDeviceId,
    );

    if (!device) {
      this.logger.warn(
        `Ignoring detection from unknown device ${input.externalDeviceId} in organization ${input.organizationId}`,
      );
      return null;
    }

    if (!input.message.deviceAuth) {
      return this.recordAttempt({
        organizationId: device.organizationId,
        gateId: device.gateId,
        source: this.mapSource(input.message.identifierType),
        decision: GateAccessDecision.DENIED,
        reasonCode: GateAccessReasonCode.DEVICE_NOT_AUTHENTICATED,
        reasonDetail: 'Device authentication is required',
      });
    }

    if (!this.iotDevicesService.verifyDeviceCredential(device, input.message.deviceAuth)) {
      return this.recordAttempt({
        organizationId: device.organizationId,
        gateId: device.gateId,
        source: this.mapSource(input.message.identifierType),
        decision: GateAccessDecision.DENIED,
        reasonCode: GateAccessReasonCode.DEVICE_NOT_AUTHENTICATED,
        reasonDetail: 'Device credential verification failed',
      });
    }

    const gate = await this.prisma.gate.findFirst({
      where: {
        id: device.gateId,
        organizationId: device.organizationId,
      },
    });

    if (!gate) {
      return null;
    }

    const organization = await this.prisma.organization.findFirst({
      where: {
        id: device.organizationId,
      },
      select: {
        isActive: true,
      },
    });

    const parkingLot = await this.prisma.parkingLot.findFirst({
      where: {
        id: gate.parkingLotId,
        organizationId: device.organizationId,
      },
      select: {
        isActive: true,
      },
    });

    if (!organization || !parkingLot) {
      return null;
    }

    const identifierType = input.message.identifierType as GateIdentifierType;
    const identifierHash = this.hashIdentifierValue(
      identifierType,
      input.message.identifier,
    );
    const identifierDisplay =
      identifierType === GateIdentifierType.PLATE
        ? normalizeVehicleNumber(input.message.identifier)
        : buildDisplaySuffix(input.message.identifier);

    const existingDetection = await this.prisma.gateDetection.findUnique({
      where: {
        deviceId_messageId: {
          deviceId: device.id,
          messageId: input.message.messageId,
        },
      },
    });

    if (existingDetection) {
      return existingDetection;
    }

    const { vehicle, credential, plateMatchCount, activeBooking, activeParkingEvent, activeAssignment } =
      await this.resolveVehicleContext({
        organizationId: device.organizationId,
        gateId: gate.id,
        parkingLotId: gate.parkingLotId,
        identifierType,
        identifierHash,
        normalizedPlate:
          identifierType === GateIdentifierType.PLATE
            ? normalizeVehicleNumber(input.message.identifier)
            : undefined,
      });

    const isDuplicate = await this.isDuplicateDetection({
      gateId: gate.id,
      identifierType,
      identifierHash,
      normalizedPlate:
        identifierType === GateIdentifierType.PLATE
          ? normalizeVehicleNumber(input.message.identifier)
          : undefined,
      duplicateWindowSeconds: gate.duplicateWindowSeconds,
      occurredAt: new Date(input.message.occurredAt),
    });

    const decision = this.gateAccessDecisionService.evaluate({
      organization,
      parkingLot,
      gate,
      device,
      source: this.mapSource(identifierType),
      identifierType,
      confidence: input.message.confidence,
      vehicle,
      credential,
      activeBooking,
      activeParkingEvent,
      activeAssignment,
      isDuplicate,
      plateMatchCount,
      evaluatedAt: new Date(input.message.occurredAt),
    });

    const detection = await this.prisma.gateDetection.create({
      data: {
        organizationId: device.organizationId,
        gateId: gate.id,
        deviceId: device.id,
        messageId: input.message.messageId,
        identifierType,
        identifierHash,
        identifierDisplay,
        confidence: input.message.confidence,
        occurredAt: new Date(input.message.occurredAt),
        matchedVehicleId: vehicle?.id,
      },
    });

    if (decision.decision === GateAccessDecision.GRANTED) {
      return this.orchestrationService.orchestrateGrantedAccess({
        organizationId: device.organizationId,
        gateId: gate.id,
        source: this.mapSource(identifierType),
        detectionId: detection.id,
        vehicleId: vehicle?.id,
        decision,
      });
    }

    return this.recordAttempt({
      organizationId: device.organizationId,
      gateId: gate.id,
      detectionId: detection.id,
      source: this.mapSource(identifierType),
      decision: decision.decision,
      reasonCode: decision.reasonCode,
      reasonDetail: decision.reasonDetail,
      vehicleId: vehicle?.id,
      bookingId: decision.bookingId,
      parkingEventId: decision.parkingEventId,
    });
  }

  private async resolveVehicleContext(input: {
    organizationId: number;
    gateId: number;
    parkingLotId: number;
    identifierType: GateIdentifierType;
    identifierHash: string;
    normalizedPlate?: string;
  }) {
    let vehicle: Vehicle | null = null;
    let credential: VehicleAccessCredential | null = null;
    let plateMatchCount = 0;

    if (input.identifierType === GateIdentifierType.PLATE && input.normalizedPlate) {
      const vehicles = await this.prisma.vehicle.findMany({
        where: {
          organizationId: input.organizationId,
          vehicleNumber: input.normalizedPlate,
        },
      });

      plateMatchCount = vehicles.length;
      vehicle = vehicles.length === 1 ? vehicles[0] : null;
    } else {
      credential = await this.prisma.vehicleAccessCredential.findFirst({
        where: {
          organizationId: input.organizationId,
          credentialHash: input.identifierHash,
        },
      });

      if (credential) {
        vehicle = await this.prisma.vehicle.findFirst({
          where: {
            id: credential.vehicleId,
            organizationId: input.organizationId,
          },
        });
      }
    }

    const activeParkingEvent = vehicle
      ? await this.prisma.parkingEvent.findFirst({
          where: {
            organizationId: input.organizationId,
            vehicleId: vehicle.id,
            status: ParkingEventStatus.ACTIVE,
            checkOutTime: null,
          },
          orderBy: {
            checkInTime: 'desc',
          },
        })
      : null;

    const now = new Date();
    const earlyEntryMs = this.config.bookingEarlyEntryMinutes * 60_000;
    const exitGraceMs = this.config.bookingExitGraceMinutes * 60_000;

    const activeBooking = vehicle
      ? await this.prisma.booking.findFirst({
          where: {
            organizationId: input.organizationId,
            vehicleId: vehicle.id,
            parkingLotId: input.parkingLotId,
            status: BookingStatus.CONFIRMED,
            startTime: {
              lte: new Date(now.getTime() + earlyEntryMs),
            },
            OR: [
              { endTime: null },
              {
                endTime: {
                  gte: new Date(now.getTime() - exitGraceMs),
                },
              },
            ],
          },
          orderBy: {
            id: 'desc',
          },
        })
      : null;

    const activeAssignment = vehicle
      ? await this.prisma.slotAssignment.findFirst({
          where: {
            organizationId: input.organizationId,
            vehicleId: vehicle.id,
            status: 'ACTIVE',
            slot: {
              floor: {
                parkingLotId: input.parkingLotId,
              },
            },
          },
          select: {
            id: true,
            slotId: true,
          },
        })
      : null;

    return {
      vehicle,
      credential,
      plateMatchCount,
      activeBooking,
      activeParkingEvent,
      activeAssignment,
    };
  }

  private async isDuplicateDetection(input: {
    gateId: number;
    identifierType: GateIdentifierType;
    identifierHash: string;
    normalizedPlate?: string;
    duplicateWindowSeconds: number;
    occurredAt: Date;
  }): Promise<boolean> {
    const windowStart = new Date(
      input.occurredAt.getTime() - input.duplicateWindowSeconds * 1000,
    );

    const dedupHash =
      input.identifierType === GateIdentifierType.PLATE && input.normalizedPlate
        ? hashPlateForDedup(input.normalizedPlate, this.config.identifierPepper)
        : input.identifierHash;

    const recent = await this.prisma.gateDetection.findFirst({
      where: {
        gateId: input.gateId,
        occurredAt: {
          gte: windowStart,
          lt: input.occurredAt,
        },
        identifierHash: dedupHash,
      },
    });

    return recent !== null;
  }

  private hashIdentifierValue(identifierType: GateIdentifierType, rawValue: string): string {
    if (identifierType === GateIdentifierType.PLATE) {
      return hashPlateForDedup(
        normalizeVehicleNumber(rawValue),
        this.config.identifierPepper,
      );
    }

    return hashIdentifier(rawValue, this.config.identifierPepper);
  }

  private mapSource(identifierType: GateIdentifierType | MqttDetectionMessage['identifierType']) {
    switch (identifierType) {
      case GateIdentifierType.PLATE:
      case 'PLATE':
        return GateAccessSource.ANPR;
      case GateIdentifierType.UHF_RFID:
      case 'UHF_RFID':
        return GateAccessSource.RFID;
      case GateIdentifierType.QR_CODE:
      case 'QR_CODE':
      default:
        return GateAccessSource.QR;
    }
  }

  private recordAttempt(data: Prisma.GateAccessAttemptCreateInput | {
    organizationId: number;
    gateId: number;
    detectionId?: number;
    source: GateAccessSource;
    decision: GateAccessDecision;
    reasonCode: string;
    reasonDetail?: string;
    vehicleId?: number;
    bookingId?: number;
    parkingEventId?: number;
    actorUserId?: number;
  }) {
    if ('organization' in data) {
      return this.prisma.gateAccessAttempt.create({ data });
    }

    return this.prisma.gateAccessAttempt.create({
      data: {
        organizationId: data.organizationId,
        gateId: data.gateId,
        detectionId: data.detectionId,
        source: data.source,
        decision: data.decision,
        reasonCode: data.reasonCode,
        reasonDetail: data.reasonDetail,
        vehicleId: data.vehicleId,
        bookingId: data.bookingId,
        parkingEventId: data.parkingEventId,
        actorUserId: data.actorUserId,
      },
    });
  }
}