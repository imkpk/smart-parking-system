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
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      throw new BadRequestException('Search query is required');
    }

    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const bookingIdFromLabel = this.parseBookingNo(trimmedQuery);
    const searchTerm = trimmedQuery.toUpperCase();
    const activeEvent = await this.prisma.parkingEvent.findFirst({
      where: {
        organizationId,
        status: ParkingEventStatus.ACTIVE,
        OR: this.buildParkingEventSearchFilters(
          searchTerm,
          bookingIdFromLabel,
        ),
      },
      orderBy: { checkInTime: 'desc' },
      include: parkingEventListInclude,
    });

    if (activeEvent) {
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

    const presentedBooking = presentBooking(booking);

    if (booking.status === BookingStatus.CONFIRMED) {
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

  private buildParkingEventSearchFilters(
    searchTerm: string,
    bookingIdFromLabel: number | null,
  ) {
    return [
      {
        booking: {
          bookingCode: searchTerm,
        },
      },
      {
        vehicle: {
          vehicleNumber: searchTerm,
        },
      },
      ...(bookingIdFromLabel ? [{ bookingId: bookingIdFromLabel }] : []),
    ];
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
        return 'This booking is already completed.';
      case BookingStatus.EXPIRED:
        return 'This booking has expired.';
      case BookingStatus.PENDING:
        return 'This booking is not confirmed yet.';
      default:
        return 'No gate action is available for this booking.';
    }
  }

}