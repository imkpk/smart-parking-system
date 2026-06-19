import { BadRequestException, Injectable } from '@nestjs/common';
import { BookingStatus, ParkingEventStatus, Prisma, SlotStatus } from '@prisma/client';
import { bookingListInclude, presentBooking } from '../bookings/booking.presenter';
import { AccessPolicyService } from '../common/access-policy.service';
import { parkingEventListInclude } from '../parking-events/parking-event.presenter';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import {
  buildPhoneSearchVariants,
  formatGateBookingNo,
  formatGateSessionNo,
  isBookingReferenceSearch,
  isPhoneSearchQuery,
  normalizePhoneSearchQuery,
  parseBookingNo,
  stripTrailingParens,
} from './security-gate-search.util';
import {
  SecurityGateAction,
  SecurityGateMatchItem,
  SecurityGateRecentVisit,
  SecurityGateSearchResponse,
  SecurityGateSingleResult,
  VehicleVisitActivity,
} from './security-gate.types';

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
  slot: { id: number; status: SlotStatus };
  user: { phone: string | null };
};

type ResolvedGateAction = {
  action: SecurityGateAction;
  actionDisabledReason: string | null;
  lastCheckOutTime: string | null;
  booking: GateBooking;
  parkingEvent: {
    id: number;
    status: ParkingEventStatus;
    checkInTime: Date;
  } | null;
};

@Injectable()
export class SecurityGateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async search(query: string, currentUser: SafeUser): Promise<SecurityGateSearchResponse | null> {
    const normalizedQuery = stripTrailingParens(query);

    if (!normalizedQuery) {
      throw new BadRequestException('Search query is required');
    }

    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const bookingIdFromLabel = parseBookingNo(normalizedQuery.toUpperCase());
    const searchTerm = normalizedQuery.toUpperCase();

    if (isBookingReferenceSearch(searchTerm, bookingIdFromLabel)) {
      const resolved = await this.resolveBookingGateAction(
        organizationId,
        searchTerm,
        bookingIdFromLabel,
      );

      return resolved ? this.toSingleResult(organizationId, resolved) : null;
    }

    if (isPhoneSearchQuery(normalizedQuery)) {
      return this.resolvePhoneGateAction(organizationId, normalizedQuery);
    }

    const resolved = await this.resolveVehicleGateAction(organizationId, searchTerm);

