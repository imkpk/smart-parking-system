import { Injectable } from '@nestjs/common';
import { AccessPolicyService } from '../common/access-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateParkingLotDto } from './dto/create-parking-lot.dto';
import { UpdateParkingLotDto } from './dto/update-parking-lot.dto';
import { ParkingLotValidationService } from './parking-lot-validation.service';

@Injectable()
export class ParkingLotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parkingLotValidationService: ParkingLotValidationService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  create(currentUser: SafeUser, createParkingLotDto: CreateParkingLotDto) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    return this.prisma.parkingLot.create({
      data: {
        ...createParkingLotDto,
        organization: { connect: { id: organizationId } },
      },
    });
  }

  findAll(currentUser: SafeUser) {
    return this.prisma.parkingLot.findMany({
      where: {
        isActive: true,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
      orderBy: { id: 'asc' },
    });
  }

  findOne(id: number, currentUser: SafeUser) {
    return this.parkingLotValidationService.getActiveParkingLotOrThrow(
      id,
      this.accessPolicy.getRequiredOrganizationId(currentUser),
    );
  }

  async update(
    id: number,
    currentUser: SafeUser,
    updateParkingLotDto: UpdateParkingLotDto,
  ) {
    await this.findOne(id, currentUser);

    return this.prisma.parkingLot.update({
      where: { id },
      data: updateParkingLotDto,
    });
  }

  async remove(id: number, currentUser: SafeUser) {
    await this.findOne(id, currentUser);

    return this.prisma.parkingLot.update({
      where: { id },
      data: { isActive: false },
    });
  }
}