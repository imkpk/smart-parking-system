import { Injectable, NotFoundException } from '@nestjs/common';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';

const FLOOR_UNIQUE_MESSAGES = {
  'parkingLotId,name': 'Floor already exists',
  name: 'Floor already exists',
};
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingLotValidationService: ParkingLotValidationService,
  ) {}

  async create(parkingLotId: number, createFloorDto: CreateFloorDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.parkingLotValidationService.getActiveParkingLotOrThrow(
          parkingLotId,
          tx,
        );

        return tx.floor.create({
          data: {
            ...createFloorDto,
            parkingLotId,
          },
        });
      });
    } catch (error) {
      handlePrismaUniqueConstraint(error, FLOOR_UNIQUE_MESSAGES, 'Floor already exists');
    }
  }

  async findByParkingLot(parkingLotId: number) {
    await this.parkingLotValidationService.getActiveParkingLotOrThrow(parkingLotId);

    return this.prisma.floor.findMany({
      where: { parkingLotId },
      orderBy: [{ level: 'asc' }, { id: 'asc' }],
    });
  }

  async update(id: number, updateFloorDto: UpdateFloorDto) {
    await this.findOne(id);

    try {
      return await this.prisma.floor.update({
        where: { id },
        data: updateFloorDto,
      });
    } catch (error) {
      handlePrismaUniqueConstraint(error, FLOOR_UNIQUE_MESSAGES, 'Floor already exists');
    }
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.floor.delete({
      where: { id },
    });
  }

  private async findOne(id: number) {
    const floor = await this.prisma.floor.findUnique({
      where: { id },
    });

    if (!floor) {
      throw new NotFoundException('Floor not found');
    }

    return floor;
  }
}