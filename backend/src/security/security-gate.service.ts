import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus, ParkingEventStatus } from '@prisma/client';
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
      include: bookingListInclude,
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

    return this.buildNoneResult(booking);
  }

  private async resolveVehicleGateAction(
    organizationId: number,
    vehicleNumber: string,
  ): Promise<SecurityGateSearchResult | null> {
    const checkInBooking = await this.prisma.booking.findFirst({
      where: {
        organizationId,
        status: BookingStatus.CONFIRMED,
        parkingEvents: { none: {} },
        vehicle: { vehicleNumber },
      },
      orderBy: { id: 'desc' },
      include: bookingListInclude,
    });

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

    if (checkInBooking) {
      return this.buildCheckInResult(checkInBooking);
    }

    const latestBooking = await this.prisma.booking.findFirst({
      where: {
        organizationId,
        vehicle: { vehicleNumber },
      },
      orderBy: { id: 'desc' },
      include: bookingListInclude,
    });

    if (!latestBooking) {
      return null;
    }

    return this.buildNoneResult(latestBooking);
  }

  private buildCheckOutResult(
    activeEvent: Parameters<typeof presentParkingEvent>[0],
  ): SecurityGateSearchResult {
    const presentedEvent = presentParkingEvent(activeEvent);

    return {
      action: 'CHECK_OUT',
      actionDisabledReason: null,
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
  ): SecurityGateSearchResult {
    const presentedBooking = presentBooking(booking);

    return {
      action: 'CHECK_IN',
      actionDisabledReason: null,
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
  ): SecurityGateSearchResult {
    const presentedBooking = presentBooking(booking);

    return {
      action: 'NONE',
      actionDisabledReason: this.getDisabledReason(booking.status),
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

  private getDisabledReason(status: BookingStatus) {
    switch (status) {
      case BookingStatus.CANCELLED:
        return 'This booking was cancelled.';
      case BookingStatus.COMPLETED:
        return 'Already checked out.';
      case BookingStatus.EXPIRED:
        return 'This booking has expired.';
      case BookingStatus.PENDING:
        return 'This booking is not confirmed yet.';
      default:
        return 'No gate action is available for this booking.';
    }
  }

}