import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus, ParkingEventStatus, Prisma, SlotStatus } from '@prisma/client';
import { bookingListInclude, presentBooking } from '../bookings/booking.presenter';
import { AccessPolicyService } from '../common/access-policy.service';
import {
  parkingEventListInclude,
  presentParkingEvent,
} from '../parking-events/parking-event.presenter';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { SecurityGateSearchResult } from './security-gate.types';

const BOOKING_NO_PATTERN = /^BK-0*(\d+)$/i;

const gateBookingInclude = {
  ...bookingListInclude,
  slot: {
    select: {
      id: true,
      slotNumber: true,
      status: true,
      floor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

type GateBooking = Parameters<typeof presentBooking>[0] & {
  slot: { status: SlotStatus };
};

@Injectable()
export class SecurityGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async search(query: string, currentUser: SafeUser): Promise<SecurityGateSearchResult | null> {
    const normalizedQuery = this.normalizeGateSearchQuery(query);

    if (!normalizedQuery) {
      throw new BadRequestException('Search query is required');
    }

    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const bookingIdFromLabel = this.parseBookingNo(normalizedQuery);
    const searchTerm = normalizedQuery.toUpperCase();

    if (this.isBookingReferenceSearch(searchTerm, bookingIdFromLabel)) {
      return this.resolveBookingGateAction(organizationId, searchTerm, bookingIdFromLabel);
    }

    return this.resolveVehicleGateAction(organizationId, searchTerm);
  }

  private async resolveBookingGateAction(
    organizationId: number,
    searchTerm: string,
    bookingIdFromLabel: number | null,
  ): Promise<SecurityGateSearchResult | null> {
    const booking = await this.prisma.booking.findFirst({
      where: {
        organizationId,
        OR: this.buildBookingSearchFilters(searchTerm, bookingIdFromLabel),
      },
      orderBy: { id: 'desc' },
      include: gateBookingInclude,
    });

    if (!booking) {
      return null;
    }

    const activeEvent = await this.prisma.parkingEvent.findFirst({
      where: {
        organizationId,
        bookingId: booking.id,
        status: ParkingEventStatus.ACTIVE,
        checkOutTime: null,
      },
      include: parkingEventListInclude,
    });

    if (activeEvent) {
      return this.buildCheckOutResult(activeEvent);
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      const eventCount = await this.prisma.parkingEvent.count({
        where: { organizationId, bookingId: booking.id },
      });

      if (eventCount === 0) {
        return this.buildCheckInResult(booking);
      }
    }

    const returnCheckIn = await this.buildReturnCheckInResult(booking);

    if (returnCheckIn) {
      return returnCheckIn;
    }

    const lastCheckOutTime = await this.getLastCheckOutTime(organizationId, booking.id);

    return this.buildNoneResult(booking, lastCheckOutTime);
  }

  private async resolveVehicleGateAction(
    organizationId: number,
    vehicleNumber: string,
  ): Promise<SecurityGateSearchResult | null> {
    const primaryActive = await this.prisma.parkingEvent.findFirst({
      where: {
        organizationId,
        status: ParkingEventStatus.ACTIVE,
        checkOutTime: null,
        vehicle: { vehicleNumber },
      },
      orderBy: { checkInTime: 'desc' },
      include: parkingEventListInclude,
    });

    if (primaryActive) {
      const checkoutAfterCheckIn = await this.prisma.parkingEvent.findFirst({
        where: {
          organizationId,
          vehicle: { vehicleNumber },
          status: ParkingEventStatus.COMPLETED,
          checkOutTime: { gt: primaryActive.checkInTime },
        },
        orderBy: { checkOutTime: 'desc' },
      });

      if (!checkoutAfterCheckIn) {
        return this.buildCheckOutResult(primaryActive);
      }
    }

    const returnSession = await this.findLatestReturnCheckInSession(organizationId, {
      vehicle: { vehicleNumber },
    });

    if (returnSession) {
      return this.buildCheckInResult(
        returnSession.booking,
        returnSession.lastCheckOutTime.toISOString(),
      );
    }

    const firstVisitBooking = await this.prisma.booking.findFirst({
      where: {
        organizationId,
        status: BookingStatus.CONFIRMED,
        parkingEvents: { none: {} },
        vehicle: { vehicleNumber },
      },
      orderBy: { id: 'desc' },
      include: gateBookingInclude,
    });

    if (firstVisitBooking) {
      return this.buildCheckInResult(firstVisitBooking);
    }

    const latestCompletedSession = await this.prisma.parkingEvent.findFirst({
      where: {
        organizationId,
        vehicle: { vehicleNumber },
        status: ParkingEventStatus.COMPLETED,
        checkOutTime: { not: null },
      },
      orderBy: { checkOutTime: 'desc' },
      include: {
        booking: {
          include: gateBookingInclude,
        },
      },
    });

    if (latestCompletedSession?.booking && latestCompletedSession.checkOutTime) {
      return this.buildNoneResult(
        latestCompletedSession.booking,
        latestCompletedSession.checkOutTime.toISOString(),
      );
    }

    const latestBooking = await this.prisma.booking.findFirst({
      where: {
        organizationId,
        vehicle: { vehicleNumber },
      },
      orderBy: { id: 'desc' },
      include: gateBookingInclude,
    });

    if (!latestBooking) {
      return null;
    }

    const lastCheckOutTime = await this.getLastCheckOutTime(organizationId, latestBooking.id);

    return this.buildNoneResult(latestBooking, lastCheckOutTime);
  }

  private async findLatestReturnCheckInSession(
    organizationId: number,
    filters: {
      vehicle?: { vehicleNumber: string };
      booking?: Prisma.BookingWhereInput;
    },
  ) {
    const completedSession = await this.prisma.parkingEvent.findFirst({
      where: {
        organizationId,
        status: ParkingEventStatus.COMPLETED,
        checkOutTime: { not: null },
        ...(filters.vehicle ? { vehicle: filters.vehicle } : {}),
        booking: {
          organizationId,
          parkingEvents: {
            none: {
              status: ParkingEventStatus.ACTIVE,
            },
          },
          ...(filters.booking ?? {}),
        },
      },
      orderBy: { checkOutTime: 'desc' },
      include: {
        booking: {
          include: gateBookingInclude,
        },
      },
    });

    if (!completedSession?.booking || !completedSession.checkOutTime) {
      return null;
    }

    const slotReadyForReturn = await this.isSlotReadyForReturnCheckIn(
      organizationId,
      completedSession.booking.slot.id,
      completedSession.booking.slot.status,
    );

    if (!slotReadyForReturn) {
      return null;
    }

    return {
      booking: completedSession.booking as GateBooking,
      lastCheckOutTime: completedSession.checkOutTime,
    };
  }

  private async isSlotReadyForReturnCheckIn(
    organizationId: number,
    slotId: number,
    slotStatus: SlotStatus,
  ) {
    if (slotStatus === SlotStatus.AVAILABLE) {
      return true;
    }

    if (slotStatus !== SlotStatus.OCCUPIED) {
      return false;
    }

    const activeEventOnSlot = await this.prisma.parkingEvent.findFirst({
      where: {
        organizationId,
        slotId,
        status: ParkingEventStatus.ACTIVE,
        checkOutTime: null,
      },
    });

    return activeEventOnSlot === null;
  }

  private async buildReturnCheckInResult(
    booking: GateBooking,
  ): Promise<SecurityGateSearchResult | null> {
    const slotReadyForReturn = await this.isSlotReadyForReturnCheckIn(
      booking.organizationId,
      booking.slot.id,
      booking.slot.status,
    );

    if (!slotReadyForReturn) {
      return null;
    }

    const completedEvent = await this.prisma.parkingEvent.findFirst({
      where: {
        organizationId: booking.organizationId,
        bookingId: booking.id,
        status: ParkingEventStatus.COMPLETED,
        checkOutTime: { not: null },
      },
      orderBy: { checkOutTime: 'desc' },
      select: { checkOutTime: true },
    });

    if (!completedEvent?.checkOutTime) {
      return null;
    }

    const activeEvent = await this.prisma.parkingEvent.findFirst({
      where: {
        organizationId: booking.organizationId,
        bookingId: booking.id,
        status: ParkingEventStatus.ACTIVE,
      },
    });

    if (activeEvent) {
      return null;
    }

    return this.buildCheckInResult(booking, completedEvent.checkOutTime.toISOString());
  }

  private async getLastCheckOutTime(organizationId: number, bookingId: number) {
    const lastCompletedEvent = await this.prisma.parkingEvent.findFirst({
      where: {
        organizationId,
        bookingId,
        status: ParkingEventStatus.COMPLETED,
        checkOutTime: { not: null },
      },
      orderBy: { checkOutTime: 'desc' },
      select: { checkOutTime: true },
    });

    return lastCompletedEvent?.checkOutTime?.toISOString() ?? null;
  }

  private buildCheckOutResult(
    activeEvent: Parameters<typeof presentParkingEvent>[0],
  ): SecurityGateSearchResult {
    const presentedEvent = presentParkingEvent(activeEvent);

    return {
      action: 'CHECK_OUT',
      actionDisabledReason: null,
      lastCheckOutTime: null,
      booking: {
        id: presentedEvent.bookingId,
        bookingCode: presentedEvent.bookingCode,
        status: BookingStatus.CONFIRMED,
        customerName: presentedEvent.customerName,
        vehicleNumber: presentedEvent.vehicleNumber,
        parkingLotName: presentedEvent.parkingLotName,
        floorName: presentedEvent.floorName,
        slotNumber: presentedEvent.slotNumber,
      },
      parkingEvent: {
        id: presentedEvent.id,
        status: presentedEvent.status,
        checkInTime: presentedEvent.checkInTime.toISOString(),
      },
    };
  }

  private buildCheckInResult(
    booking: Parameters<typeof presentBooking>[0],
    lastCheckOutTime: string | null = null,
  ): SecurityGateSearchResult {
    const presentedBooking = presentBooking(booking);

    return {
      action: 'CHECK_IN',
      actionDisabledReason: null,
      lastCheckOutTime,
      booking: {
        id: presentedBooking.id,
        bookingCode: presentedBooking.bookingCode,
        status: presentedBooking.status,
        customerName: presentedBooking.customerName,
        vehicleNumber: presentedBooking.vehicleNumber,
        parkingLotName: presentedBooking.parkingLotName,
        floorName: presentedBooking.floorName,
        slotNumber: presentedBooking.slotNumber,
      },
      parkingEvent: null,
    };
  }

  private buildNoneResult(
    booking: Parameters<typeof presentBooking>[0],
    lastCheckOutTime: string | null = null,
  ): SecurityGateSearchResult {
    const presentedBooking = presentBooking(booking);

    return {
      action: 'NONE',
      actionDisabledReason: this.getDisabledReason(booking.status, lastCheckOutTime),
      lastCheckOutTime,
      booking: {
        id: presentedBooking.id,
        bookingCode: presentedBooking.bookingCode,
        status: presentedBooking.status,
        customerName: presentedBooking.customerName,
        vehicleNumber: presentedBooking.vehicleNumber,
        parkingLotName: presentedBooking.parkingLotName,
        floorName: presentedBooking.floorName,
        slotNumber: presentedBooking.slotNumber,
      },
      parkingEvent: null,
    };
  }

  private isBookingReferenceSearch(searchTerm: string, bookingIdFromLabel: number | null) {
    return bookingIdFromLabel !== null || searchTerm.startsWith('BK-');
  }

  private buildBookingSearchFilters(searchTerm: string, bookingIdFromLabel: number | null) {
    return [
      { bookingCode: searchTerm },
      {
        vehicle: {
          vehicleNumber: searchTerm,
        },
      },
      ...(bookingIdFromLabel ? [{ id: bookingIdFromLabel }] : []),
    ];
  }

  private normalizeGateSearchQuery(query: string) {
    let normalized = query.trim();

    while (normalized.endsWith(')')) {
      normalized = normalized.slice(0, -1).trimEnd();
    }

    return normalized;
  }

  private parseBookingNo(query: string) {
    const match = query.match(BOOKING_NO_PATTERN);

    if (!match) {
      return null;
    }

    const bookingId = Number(match[1]);

    return Number.isInteger(bookingId) && bookingId > 0 ? bookingId : null;
  }

  private getDisabledReason(status: BookingStatus, lastCheckOutTime: string | null) {
    switch (status) {
      case BookingStatus.CANCELLED:
        return 'This booking was cancelled.';
      case BookingStatus.COMPLETED:
        return lastCheckOutTime
          ? 'Already checked out. Slot is not available for check-in right now.'
          : 'Already checked out.';
      case BookingStatus.EXPIRED:
        return 'This booking has expired.';
      case BookingStatus.PENDING:
        return 'This booking is not confirmed yet.';
      case BookingStatus.CONFIRMED:
        return 'Assigned slot is not available right now.';
      default:
        return 'No gate action is available for this booking.';
    }
  }

}