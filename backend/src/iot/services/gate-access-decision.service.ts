import { Injectable } from '@nestjs/common';
import {
  AssignmentStatus,
  BookingStatus,
  Gate,
  GateAccessDecision,
  GateAccessSource,
  GateDirection,
  GateIdentifierType,
  IotDevice,
  ParkingEventStatus,
  Vehicle,
  VehicleAccessCredential,
  VehicleCredentialStatus,
} from '@prisma/client';
import { GateAccessReasonCode } from '../gate-access-reason-codes';

export type GateAccessContext = {
  gate: Gate;
  device: IotDevice | null;
  source: GateAccessSource;
  identifierType: GateIdentifierType;
  confidence?: number | null;
  vehicle: Vehicle | null;
  credential: VehicleAccessCredential | null;
  activeBooking: {
    id: number;
    status: BookingStatus;
  } | null | undefined;
  activeParkingEvent: {
    id: number;
    status: ParkingEventStatus;
    parkingLotId: number;
  } | null;
  activeAssignment: {
    id: number;
    slotId: number;
  } | null;
  isDuplicate: boolean;
  plateMatchCount?: number;
};

export type GateAccessDecisionResult = {
  decision: GateAccessDecision;
  reasonCode: string;
  reasonDetail?: string;
  flow: 'ENTRY' | 'EXIT' | 'NONE';
  bookingId?: number;
  parkingEventId?: number;
};

@Injectable()
export class GateAccessDecisionService {
  evaluate(context: GateAccessContext): GateAccessDecisionResult {
    if (!context.gate.isActive) {
      return this.denied(GateAccessReasonCode.GATE_INACTIVE, 'Gate is inactive');
    }

    if (!context.gate.autoOpenEnabled && context.source !== GateAccessSource.MANUAL_OVERRIDE) {
      return this.denied(
        GateAccessReasonCode.AUTO_OPEN_DISABLED,
        'Automatic gate opening is disabled',
      );
    }

    if (!context.device) {
      return this.denied(GateAccessReasonCode.DEVICE_NOT_FOUND, 'Reporting device not found');
    }

    if (!context.device.isEnabled || context.device.status === 'DISABLED') {
      return this.denied(GateAccessReasonCode.DEVICE_DISABLED, 'Reporting device is disabled');
    }

    if (context.isDuplicate) {
      return this.denied(
        GateAccessReasonCode.DUPLICATE_DETECTION,
        'Duplicate detection within configured window',
      );
    }

    if (context.identifierType === GateIdentifierType.PLATE) {
      const confidence = context.confidence ?? 0;
      if (confidence < context.gate.anprConfidenceThreshold) {
        return this.denied(
          GateAccessReasonCode.ANPR_LOW_CONFIDENCE,
          `Confidence ${confidence} below threshold ${context.gate.anprConfidenceThreshold}`,
        );
      }

      if ((context.plateMatchCount ?? 0) > 1) {
        return this.review(
          GateAccessReasonCode.ANPR_MULTIPLE_MATCHES,
          'Multiple vehicles matched the detected plate',
        );
      }
    }

    if (
      context.identifierType === GateIdentifierType.UHF_RFID ||
      context.identifierType === GateIdentifierType.QR_CODE
    ) {
      if (!context.credential) {
        return this.denied(
          GateAccessReasonCode.CREDENTIAL_NOT_FOUND,
          'No active credential matched the presented identifier',
        );
      }

      if (context.credential.status === VehicleCredentialStatus.REVOKED) {
        return this.denied(GateAccessReasonCode.CREDENTIAL_REVOKED, 'Credential has been revoked');
      }

      if (
        context.credential.status === VehicleCredentialStatus.EXPIRED ||
        (context.credential.validUntil && context.credential.validUntil <= new Date())
      ) {
        return this.denied(GateAccessReasonCode.CREDENTIAL_EXPIRED, 'Credential has expired');
      }
    }

    if (!context.vehicle) {
      return this.denied(GateAccessReasonCode.VEHICLE_NOT_FOUND, 'No vehicle matched the identifier');
    }

    const flow = this.resolveFlow(context);

    if (flow === 'NONE') {
      return this.denied(
        GateAccessReasonCode.WRONG_GATE_DIRECTION,
        'Gate direction does not permit this access flow',
      );
    }

    if (flow === 'EXIT') {
      if (!context.activeParkingEvent) {
        return this.denied(
          GateAccessReasonCode.NO_ACTIVE_SESSION,
          'No active parking session found for exit',
        );
      }

      if (context.activeParkingEvent.parkingLotId !== context.gate.parkingLotId) {
        return this.denied(
          GateAccessReasonCode.NO_ACTIVE_SESSION,
          'Active session belongs to a different parking lot',
        );
      }

      return {
        decision: GateAccessDecision.GRANTED,
        reasonCode: GateAccessReasonCode.EXIT_ACTIVE_SESSION,
        flow,
        parkingEventId: context.activeParkingEvent.id,
      };
    }

    if (context.activeParkingEvent?.status === ParkingEventStatus.ACTIVE) {
      if (context.activeParkingEvent.parkingLotId === context.gate.parkingLotId) {
        return this.denied(
          GateAccessReasonCode.ALREADY_CHECKED_IN,
          'Vehicle already has an active parking session',
        );
      }
    }

    const booking = context.activeBooking;

    if (booking?.status === BookingStatus.CONFIRMED) {
      return {
        decision: GateAccessDecision.GRANTED,
        reasonCode: GateAccessReasonCode.ENTRY_BOOKING_CONFIRMED,
        flow,
        bookingId: booking.id,
      };
    }

    if (context.activeAssignment) {
      return {
        decision: GateAccessDecision.GRANTED,
        reasonCode: GateAccessReasonCode.ENTRY_ASSIGNMENT_AUTO_BOOKING,
        flow,
      };
    }

    if (booking) {
      return this.denied(
        GateAccessReasonCode.BOOKING_NOT_CONFIRMED,
        `Booking status is ${booking.status}`,
      );
    }

    return this.denied(
      GateAccessReasonCode.NO_ACTIVE_BOOKING,
      'No confirmed booking or active assignment found for entry',
    );
  }

  evaluateManualOverride(): GateAccessDecisionResult {
    return {
      decision: GateAccessDecision.GRANTED,
      reasonCode: GateAccessReasonCode.MANUAL_OVERRIDE,
      flow: 'ENTRY',
    };
  }

  private resolveFlow(context: GateAccessContext): 'ENTRY' | 'EXIT' | 'NONE' {
    const hasActiveSession =
      context.activeParkingEvent?.status === ParkingEventStatus.ACTIVE &&
      context.activeParkingEvent.parkingLotId === context.gate.parkingLotId;

    if (context.gate.direction === GateDirection.ENTRY) {
      return hasActiveSession ? 'NONE' : 'ENTRY';
    }

    if (context.gate.direction === GateDirection.EXIT) {
      return hasActiveSession ? 'EXIT' : 'NONE';
    }

    return hasActiveSession ? 'EXIT' : 'ENTRY';
  }

  private denied(reasonCode: string, reasonDetail: string): GateAccessDecisionResult {
    return {
      decision: GateAccessDecision.DENIED,
      reasonCode,
      reasonDetail,
      flow: 'NONE',
    };
  }

  private review(reasonCode: string, reasonDetail: string): GateAccessDecisionResult {
    return {
      decision: GateAccessDecision.REVIEW_REQUIRED,
      reasonCode,
      reasonDetail,
      flow: 'NONE',
    };
  }
}