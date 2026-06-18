import { Injectable } from '@nestjs/common';
import {
  BookingStatus,
  ParkingEventStatus,
  Prisma,
  Role,
  SlotStatus,
} from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import {
  buildBookingVolumeSummary,
  buildLotUtilizationItem,
  buildOccupancySummary,
  buildOperatorDashboardMetrics,
  buildParkingEventSummary,
  buildRevenueSummary,
  decimalToNumber,
  mapRecentActivity,
} from './operator-dashboard-metrics.builder';
import {
  RECENT_ACTIVITY_DEFAULT_LIMIT,
  RECENT_ACTIVITY_MAX_LIMIT,
  RecentActivityQueryDto,
} from './dto/recent-activity-query.dto';
import {
  decodeRecentActivityCursor,
  encodeRecentActivityCursor,
} from './recent-activity-cursor';
import { OperatorDashboardMetrics } from './types/operator-dashboard-metrics.type';
import { RecentActivityPage } from './types/recent-activity-page.type';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingLotValidationService: ParkingLotValidationService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async getAdminSummary(currentUser: SafeUser) {
    const organizationWhere = this.accessPolicy.buildOrganizationWhere(currentUser);
    const slotOrganizationWhere = this.accessPolicy.buildSlotOrganizationWhere(currentUser);

    const [
      totalUsers,
      totalParkingLots,
      totalSlots,
      totalBookings,
      activeParkingEvents,
      completedParkingEvents,
      slotStatusSummary,
    ] = await Promise.all([
      this.prisma.user.count({ where: organizationWhere }),
      this.prisma.parkingLot.count({ where: { isActive: true, ...organizationWhere } }),
      this.prisma.slot.count({ where: slotOrganizationWhere }),
      this.prisma.booking.count({ where: organizationWhere }),
      this.prisma.parkingEvent.count({
        where: { status: ParkingEventStatus.ACTIVE, ...organizationWhere },
      }),
      this.prisma.parkingEvent.count({
        where: { status: ParkingEventStatus.COMPLETED, ...organizationWhere },
      }),
      this.getSlotStatusCounts(currentUser),
    ]);

    return {
      totalUsers,
      totalParkingLots,
      totalSlots,
      availableSlots: slotStatusSummary.availableSlots,
      occupiedSlots: slotStatusSummary.occupiedSlots,
      reservedSlots: slotStatusSummary.reservedSlots,
      maintenanceSlots: slotStatusSummary.maintenanceSlots,
      totalBookings,
      activeParkingEvents,
      completedParkingEvents,
    };
  }

  async getParkingLotSummary(id: number, currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const parkingLot = await this.parkingLotValidationService.getActiveParkingLotOrThrow(
      id,
      organizationId,
    );

    const todayRange = this.getTodayRange();
    const [
      totalFloors,
      totalSlots,
      slotStatusSummary,
      todayBookings,
      activeEvents,
    ] = await Promise.all([
      this.prisma.floor.count({
        where: { parkingLotId: id, parkingLot: { organizationId } },
      }),
      this.prisma.slot.count({
        where: {
          floor: { parkingLotId: id, parkingLot: { organizationId } },
        },
      }),
      this.getSlotStatusCounts(currentUser, id),
      this.prisma.booking.count({
        where: {
          parkingLotId: id,
          organizationId,
          startTime: todayRange,
        },
      }),
      this.prisma.parkingEvent.count({
        where: {
          parkingLotId: id,
          organizationId,
          status: ParkingEventStatus.ACTIVE,
        },
      }),
    ]);

    return {
      parkingLotId: parkingLot.id,
      parkingLotName: parkingLot.name,
      totalFloors,
      totalSlots,
      availableSlots: slotStatusSummary.availableSlots,
      occupiedSlots: slotStatusSummary.occupiedSlots,
      reservedSlots: slotStatusSummary.reservedSlots,
      maintenanceSlots: slotStatusSummary.maintenanceSlots,
      todayBookings,
      activeEvents,
    };
  }

  async getRecentEvents(currentUser: SafeUser) {
    const organizationWhere = this.accessPolicy.buildOrganizationWhere(currentUser);
    const events = await this.prisma.parkingEvent.findMany({
      where: organizationWhere,
      orderBy: { checkInTime: 'desc' },
      take: 10,
      include: {
        vehicle: true,
        slot: true,
        parkingLot: true,
      },
    });

    return events.map((event) => ({
      parkingEventId: event.id,
      bookingId: event.bookingId,
      vehicleNumber: event.vehicle.vehicleNumber,
      slotNumber: event.slot.slotNumber,
      parkingLotName: event.parkingLot.name,
      status: event.status,
      checkInTime: event.checkInTime,
      checkOutTime: event.checkOutTime,
      feeAmount: event.feeAmount,
    }));
  }

  getTodayBookings(currentUser: SafeUser) {
    const organizationWhere = this.accessPolicy.buildOrganizationWhere(currentUser);

    return this.prisma.booking.findMany({
      where: {
        ...organizationWhere,
        startTime: this.getTodayRange(),
      },
      orderBy: { startTime: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        vehicle: true,
        slot: true,
        parkingLot: true,
      },
    });
  }

  async getSlotStatusSummary(currentUser: SafeUser) {
    return this.getSlotStatusCounts(currentUser);
  }

  async getRecentActivity(
    currentUser: SafeUser,
    query: RecentActivityQueryDto,
  ): Promise<RecentActivityPage> {
    const limit = this.normalizeRecentActivityLimit(query.limit);
    const cursor = query.cursor ? decodeRecentActivityCursor(query.cursor) : null;
    const where = this.buildRecentActivityWhere(currentUser);
    const cursorFilter = cursor
      ? {
          OR: [
            { checkInTime: { lt: new Date(cursor.checkInTime) } },
            {
              checkInTime: new Date(cursor.checkInTime),
              id: { lt: cursor.id },
            },
          ],
        }
      : {};

    const events = await this.prisma.parkingEvent.findMany({
      where: {
        ...where,
        ...cursorFilter,
      },
      orderBy: [{ checkInTime: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        vehicle: true,
        slot: { include: { floor: true } },
        parkingLot: true,
      },
    });

    const hasMore = events.length > limit;
    const pageEvents = hasMore ? events.slice(0, limit) : events;
    const lastEvent = pageEvents.at(-1);

    return {
      items: mapRecentActivity(pageEvents),
      nextCursor:
        hasMore && lastEvent
          ? encodeRecentActivityCursor({
              checkInTime: lastEvent.checkInTime.toISOString(),
              id: lastEvent.id,
            })
          : null,
      hasMore,
    };
  }

  async getOperatorMetrics(currentUser: SafeUser): Promise<OperatorDashboardMetrics> {
    if (currentUser.role === Role.USER) {
      return this.getUserOperatorMetrics(currentUser);
    }

    if (currentUser.role === Role.SECURITY) {
      return this.getSecurityOperatorMetrics(currentUser);
    }

    if (currentUser.role === Role.SUPER_ADMIN && currentUser.organizationId == null) {
      return this.getPlatformOperatorMetrics(currentUser);
    }

    return this.getTenantOperatorMetrics(currentUser);
  }

  private async getTenantOperatorMetrics(currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const organizationWhere = { organizationId };
    const slotCounts = await this.getSlotStatusCounts(currentUser);
    const occupancy = buildOccupancySummary({
      totalSlots:
        slotCounts.availableSlots +
        slotCounts.occupiedSlots +
        slotCounts.reservedSlots +
        slotCounts.maintenanceSlots,
      ...slotCounts,
    });
    const todayRange = this.getTodayRange();
    const weekRange = this.getWeekRange();
    const monthRange = this.getMonthRange();

    const [
      bookingTotal,
      bookingsToday,
      bookingsThisWeek,
      bookingStatusCounts,
      activeEvents,
      completedEvents,
      checkInsToday,
      checkOutsToday,
      revenueToday,
      revenueWeek,
      revenueMonth,
      parkingLots,
    ] = await Promise.all([
      this.prisma.booking.count({ where: organizationWhere }),
      this.prisma.booking.count({ where: { ...organizationWhere, startTime: todayRange } }),
      this.prisma.booking.count({ where: { ...organizationWhere, startTime: weekRange } }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: organizationWhere,
        _count: { _all: true },
      }),
      this.prisma.parkingEvent.count({
        where: { ...organizationWhere, status: ParkingEventStatus.ACTIVE },
      }),
      this.prisma.parkingEvent.count({
        where: { ...organizationWhere, status: ParkingEventStatus.COMPLETED },
      }),
      this.prisma.parkingEvent.count({
        where: { ...organizationWhere, checkInTime: todayRange },
      }),
      this.prisma.parkingEvent.count({
        where: {
          ...organizationWhere,
          checkOutTime: todayRange,
          status: ParkingEventStatus.COMPLETED,
        },
      }),
      this.sumCompletedFees({ ...organizationWhere, checkOutTime: todayRange }),
      this.sumCompletedFees({ ...organizationWhere, checkOutTime: weekRange }),
      this.sumCompletedFees({ ...organizationWhere, checkOutTime: monthRange }),
      this.prisma.parkingLot.findMany({
        where: { isActive: true, organizationId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const lotUtilization = await Promise.all(
      parkingLots.map(async (lot) => {
        const counts = await this.getSlotStatusCounts(currentUser, lot.id);
        const totalSlots =
          counts.availableSlots +
          counts.occupiedSlots +
          counts.reservedSlots +
          counts.maintenanceSlots;

        return buildLotUtilizationItem(lot.id, lot.name, {
          totalSlots,
          availableSlots: counts.availableSlots,
          occupiedSlots: counts.occupiedSlots,
        });
      }),
    );

    return buildOperatorDashboardMetrics({
      scope: 'TENANT',
      role: currentUser.role,
      organizationName: organization?.name ?? null,
      occupancy,
      bookings: buildBookingVolumeSummary(
        bookingTotal,
        bookingsToday,
        bookingsThisWeek,
        bookingStatusCounts.map((entry) => ({
          status: entry.status,
          count: entry._count._all,
        })),
      ),
      parkingEvents: buildParkingEventSummary(
        activeEvents,
        completedEvents,
        checkInsToday,
        checkOutsToday,
      ),
      revenue: buildRevenueSummary(revenueToday, revenueWeek, revenueMonth),
      lotUtilization,
    });
  }

  private async getSecurityOperatorMetrics(currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const organizationWhere = { organizationId };
    const slotCounts = await this.getSlotStatusCounts(currentUser);
    const occupancy = buildOccupancySummary({
      totalSlots:
        slotCounts.availableSlots +
        slotCounts.occupiedSlots +
        slotCounts.reservedSlots +
        slotCounts.maintenanceSlots,
      ...slotCounts,
    });
    const todayRange = this.getTodayRange();

    const [bookingsToday, activeEvents, checkInsToday, checkOutsToday] = await Promise.all([
        this.prisma.booking.count({ where: { ...organizationWhere, startTime: todayRange } }),
        this.prisma.parkingEvent.count({
          where: { ...organizationWhere, status: ParkingEventStatus.ACTIVE },
        }),
        this.prisma.parkingEvent.count({
          where: { ...organizationWhere, checkInTime: todayRange },
        }),
        this.prisma.parkingEvent.count({
          where: {
            ...organizationWhere,
            checkOutTime: todayRange,
            status: ParkingEventStatus.COMPLETED,
          },
        }),
      ]);

    return buildOperatorDashboardMetrics({
      scope: 'TENANT',
      role: currentUser.role,
      organizationName: organization?.name ?? null,
      occupancy,
      bookings: buildBookingVolumeSummary(bookingsToday, bookingsToday, 0, []),
      parkingEvents: buildParkingEventSummary(activeEvents, 0, checkInsToday, checkOutsToday),
    });
  }

  private async getUserOperatorMetrics(currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true },
    });
    const userWhere = { userId: currentUser.id, organizationId };
    const now = new Date();

    const [totalVehicles, upcomingBookings, activeParkingEvents, completedParkingEvents] =
      await Promise.all([
        this.prisma.vehicle.count({ where: userWhere }),
        this.prisma.booking.count({
          where: {
            ...userWhere,
            status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
            OR: [{ endTime: null }, { endTime: { gte: now } }],
          },
        }),
        this.prisma.parkingEvent.count({
          where: { ...userWhere, status: ParkingEventStatus.ACTIVE },
        }),
        this.prisma.parkingEvent.count({
          where: { ...userWhere, status: ParkingEventStatus.COMPLETED },
        }),
      ]);

    return buildOperatorDashboardMetrics({
      scope: 'USER',
      role: currentUser.role,
      organizationName: organization?.name ?? null,
      userOverview: {
        totalVehicles,
        upcomingBookings,
        activeParkingEvents,
        completedParkingEvents,
      },
    });
  }

  private async getPlatformOperatorMetrics(currentUser: SafeUser) {
    const [
      totalOrganizations,
      totalUsers,
      totalParkingLots,
      totalSlots,
      slotStatusCounts,
      activeEvents,
      completedEvents,
      bookingTotal,
      bookingsToday,
    ] = await Promise.all([
      this.prisma.organization.count({ where: { isActive: true } }),
      this.prisma.user.count(),
      this.prisma.parkingLot.count({ where: { isActive: true } }),
      this.prisma.slot.count(),
      this.prisma.slot.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.parkingEvent.count({ where: { status: ParkingEventStatus.ACTIVE } }),
      this.prisma.parkingEvent.count({ where: { status: ParkingEventStatus.COMPLETED } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { startTime: this.getTodayRange() } }),
    ]);

    const slotCounts = this.mapGroupedSlotStatuses(slotStatusCounts);
    const occupancy = buildOccupancySummary({
      totalSlots,
      ...slotCounts,
    });

    return buildOperatorDashboardMetrics({
      scope: 'PLATFORM',
      role: currentUser.role,
      organizationName: null,
      occupancy,
      bookings: buildBookingVolumeSummary(bookingTotal, bookingsToday, 0, []),
      parkingEvents: buildParkingEventSummary(activeEvents, completedEvents, 0, 0),
      platformOverview: {
        totalOrganizations,
        totalUsers,
        totalParkingLots,
        totalSlots,
      },
    });
  }

  private async sumCompletedFees(where: Prisma.ParkingEventWhereInput) {
    const aggregate = await this.prisma.parkingEvent.aggregate({
      where: {
        ...where,
        status: ParkingEventStatus.COMPLETED,
        feeAmount: { not: null },
      },
      _sum: { feeAmount: true },
    });

    return decimalToNumber(aggregate._sum.feeAmount);
  }

  private mapGroupedSlotStatuses(
    groupedStatuses: Array<{ status: SlotStatus; _count: { _all: number } }>,
  ) {
    const counts = {
      availableSlots: 0,
      occupiedSlots: 0,
      reservedSlots: 0,
      maintenanceSlots: 0,
    };

    for (const groupedStatus of groupedStatuses) {
      const count = groupedStatus._count._all;

      if (groupedStatus.status === SlotStatus.AVAILABLE) {
        counts.availableSlots = count;
      }

      if (groupedStatus.status === SlotStatus.OCCUPIED) {
        counts.occupiedSlots = count;
      }

      if (groupedStatus.status === SlotStatus.RESERVED) {
        counts.reservedSlots = count;
      }

      if (groupedStatus.status === SlotStatus.MAINTENANCE) {
        counts.maintenanceSlots = count;
      }
    }

    return counts;
  }

  private async getSlotStatusCounts(currentUser: SafeUser, parkingLotId?: number) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const groupedStatuses = await this.prisma.slot.groupBy({
      by: ['status'],
      where:
        parkingLotId === undefined
          ? {
              floor: {
                parkingLot: { organizationId },
              },
            }
          : {
              floor: {
                parkingLotId,
                parkingLot: { organizationId },
              },
            },
      _count: {
        _all: true,
      },
    });

    const counts = {
      availableSlots: 0,
      occupiedSlots: 0,
      reservedSlots: 0,
      maintenanceSlots: 0,
    };

    for (const groupedStatus of groupedStatuses) {
      const count = groupedStatus._count._all;

      if (groupedStatus.status === SlotStatus.AVAILABLE) {
        counts.availableSlots = count;
      }

      if (groupedStatus.status === SlotStatus.OCCUPIED) {
        counts.occupiedSlots = count;
      }

      if (groupedStatus.status === SlotStatus.RESERVED) {
        counts.reservedSlots = count;
      }

      if (groupedStatus.status === SlotStatus.MAINTENANCE) {
        counts.maintenanceSlots = count;
      }
    }

    return counts;
  }

  private normalizeRecentActivityLimit(limit: number | undefined) {
    if (limit == null || Number.isNaN(limit)) {
      return RECENT_ACTIVITY_DEFAULT_LIMIT;
    }

    return Math.min(Math.max(Math.trunc(limit), 1), RECENT_ACTIVITY_MAX_LIMIT);
  }

  private buildRecentActivityWhere(currentUser: SafeUser): Prisma.ParkingEventWhereInput {
    if (currentUser.role === Role.USER) {
      return {
        userId: currentUser.id,
        organizationId: this.accessPolicy.getRequiredOrganizationId(currentUser),
      };
    }

    if (currentUser.role === Role.SUPER_ADMIN && currentUser.organizationId == null) {
      return {};
    }

    return this.accessPolicy.buildOrganizationWhere(currentUser);
  }

  private getTodayRange() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    return {
      gte: startOfToday,
      lt: endOfToday,
    };
  }

  private getWeekRange() {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    return {
      gte: start,
      lte: end,
    };
  }

  private getMonthRange() {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();

    return {
      gte: start,
      lte: end,
    };
  }
}