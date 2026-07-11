import { Injectable, NotFoundException } from '@nestjs/common';
import { VehicleCredentialStatus, VehicleCredentialType } from '@prisma/client';
import { AccessPolicyService } from '../../common/access-policy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../../users/types/safe-user.type';
import { CreateVehicleAccessCredentialDto } from '../dto/create-vehicle-access-credential.dto';
import { buildDisplaySuffix, hashIdentifier } from '../iot-identifier.util';
import { resolveIotConfig } from '../iot.config';

@Injectable()
export class VehicleAccessCredentialsService {
  private readonly config = resolveIotConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  findAll(currentUser: SafeUser, vehicleId?: number) {
    return this.prisma.vehicleAccessCredential.findMany({
      where: {
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
        ...(vehicleId ? { vehicleId } : {}),
      },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        organizationId: true,
        vehicleId: true,
        credentialType: true,
        displaySuffix: true,
        status: true,
        validFrom: true,
        validUntil: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async create(currentUser: SafeUser, dto: CreateVehicleAccessCredentialDto) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: dto.vehicleId,
        organizationId,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const credentialHash = hashIdentifier(dto.rawIdentifier, this.config.identifierPepper);
    const displaySuffix = buildDisplaySuffix(dto.rawIdentifier);

    return this.prisma.vehicleAccessCredential.create({
      data: {
        organizationId,
        vehicleId: dto.vehicleId,
        credentialType: dto.credentialType,
        credentialHash,
        displaySuffix,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        createdByUserId: currentUser.id,
      },
      select: {
        id: true,
        organizationId: true,
        vehicleId: true,
        credentialType: true,
        displaySuffix: true,
        status: true,
        validFrom: true,
        validUntil: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async revoke(id: number, currentUser: SafeUser) {
    const credential = await this.prisma.vehicleAccessCredential.findFirst({
      where: {
        id,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
    });

    if (!credential) {
      throw new NotFoundException('Vehicle access credential not found');
    }

    return this.prisma.vehicleAccessCredential.update({
      where: { id },
      data: {
        status: VehicleCredentialStatus.REVOKED,
      },
      select: {
        id: true,
        organizationId: true,
        vehicleId: true,
        credentialType: true,
        displaySuffix: true,
        status: true,
        validFrom: true,
        validUntil: true,
        createdByUserId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}