import { Injectable } from '@nestjs/common';
import { ParkingEventStatus, SlotStatus } from '@prisma/client';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingLotValidationService: ParkingLotValidationService,
  ) {}

  async getAdminSummary() {
    const [
      totalUsers,
      totalParkingLots,
      totalSlots,
      totalBookings,
      activeParkingEvents,
      completedParkingEvents,
      slotStatusSummary,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.parkingLot.count({ where: { isActive: true } }),
      this.prisma.slot.count(),
      this.prisma.booking.count(),
      this.prisma.parkingEvent.count({
        where: { status: ParkingEventStatus.ACTIVE },
      }),
      this.prisma.parkingEvent.count({
        where: { status: ParkingEventStatus.COMPLETED },
      }),
      this.getSlotStatusCounts(),
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

  async getParkingLotSummary(id: number) {
    const parkingLot = await this.parkingLotValidationService.getActiveParkingLotOrThrow(
      id,
    );

    const todayRange = this.getTodayRange();
    const [
      totalFloors,
      totalSlots,
      slotStatusSummary,
      todayBookings,
      activeEvents,
    ] = await Promise.all([
      this.prisma.floor.count({ where: { parkingLotId: id } }),
      this.prisma.slot.count({
        where: { floor: { parkingLotId: id } },
      }),
      this.getSlotStatusCounts(id),
      this.prisma.booking.count({
        where: {
          parkingLotId: id,
          startTime: todayRange,
        },
      }),
      this.prisma.parkingEvent.count({
        where: {
          parkingLotId: id,
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

  async getRecentEvents() {
    const events = await this.prisma.parkingEvent.findMany({
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

  getTodayBookings() {
    return this.prisma.booking.findMany({
      where: { startTime: this.getTodayRange() },
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

  async getSlotStatusSummary() {
    return this.getSlotStatusCounts();
  }

  private async getSlotStatusCounts(parkingLotId?: number) {
    const groupedStatuses = await this.prisma.slot.groupBy({
      by: ['status'],
      where:
        parkingLotId === undefined
          ? undefined
          : {
              floor: { parkingLotId },
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
