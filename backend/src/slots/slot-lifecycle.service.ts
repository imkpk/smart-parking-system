import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SlotStatus, SlotType, VehicleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SlotLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: Prisma.TransactionClient): PrismaClient {
    return tx ?? this.prisma;
  }

  async validateSlotAvailable(
    slotId: number,
    vehicleType: VehicleType,
    tx?: Prisma.TransactionClient,
  ) {
    const client = this.getClient(tx);
    const slot = await client.slot.findUnique({
      where: { id: slotId },
      include: {
        floor: {
          include: {
            parkingLot: true,
          },
        },
      },
    });

    if (!slot || !slot.floor.parkingLot.isActive) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.status !== SlotStatus.AVAILABLE) {
      throw new ConflictException('Slot is not available');
    }

    if (slot.slotType !== this.toSlotType(vehicleType)) {
      throw new BadRequestException('Slot type does not match vehicle type');
    }

    return slot;
  }

  async reserveSlot(slotId: number, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    const updatedSlots = await client.slot.updateMany({
      where: {
        id: slotId,
        status: SlotStatus.AVAILABLE,
      },
      data: {
        status: SlotStatus.RESERVED,
      },
    });

    if (updatedSlots.count !== 1) {
      throw new ConflictException('Slot is not available');
    }
  }

  async validateSlotReserved(slotId: number, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    const slot = await client.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.status !== SlotStatus.RESERVED) {
      throw new BadRequestException('Booking slot must be RESERVED before check-in');
    }

    return slot;
  }

  async occupySlot(slotId: number, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    const updatedSlots = await client.slot.updateMany({
      where: {
        id: slotId,
        status: SlotStatus.RESERVED,
      },
      data: {
        status: SlotStatus.OCCUPIED,
      },
    });

    if (updatedSlots.count !== 1) {
      throw new ConflictException('Slot is no longer reserved');
    }
  }

  async validateSlotOccupied(slotId: number, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    const slot = await client.slot.findUnique({
      where: { id: slotId },
    });

    if (!slot) {
      throw new NotFoundException('Slot not found');
    }

    if (slot.status !== SlotStatus.OCCUPIED) {
      throw new BadRequestException('Slot must be OCCUPIED');
    }

    return slot;
  }

  async releaseReservedSlot(slotId: number, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    const updatedSlots = await client.slot.updateMany({
      where: {
        id: slotId,
        status: SlotStatus.RESERVED,
      },
      data: {
        status: SlotStatus.AVAILABLE,
      },
    });

    if (updatedSlots.count !== 1) {
      throw new ConflictException('Slot is no longer reserved');
    }
  }

  async releaseOccupiedSlot(slotId: number, tx?: Prisma.TransactionClient) {
    const client = this.getClient(tx);
    const updatedSlots = await client.slot.updateMany({
      where: {
        id: slotId,
        status: SlotStatus.OCCUPIED,
      },
      data: {
        status: SlotStatus.AVAILABLE,
      },
    });

    if (updatedSlots.count !== 1) {
      throw new ConflictException('Slot is no longer occupied');
    }
  }

  private toSlotType(vehicleType: VehicleType): SlotType {
    return vehicleType as unknown as SlotType;
  }
}