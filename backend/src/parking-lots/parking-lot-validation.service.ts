import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ParkingLotValidationService {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: Prisma.TransactionClient): PrismaClient {
    return tx ?? this.prisma;
  }

  async getActiveParkingLotOrThrow(
    parkingLotId: number,
    tx?: Prisma.TransactionClient,
  ) {
    const client = this.getClient(tx);
    const parkingLot = await client.parkingLot.findFirst({
      where: { id: parkingLotId, isActive: true },
    });

    if (!parkingLot) {
      throw new NotFoundException('Parking lot not found');
    }

    return parkingLot;
  }

  async getActiveFloorOrThrow(floorId: number, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    const floor = await client.floor.findFirst({
      where: {
        id: floorId,
        parkingLot: { isActive: true },
      },
    });

    if (!floor) {
      throw new NotFoundException('Floor not found');
    }

    return floor;
  }

  async getActiveSlotOrThrow(slotId: number, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    const slot = await client.slot.findFirst({
      where: {
        id: slotId,
        floor: { parkingLot: { isActive: true } },
      },
      include: {
        floor: {
          include: {
            parkingLot: true,
          },
        },
      },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    return slot;
  }
}