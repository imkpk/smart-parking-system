import { Injectable, NotFoundException } from '@nestjs/common';
import { SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';

const SLOT_UNIQUE_MESSAGES = {
  'floorId,slotNumber': 'Slot already exists',
  slotNumber: 'Slot already exists',
};
import { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { DeleteSlotsDto } from './dto/delete-slots.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';

@Injectable()
export class SlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingLotValidationService: ParkingLotValidationService,
  ) {}

  async findByParkingLot(parkingLotId: number) {
    await this.parkingLotValidationService.getActiveParkingLotOrThrow(parkingLotId);

    return this.prisma.slot.findMany({
      where: {
        floor: {
          parkingLotId,
          parkingLot: { isActive: true },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
  }

  async findAvailableByParkingLot(
    parkingLotId: number,
    vehicleType?: VehicleType,
  ) {
    await this.parkingLotValidationService.getActiveParkingLotOrThrow(parkingLotId);

    return this.prisma.slot.findMany({
      where: {
        status: SlotStatus.AVAILABLE,
        ...(vehicleType ? { slotType: vehicleType as unknown as SlotType } : {}),
        floor: {
          parkingLotId,
          parkingLot: { isActive: true },
        },
      },
      orderBy: [{ floorId: 'asc' }, { slotNumber: 'asc' }],
    });
  }

  async create(floorId: number, createSlotDto: CreateSlotDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.parkingLotValidationService.getActiveFloorOrThrow(floorId, tx);

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

  async createBulk(floorId: number, createBulkSlotsDto: CreateBulkSlotsDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.parkingLotValidationService.getActiveFloorOrThrow(floorId, tx);

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

  async updateStatus(id: number, updateSlotStatusDto: UpdateSlotStatusDto) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    return this.prisma.slot.update({
      where: { id },
      data: { status: updateSlotStatusDto.status },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.slot.delete({
      where: { id },
    });
  }

  async removeBulk(ids: number[]) {
    const deleted = await this.prisma.slot.deleteMany({
      where: { id: { in: ids } },
    });

    if (deleted.count === 0) {
      throw new NotFoundException('No slots found to delete');
    }

    return deleted;
  }

  private async findOne(id: number) {
    const slot = await this.prisma.slot.findUnique({
      where: { id },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    return slot;
  }
}