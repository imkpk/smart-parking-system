import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';

@Injectable()
export class ParkingLotsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createParkingLotDto: CreateParkingLotDto) {
    return this.prisma.parkingLot.create({
      data: createParkingLotDto,
    });
  }

  findAll() {
    return this.prisma.parkingLot.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const parkingLot = await this.prisma.parkingLot.findFirst({
      where: { id, isActive: true },
    });

    if (!parkingLot) {
      throw new NotFoundException('Parking lot not found');
    }

    return parkingLot;
  }

  async update(id: number, updateParkingLotDto: UpdateParkingLotDto) {
    await this.findOne(id);

    return this.prisma.parkingLot.update({
      where: { id },
      data: updateParkingLotDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.parkingLot.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