    return resolved ? this.toSingleResult(organizationId, resolved) : null;
  }

  private async resolvePhoneGateAction(organizationId: number, query: string) {
    const normalizedPhone = normalizePhoneSearchQuery(query);

    if (!normalizedPhone) {
      return null;
    }

    const phoneVariants = buildPhoneSearchVariants(normalizedPhone);
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        phone: { in: phoneVariants },
      },
      select: { id: true },
    });

    if (users.length === 0) {
      return null;
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        organizationId,
        userId: { in: users.map((user) => user.id) },
        status: {
          in: [
            BookingStatus.CONFIRMED,
            BookingStatus.COMPLETED,
            BookingStatus.PENDING,
            BookingStatus.EXPIRED,
          ],
        },
      },
      orderBy: { id: 'desc' },
      include: gateBookingInclude,
    });

    if (bookings.length === 0) {
      return null;
    }

    const resolvedMatches = (
      await Promise.all(
        bookings.map((booking) => this.resolveBookingGateActionForBooking(organizationId, booking)),
      )
    ).filter((match): match is ResolvedGateAction => match !== null);

    if (resolvedMatches.length === 0) {
      return null;
    }

    const enrichedMatches = await Promise.all(
      resolvedMatches.map((resolved) => this.toMatchItem(organizationId, resolved)),
    );

    if (enrichedMatches.length === 1) {
      return this.toSingleResult(organizationId, resolvedMatches[0]);
    }

    return {
      resultType: 'MULTIPLE_MATCHES' as const,
      matches: enrichedMatches,
    };
  }

  private async resolveBookingGateAction(
    organizationId: number,
    searchTerm: string,
    bookingIdFromLabel: number | null,
  ): Promise<ResolvedGateAction | null> {
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

    return this.resolveBookingGateActionForBooking(organizationId, booking as GateBooking);
  }

  private async resolveBookingGateActionForBooking(
    organizationId: number,
    booking: GateBooking,
  ): Promise<ResolvedGateAction | null> {
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
      return this.buildCheckOutResolved(booking, activeEvent);
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      const eventCount = await this.prisma.parkingEvent.count({
        where: { organizationId, bookingId: booking.id },
      });

      if (eventCount === 0) {
        return this.buildCheckInResolved(booking);
      }
    }

    const returnCheckIn = await this.buildReturnCheckInResolved(booking);

    if (returnCheckIn) {
      return returnCheckIn;
    }

    const lastCheckOutTime = await this.getLastCheckOutTime(organizationId, booking.id);

    return this.buildNoneResolved(booking, lastCheckOutTime);
  }

  private async resolveVehicleGateAction(
    organizationId: number,
    vehicleNumber: string,
  ): Promise<ResolvedGateAction | null> {
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
        const checkoutBooking = await this.loadGateBooking(organizationId, primaryActive.bookingId);

        if (checkoutBooking) {
          return this.buildCheckOutResolved(checkoutBooking, primaryActive);
        }
      }
    }

    const returnSession = await this.findLatestReturnCheckInSession(organizationId, {
      vehicle: { vehicleNumber },
    });

    if (returnSession) {
      return this.buildCheckInResolved(
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
      return this.buildCheckInResolved(firstVisitBooking as GateBooking);
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
      return this.buildNoneResolved(
        latestCompletedSession.booking as GateBooking,
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

    return this.buildNoneResolved(latestBooking as GateBooking, lastCheckOutTime);
  }

  private async toSingleResult(
    organizationId: number,
    resolved: ResolvedGateAction,
  ): Promise<SecurityGateSingleResult> {
    const match = await this.toMatchItem(organizationId, resolved);

    return this.matchItemToSingleResult(match, resolved.parkingEvent);
  }

  private matchItemToSingleResult(
    match: SecurityGateMatchItem,
    parkingEvent: ResolvedGateAction['parkingEvent'] = null,
  ): SecurityGateSingleResult {
    return {
      resultType: 'SINGLE',
      action: match.gateAction,
      actionDisabledReason: match.actionDisabledReason,
      lastCheckOutTime: match.lastCheckOutTime,
      booking: {
        id: match.bookingId,
        bookingCode: match.bookingCode,
        status: match.bookingStatus,
        customerName: match.customerName,
        customerPhone: match.customerPhone,
        vehicleNumber: match.vehicleNumber,
        parkingLotName: match.parkingLotName,
        floorName: match.floorName,
        slotNumber: match.slotNumber,
      },
      parkingEvent: parkingEvent
        ? {
            id: parkingEvent.id,
            status: parkingEvent.status,
            checkInTime: parkingEvent.checkInTime.toISOString(),
          }
        : null,
      vehicleActivity: match.vehicleActivity,
      recentVisits: match.recentVisits,
    };
  }

  private async toMatchItem(
    organizationId: number,
    resolved: ResolvedGateAction,
  ): Promise<SecurityGateMatchItem> {
    const presentedBooking = presentBooking(resolved.booking);
    const vehicleId = resolved.booking.vehicleId;
    const [vehicleActivity, recentVisits] = await Promise.all([
      this.buildVehicleActivity(organizationId, vehicleId),
      this.buildRecentVisits(organizationId, vehicleId),
    ]);

    return {
      bookingNo: formatGateBookingNo(presentedBooking.id),
      bookingId: presentedBooking.id,
      bookingCode: presentedBooking.bookingCode,
      customerName: presentedBooking.customerName,
      customerPhone: resolved.booking.user.phone,
      vehicleNumber: presentedBooking.vehicleNumber,
      parkingLotName: presentedBooking.parkingLotName,
      floorName: presentedBooking.floorName,
      slotNumber: presentedBooking.slotNumber,
      bookingStatus: presentedBooking.status,
      sessionStatus: resolved.parkingEvent?.status ?? null,
      gateAction: resolved.action,
      actionDisabledReason: resolved.actionDisabledReason,
      parkingEventId: resolved.parkingEvent?.id ?? null,
      parkingEventCheckInTime: resolved.parkingEvent?.checkInTime.toISOString() ?? null,
      lastCheckOutTime: resolved.lastCheckOutTime,
      vehicleActivity,
      recentVisits,
    };
  }

  private async buildVehicleActivity(
    organizationId: number,
    vehicleId: number,
  ): Promise<VehicleVisitActivity> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const baseWhere = { organizationId, vehicleId };

    const [
      todayVisits,
      last7DaysVisits,
      last30DaysVisits,
      last365DaysVisits,
      lastVisit,
      lastCheckout,
    ] = await Promise.all([
      this.prisma.parkingEvent.count({
        where: { ...baseWhere, checkInTime: { gte: startOfToday } },
      }),
      this.prisma.parkingEvent.count({
        where: { ...baseWhere, checkInTime: { gte: daysAgo(7) } },
      }),
      this.prisma.parkingEvent.count({
        where: { ...baseWhere, checkInTime: { gte: daysAgo(30) } },
      }),
      this.prisma.parkingEvent.count({
        where: { ...baseWhere, checkInTime: { gte: daysAgo(365) } },
      }),
      this.prisma.parkingEvent.findFirst({
        where: baseWhere,
        orderBy: { checkInTime: 'desc' },
        select: { checkInTime: true },
      }),
      this.prisma.parkingEvent.findFirst({
        where: { ...baseWhere, checkOutTime: { not: null } },
        orderBy: { checkOutTime: 'desc' },
        select: { checkOutTime: true },
      }),
    ]);

    return {
      todayVisits,
      last7DaysVisits,
      last30DaysVisits,
      last365DaysVisits,
      lastVisitAt: lastVisit?.checkInTime.toISOString() ?? null,
      lastCheckoutAt: lastCheckout?.checkOutTime?.toISOString() ?? null,
    };
  }

  private async buildRecentVisits(
    organizationId: number,
    vehicleId: number,
  ): Promise<SecurityGateRecentVisit[]> {
    const events = await this.prisma.parkingEvent.findMany({
      where: { organizationId, vehicleId },
      orderBy: { checkInTime: 'desc' },
      take: 5,
      include: {
        parkingLot: { select: { name: true } },
        slot: { select: { slotNumber: true } },
      },
    });

    return events.map((event) => ({
      sessionNo: formatGateSessionNo(event.id),
      parkingLotName: event.parkingLot.name,
      slotNumber: event.slot.slotNumber,
      checkInTime: event.checkInTime.toISOString(),
      checkOutTime: event.checkOutTime?.toISOString() ?? null,
      status: event.status,
    }));
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
          status: BookingStatus.CONFIRMED,
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

  private async buildReturnCheckInResolved(
    booking: GateBooking,
  ): Promise<ResolvedGateAction | null> {
    if (booking.status !== BookingStatus.CONFIRMED) {
      return null;
    }

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

    return this.buildCheckInResolved(booking, completedEvent.checkOutTime.toISOString());
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

  private async loadGateBooking(organizationId: number, bookingId: number) {
    const booking = await this.prisma.booking.findFirst({
      where: { organizationId, id: bookingId },
      include: gateBookingInclude,
    });

    return booking ? (booking as GateBooking) : null;
  }

  private buildCheckOutResolved(
    booking: GateBooking,
    activeEvent: {
      id: number;
      status: ParkingEventStatus;
      checkInTime: Date;
    },
  ): ResolvedGateAction {
    return {
      action: 'CHECK_OUT',
      actionDisabledReason: null,
      lastCheckOutTime: null,
      booking,
      parkingEvent: {
        id: activeEvent.id,
        status: activeEvent.status,
        checkInTime: activeEvent.checkInTime,
      },
    };
  }

  private buildCheckInResolved(
    booking: GateBooking,
    lastCheckOutTime: string | null = null,
  ): ResolvedGateAction {
    return {
      action: 'CHECK_IN',
      actionDisabledReason: null,
      lastCheckOutTime,
      booking,
      parkingEvent: null,
    };
  }

  private buildNoneResolved(
    booking: GateBooking,
    lastCheckOutTime: string | null = null,
  ): ResolvedGateAction {
    return {
      action: 'NONE',
      actionDisabledReason: this.getDisabledReason(booking.status, lastCheckOutTime),
      lastCheckOutTime,
      booking,
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

  private getDisabledReason(status: BookingStatus, lastCheckOutTime: string | null) {
    switch (status) {
      case BookingStatus.CANCELLED:
        return 'This booking was cancelled.';
      case BookingStatus.COMPLETED:
        return 'This booking is completed.';
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