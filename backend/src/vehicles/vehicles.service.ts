import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessPolicyService } from '../common/access-policy.service';
import { handlePrismaUniqueConstraint } from '../prisma/prisma-error.util';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

const VEHICLE_UNIQUE_MESSAGES = {
  vehicleNumber: 'Vehicle number already exists',
  registrationNo: 'Vehicle number already exists',
  'organizationId,vehicleNumber': 'Vehicle number already exists',
  'organizationId,registrationNo': 'Vehicle number already exists',
};

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async create(currentUser: SafeUser, createVehicleDto: CreateVehicleDto) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    try {
      return await this.prisma.vehicle.create({
        data: {
          ...createVehicleDto,
          userId: currentUser.id,
          organizationId,
        },
      });
    } catch (error) {
      handlePrismaUniqueConstraint(
        error,
        VEHICLE_UNIQUE_MESSAGES,
        'Vehicle number already exists',
      );
    }
  }

  findMine(currentUser: SafeUser) {
    const organizationWhere = this.accessPolicy.buildOrganizationWhere(currentUser);

    return this.prisma.vehicle.findMany({
      where: {
        userId: currentUser.id,
        ...organizationWhere,
      },
      orderBy: { id: 'asc' },
    });
  }

  findAll(currentUser: SafeUser) {
    return this.prisma.vehicle.findMany({
      where: this.accessPolicy.buildOrganizationWhere(currentUser),
      orderBy: { id: 'asc' },
    });
  }

  async findOneForAdmin(id: number, currentUser: SafeUser) {
    return this.findOne(id, currentUser);
  }

  async update(id: number, currentUser: SafeUser, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id, currentUser);
    this.accessPolicy.assertOwnerOrAdmin(
      currentUser,
      vehicle.userId,
      'You can only manage your own vehicles',
    );

    try {
      return await this.prisma.vehicle.update({
        where: { id },
        data: updateVehicleDto,
      });
    } catch (error) {
      handlePrismaUniqueConstraint(
        error,
        VEHICLE_UNIQUE_MESSAGES,
        'Vehicle number already exists',
      );
    }
  }

  async remove(id: number, currentUser: SafeUser) {
    const vehicle = await this.findOne(id, currentUser);
    this.accessPolicy.assertOwnerOrAdmin(
      currentUser,
      vehicle.userId,
      'You can only manage your own vehicles',
    );

    const bookingCount = await this.prisma.booking.count({
      where: { vehicleId: id },
    });

    if (bookingCount > 0) {
      throw new BadRequestException('Vehicle with bookings cannot be deleted');
    }

    return this.prisma.vehicle.delete({
      where: { id },
    });
  }

  private async findOne(id: number, currentUser: SafeUser) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }
}