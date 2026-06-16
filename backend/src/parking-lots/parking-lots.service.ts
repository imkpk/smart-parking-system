import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLotValidationService } from './parking-lot-validation.service';

@Injectable()
export class ParkingLotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingLotValidationService: ParkingLotValidationService,
  ) {}

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

  findOne(id: number) {
    return this.parkingLotValidationService.getActiveParkingLotOrThrow(id);
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
