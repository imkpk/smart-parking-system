import { Injectable } from '@nestjs/common';
import { ParkingEventStatus, SlotStatus } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';

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
}