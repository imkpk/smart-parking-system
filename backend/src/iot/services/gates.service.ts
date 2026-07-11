import { Injectable, NotFoundException } from '@nestjs/common';
import { GateDirection, Prisma } from '@prisma/client';
import { AccessPolicyService } from '../../common/access-policy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../../users/types/safe-user.type';
import { CreateGateDto } from '../dto/create-gate.dto';
import { UpdateGateDto } from '../dto/update-gate.dto';

@Injectable()
export class GatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  findAll(currentUser: SafeUser) {
    return this.prisma.gate.findMany({
      where: this.accessPolicy.buildOrganizationWhere(currentUser),
      include: {
        parkingLot: {
          select: {
            id: true,
            name: true,
          },
        },
        devices: {
          select: {
            id: true,
            externalDeviceId: true,
            name: true,
            deviceType: true,
            status: true,
            isEnabled: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, currentUser: SafeUser) {
    const gate = await this.prisma.gate.findFirst({
      where: {
        id,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
      include: {
        parkingLot: {
          select: {
            id: true,
            name: true,
          },
        },
        devices: true,
      },
    });

    if (!gate) {
      throw new NotFoundException('Gate not found');
    }

    return gate;
  }

  async create(currentUser: SafeUser, dto: CreateGateDto) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    await this.assertParkingLotBelongsToOrganization(organizationId, dto.parkingLotId);

    return this.prisma.gate.create({
      data: {
        organizationId,
        parkingLotId: dto.parkingLotId,
        externalId: dto.externalId,
        name: dto.name,
        direction: dto.direction ?? GateDirection.ENTRY,
        isActive: dto.isActive ?? true,
        autoOpenEnabled: dto.autoOpenEnabled ?? true,
        anprConfidenceThreshold: dto.anprConfidenceThreshold ?? 0.85,
        duplicateWindowSeconds: dto.duplicateWindowSeconds ?? 30,
        commandTtlSeconds: dto.commandTtlSeconds ?? 15,
      },
    });
  }

  async update(id: number, currentUser: SafeUser, dto: UpdateGateDto) {
    await this.findOne(id, currentUser);

    const data: Prisma.GateUpdateInput = { ...dto };

    if (dto.parkingLotId !== undefined) {
      const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
      await this.assertParkingLotBelongsToOrganization(organizationId, dto.parkingLotId);
      data.parkingLot = { connect: { id: dto.parkingLotId } };
      delete (data as { parkingLotId?: number }).parkingLotId;
    }

    return this.prisma.gate.update({
      where: { id },
      data,
    });
  }

  async remove(id: number, currentUser: SafeUser) {
    await this.findOne(id, currentUser);

    return this.prisma.gate.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }

  private async assertParkingLotBelongsToOrganization(
    organizationId: number,
    parkingLotId: number,
  ) {
    const parkingLot = await this.prisma.parkingLot.findFirst({
      where: {
        id: parkingLotId,
        organizationId,
        isActive: true,
      },
    });

    if (!parkingLot) {
      throw new NotFoundException('Parking lot not found');
    }
  }
}