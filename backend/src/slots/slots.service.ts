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
import { UpdateSlotStatusDto } from './dto/update-slot-status.dto';

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