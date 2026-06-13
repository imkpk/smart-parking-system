import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

@Injectable()
export class FloorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(parkingLotId: number, createFloorDto: CreateFloorDto) {
    return this.prisma.$transaction(async (tx) => {
      const parkingLot = await tx.parkingLot.findFirst({
        where: { id: parkingLotId, isActive: true },
      });

      if (!parkingLot) {
        throw new NotFoundException('Parking lot not found');
      }

      return tx.floor.create({
        data: {
          ...createFloorDto,
          parkingLotId,
        },
      });
    });
  }

  async findByParkingLot(parkingLotId: number) {
    const parkingLot = await this.prisma.parkingLot.findFirst({
      where: { id: parkingLotId, isActive: true },
    });

    if (!parkingLot) {
      throw new NotFoundException('Parking lot not found');
    }

    return this.prisma.floor.findMany({
      where: { parkingLotId },
      orderBy: [{ level: 'asc' }, { id: 'asc' }],
    });
  }

  async update(id: number, updateFloorDto: UpdateFloorDto) {
    await this.findOne(id);

    return this.prisma.floor.update({
      where: { id },
      data: updateFloorDto,
    });
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
