import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessPolicyService } from '../common/access-policy.service';
import { ParkingLotValidationService } from '../parking-lots/parking-lot-validation.service';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';

const FLOOR_UNIQUE_MESSAGES = {
  'parkingLotId,name': 'Floor already exists',
  name: 'Floor already exists',
};

@Injectable()
export class FloorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingLotValidationService: ParkingLotValidationService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async create(
    parkingLotId: number,
    currentUser: SafeUser,
    createFloorDto: CreateFloorDto,
  ) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.parkingLotValidationService.getActiveParkingLotOrThrow(
          parkingLotId,
          organizationId,
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

  async findByParkingLot(parkingLotId: number, currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.parkingLotValidationService.getActiveParkingLotOrThrow(
      parkingLotId,
      organizationId,
    );

    return this.prisma.floor.findMany({
      where: {
        parkingLotId,
        parkingLot: { organizationId },
      },
      orderBy: [{ level: 'asc' }, { id: 'asc' }],
    });
  }

  async update(id: number, currentUser: SafeUser, updateFloorDto: UpdateFloorDto) {
    await this.findOne(id, currentUser);

    try {
      return await this.prisma.floor.update({
        where: { id },
        data: updateFloorDto,
      });
    } catch (error) {
      handlePrismaUniqueConstraint(error, FLOOR_UNIQUE_MESSAGES, 'Floor already exists');
    }
  }

  async remove(id: number, currentUser: SafeUser) {
    await this.findOne(id, currentUser);

    return this.prisma.floor.delete({
      where: { id },
    });
  }

  private async findOne(id: number, currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    const floor = await this.prisma.floor.findFirst({
      where: {
        id,
        parkingLot: { organizationId },
      },
    });

    if (!floor) {
      throw new NotFoundException('Floor not found');
    }

    return floor;
  }
}