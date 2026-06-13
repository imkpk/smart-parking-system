import { Injectable, NotFoundException } from '@nestjs/common';
import { SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBulkSlotsDto } from './dto/create-bulk-slots.dto';
import { CreateSlotDto } from './dto/create-slot.dto';
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByParkingLot(parkingLotId: number) {
    await this.ensureActiveParkingLot(parkingLotId);

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
    await this.ensureActiveParkingLot(parkingLotId);

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
    return this.prisma.$transaction(async (tx) => {
      const floor = await tx.floor.findFirst({
        where: {
          id: floorId,
          parkingLot: { isActive: true },
        },
      });

      if (!floor) {
        throw new NotFoundException('Floor not found');
      }

      return tx.slot.create({
        data: {
          ...createSlotDto,
          floorId,
        },
      });
    });
  }

  async createBulk(floorId: number, createBulkSlotsDto: CreateBulkSlotsDto) {
    return this.prisma.$transaction(async (tx) => {
      const floor = await tx.floor.findFirst({
        where: {
          id: floorId,
          parkingLot: { isActive: true },
        },
      });

      if (!floor) {
        throw new NotFoundException('Floor not found');
      }

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

  private async ensureActiveParkingLot(id: number) {
    const parkingLot = await this.prisma.parkingLot.findFirst({
      where: { id, isActive: true },
    });

    if (!parkingLot) {
      throw new NotFoundException('Parking lot not found');
    }
  }
}
