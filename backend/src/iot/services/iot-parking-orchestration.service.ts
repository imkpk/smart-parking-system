import { Injectable, Logger } from '@nestjs/common';
import {
  AssignmentStatus,
  BookingStatus,
  GateAccessDecision,
  GateAccessSource,
} from '@prisma/client';
import { ParkingEventsService } from '../../parking-events/parking-events.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SlotLifecycleService } from '../../slots/slot-lifecycle.service';
import { GateAccessReasonCode } from '../gate-access-reason-codes';
import { GateAccessDecisionResult } from './gate-access-decision.service';
import { GateCommandsService } from './gate-commands.service';

@Injectable()
export class IotParkingOrchestrationService {
  private readonly logger = new Logger(IotParkingOrchestrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingEventsService: ParkingEventsService,
    private readonly slotLifecycleService: SlotLifecycleService,
    private readonly gateCommandsService: GateCommandsService,
  ) {}

  async orchestrateGrantedAccess(input: {
    organizationId: number;
    gateId: number;
    source: GateAccessSource;
    detectionId?: number;
    vehicleId?: number;
    actorUserId?: number;
    decision: GateAccessDecisionResult;
  }) {
    if (input.decision.decision !== GateAccessDecision.GRANTED) {
      throw new Error('orchestrateGrantedAccess requires a GRANTED decision');
    }

    try {
      let bookingId = input.decision.bookingId;
      let parkingEventId = input.decision.parkingEventId;

      if (input.decision.flow === 'ENTRY') {
        if (!bookingId && input.vehicleId) {
          bookingId = await this.ensureAssignmentBooking({
            organizationId: input.organizationId,
            gateId: input.gateId,
            vehicleId: input.vehicleId,
          });
        }

        if (!bookingId) {
          throw new Error('Entry flow requires a booking');
        }

        const checkInResult = await this.parkingEventsService.checkInForSystem({
          organizationId: input.organizationId,
          bookingId,
        });

        parkingEventId = checkInResult.id;
      } else if (input.decision.flow === 'EXIT') {
        if (!parkingEventId) {
          throw new Error('Exit flow requires a parking event');
        }

        const checkOutResult = await this.parkingEventsService.checkOutForSystem({
          organizationId: input.organizationId,
          parkingEventId,
        });

        parkingEventId = checkOutResult.parkingEvent.id;

        const feeAmount = Number(checkOutResult.parkingEvent.feeAmount ?? 0);
        if (feeAmount >= 0.01 && !checkOutResult.paymentInitiated) {
          return this.recordFailedAttempt({
            organizationId: input.organizationId,
            gateId: input.gateId,
            source: input.source,
            detectionId: input.detectionId,
            vehicleId: input.vehicleId,
            bookingId: input.decision.bookingId,
            parkingEventId: checkOutResult.parkingEvent.id,
            actorUserId: input.actorUserId,
            reasonCode: GateAccessReasonCode.PAYMENT_INITIATION_FAILED,
            reasonDetail:
              checkOutResult.paymentError ?? 'Exit payment initiation failed',
          });
        }
      }

      return this.gateCommandsService.createOpenCommand({
        organizationId: input.organizationId,
        gateId: input.gateId,
        source: input.source,
        detectionId: input.detectionId,
        vehicleId: input.vehicleId,
        bookingId,
        parkingEventId,
        actorUserId: input.actorUserId,
        reasonCode: input.decision.reasonCode,
        reasonDetail: input.decision.reasonDetail,
      });
    } catch (error) {
      this.logger.error(
        'IoT parking orchestration failed',
        error instanceof Error ? error.stack : undefined,
      );

      return this.recordFailedAttempt({
        organizationId: input.organizationId,
        gateId: input.gateId,
        source: input.source,
        detectionId: input.detectionId,
        vehicleId: input.vehicleId,
        bookingId: input.decision.bookingId,
        parkingEventId: input.decision.parkingEventId,
        actorUserId: input.actorUserId,
        reasonDetail: error instanceof Error ? error.message : 'Unknown orchestration error',
      });
    }
  }

  private async ensureAssignmentBooking(input: {
    organizationId: number;
    gateId: number;
    vehicleId: number;
  }): Promise<number> {
    const gate = await this.prisma.gate.findFirst({
      where: {
        id: input.gateId,
        organizationId: input.organizationId,
      },
      select: {
        parkingLotId: true,
      },
    });

    if (!gate) {
      throw new Error('Gate not found');
    }

    const assignment = await this.prisma.slotAssignment.findFirst({
      where: {
        organizationId: input.organizationId,
        vehicleId: input.vehicleId,
        status: AssignmentStatus.ACTIVE,
        slot: {
          floor: {
            parkingLotId: gate.parkingLotId,
          },
        },
      },
      include: {
        slot: {
          include: {
            floor: true,
          },
        },
      },
      orderBy: {
        assignedAt: 'desc',
      },
    });

    if (!assignment) {
      throw new Error('No active slot assignment found');
    }

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          organizationId: input.organizationId,
          userId: assignment.userId,
          vehicleId: assignment.vehicleId,
          slotId: assignment.slotId,
          parkingLotId: assignment.slot.floor.parkingLotId,
          status: BookingStatus.CONFIRMED,
          startTime: new Date(),
          bookingCode: this.generateBookingCode(),
        },
      });

      if (assignment.slot.status === 'AVAILABLE') {
        await this.slotLifecycleService.reserveSlot(assignment.slotId, tx);
      }

      return booking.id;
    });
  }

  private async recordFailedAttempt(input: {
    organizationId: number;
    gateId: number;
    source: GateAccessSource;
    detectionId?: number;
    vehicleId?: number;
    bookingId?: number;
    parkingEventId?: number;
    actorUserId?: number;
    reasonCode?: string;
    reasonDetail: string;
  }) {
    return this.prisma.gateAccessAttempt.create({
      data: {
        organizationId: input.organizationId,
        gateId: input.gateId,
        detectionId: input.detectionId,
        source: input.source,
        decision: GateAccessDecision.ERROR,
        reasonCode: input.reasonCode ?? GateAccessReasonCode.ORCHESTRATION_FAILED,
        reasonDetail: input.reasonDetail,
        vehicleId: input.vehicleId,
        bookingId: input.bookingId,
        parkingEventId: input.parkingEventId,
        actorUserId: input.actorUserId,
      },
    });
  }

  private generateBookingCode() {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `BK-${Date.now()}-${random}`;
  }
}