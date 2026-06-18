import { Injectable, NotFoundException } from '@nestjs/common';
import { SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { AccessPolicyService } from '../common/access-policy.service';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { DeleteSlotsDto } from './dto/delete-slots.dto';
import { SlotMapQueryDto } from './dto/slot-map-query.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';
import {
  createEmptyLegend,
  incrementLegend,
  mapSlotToMapItem,
  slotMapBookingInclude,
  slotMapEventInclude,
} from './slot-map.util';
import { SlotMapFloorGroup, SlotMapResponse } from './types/slot-map-response.type';

const SLOT_UNIQUE_MESSAGES = {
  'floorId,slotNumber': 'Slot already exists',
  slotNumber: 'Slot already exists',
};

@Injectable()
export class SlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingLotValidationService: ParkingLotValidationService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async findByParkingLot(parkingLotId: number, currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.parkingLotValidationService.getActiveParkingLotOrThrow(
      parkingLotId,
      organizationId,
    );

    return this.prisma.slot.findMany({
      where: {
        floor: {
          parkingLotId,
          parkingLot: { isActive: true, organizationId },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
  }

  async getSlotMap(
    parkingLotId: number,
    currentUser: SafeUser,
    query: SlotMapQueryDto = {},
  ): Promise<SlotMapResponse> {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const parkingLot = await this.parkingLotValidationService.getActiveParkingLotOrThrow(
      parkingLotId,
      organizationId,
    );

    const floors = await this.prisma.floor.findMany({
      where: {
        parkingLotId,
        parkingLot: { isActive: true, organizationId },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { slots: true } },
      },
    });

    const slots = await this.prisma.slot.findMany({
      where: {
        floor: {
          parkingLotId,
          parkingLot: { isActive: true, organizationId },
          ...(query.floorId ? { id: query.floorId } : {}),
        },
        ...(query.status ? { status: query.status } : {}),
        ...(query.vehicleType ? { slotType: query.vehicleType } : {}),
      },
      include: {
        floor: { select: { id: true, name: true, level: true } },
        bookings: slotMapBookingInclude,
        events: slotMapEventInclude,
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });

    const isUserRole = this.accessPolicy.isUser(currentUser);
    const legend = createEmptyLegend();
    const groupsByFloor = new Map<number, SlotMapFloorGroup>();

    for (const slot of slots) {
      const item = mapSlotToMapItem(slot, currentUser, isUserRole);
      incrementLegend(legend, item.status);

      const existing = groupsByFloor.get(slot.floor.id);

      if (existing) {
        existing.slots.push(item);
        continue;
      }

      groupsByFloor.set(slot.floor.id, {
        floorId: slot.floor.id,
        floorName: slot.floor.name,
        level: slot.floor.level,
        slots: [item],
      });
    }

    const groups = [...groupsByFloor.values()].sort((left, right) => {
      const leftLevel = left.level ?? Number.MAX_SAFE_INTEGER;
      const rightLevel = right.level ?? Number.MAX_SAFE_INTEGER;

      if (leftLevel !== rightLevel) {
        return leftLevel - rightLevel;
      }

      return left.floorName.localeCompare(right.floorName);
    });

    return {
      parkingLot: {
        id: parkingLot.id,
        name: parkingLot.name,
        isActive: parkingLot.isActive,
      },
      floors: floors.map((floor) => ({
        id: floor.id,
        name: floor.name,
        level: floor.level,
        slotCount: floor._count.slots,
      })),
      selectedFloorId: query.floorId ?? null,
      groups,
      legend,
      filters: {
        floorId: query.floorId ?? null,
        status: query.status ?? null,
        vehicleType: query.vehicleType ?? null,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  async findAvailableByParkingLot(
    parkingLotId: number,
    currentUser: SafeUser,
    vehicleType?: VehicleType,
  ) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.parkingLotValidationService.getActiveParkingLotOrThrow(
      parkingLotId,
      organizationId,
    );

    return this.prisma.slot.findMany({
      where: {
        status: SlotStatus.AVAILABLE,
        ...(vehicleType ? { slotType: vehicleType as unknown as SlotType } : {}),
        floor: {
          parkingLotId,
          parkingLot: { isActive: true, organizationId },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
  }

  async create(floorId: number, currentUser: SafeUser, createSlotDto: CreateSlotDto) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.parkingLotValidationService.getActiveFloorOrThrow(
          floorId,
          organizationId,
          tx,
        );

        return tx.slot.create({
          data: {
            ...createSlotDto,
            floorId,
          },
        });
      });
    } catch (error) {
      handlePrismaUniqueConstraint(error, SLOT_UNIQUE_MESSAGES, 'Slot already exists');
    }
  }

  async createBulk(
    floorId: number,
    currentUser: SafeUser,
    createBulkSlotsDto: CreateBulkSlotsDto,
  ) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.parkingLotValidationService.getActiveFloorOrThrow(
          floorId,
          organizationId,
          tx,
        );

        await tx.slot.createMany({
          data: createBulkSlotsDto.slots.map((slot) => ({
            ...slot,
            floorId,
          })),
        });

        return tx.slot.findMany({
          where: {
            floorId,
            slotNumber: {
              in: createBulkSlotsDto.slots.map((slot) => slot.slotNumber),
            },
          },
          orderBy: { slotNumber: 'asc' },
        });
      });
    } catch (error) {
      handlePrismaUniqueConstraint(error, SLOT_UNIQUE_MESSAGES, 'Slot already exists');
    }
  }

  async updateStatus(
    id: number,
    currentUser: SafeUser,
    updateSlotStatusDto: UpdateSlotStatusDto,
  ) {
    await this.findOne(id, currentUser);

    return this.prisma.slot.update({
      where: { id },
      data: { status: updateSlotStatusDto.status },
    });
  }

  async remove(id: number, currentUser: SafeUser) {
    await this.findOne(id, currentUser);

    return this.prisma.slot.delete({
      where: { id },
    });
  }

  async removeBulk(ids: number[], currentUser: SafeUser) {
    const organizationWhere = this.accessPolicy.buildSlotOrganizationWhere(currentUser);
    const deleted = await this.prisma.slot.deleteMany({
      where: {
        id: { in: ids },
        ...organizationWhere,
      },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('No slots found to delete');
    }

    return deleted;
  }

  private async findOne(id: number, currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const slot = await this.prisma.slot.findFirst({
      where: {
        id,
        floor: { parkingLot: { organizationId } },
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    return slot;
  }
}