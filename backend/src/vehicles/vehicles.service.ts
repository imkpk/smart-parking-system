import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccessPolicyService } from '../common/access-policy.service';
import { PrismaService } from '../prisma/prisma.service';
import { SafeUser } from '../users/types/safe-user.type';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  create(userId: number, createVehicleDto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        ...createVehicleDto,
        userId,
      },
    });
  }

  findMine(userId: number) {
    return this.prisma.vehicle.findMany({
      where: { userId },
      orderBy: { id: 'asc' },
    });
  }

  findAll() {
    return this.prisma.vehicle.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async findOneForAdmin(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async update(id: number, currentUser: SafeUser, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.findOne(id);
    this.accessPolicy.assertOwnerOrAdmin(
      currentUser,
      vehicle.userId,
      'You can only manage your own vehicles',
    );

    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });
  }

  async remove(id: number, currentUser: SafeUser) {
    const vehicle = await this.findOne(id);
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

  private async findOne(id: number) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }
}