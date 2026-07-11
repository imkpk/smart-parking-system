import { Injectable, NotFoundException } from '@nestjs/common';
import { VehicleCredentialStatus, VehicleCredentialType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AccessPolicyService } from '../../common/access-policy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../../users/types/safe-user.type';
import { CreateVehicleAccessCredentialDto } from '../dto/create-vehicle-access-credential.dto';
import { CreateRfidAccessCredentialDto } from '../dto/create-rfid-access-credential.dto';
import { buildDisplaySuffix, hashIdentifier } from '../iot-identifier.util';
import { resolveIotConfig } from '../iot.config';

const credentialSelect = {
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
} as const;

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
      select: credentialSelect,
    });
  }

  findByVehicle(vehicleId: number, currentUser: SafeUser) {
    return this.findAll(currentUser, vehicleId);
  }

  async create(currentUser: SafeUser, dto: CreateVehicleAccessCredentialDto) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.assertVehicleBelongsToOrganization(organizationId, dto.vehicleId);

    return this.createCredential({
      organizationId,
      vehicleId: dto.vehicleId,
      credentialType: dto.credentialType,
      rawIdentifier: dto.rawIdentifier,
      validUntil: dto.validUntil,
      createdByUserId: currentUser.id,
    });
  }

  async createRfid(
    vehicleId: number,
    currentUser: SafeUser,
    dto: CreateRfidAccessCredentialDto,
  ) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.assertVehicleBelongsToOrganization(organizationId, vehicleId);

    return this.createCredential({
      organizationId,
      vehicleId,
      credentialType: VehicleCredentialType.UHF_RFID,
      rawIdentifier: dto.rfidTag,
      validUntil: dto.validUntil,
      createdByUserId: currentUser.id,
    });
  }

  async createQr(vehicleId: number, currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.assertVehicleBelongsToOrganization(organizationId, vehicleId);

    const rawIdentifier = randomBytes(24).toString('base64url');
    const credential = await this.createCredential({
      organizationId,
      vehicleId,
      credentialType: VehicleCredentialType.QR_CODE,
      rawIdentifier,
      createdByUserId: currentUser.id,
    });

    return {
      ...credential,
      qrPayload: rawIdentifier,
      message: 'Store this QR payload securely; it will not be shown again.',
    };
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
      select: credentialSelect,
    });
  }

  async revokeForVehicle(
    vehicleId: number,
    credentialId: number,
    currentUser: SafeUser,
  ) {
    const credential = await this.prisma.vehicleAccessCredential.findFirst({
      where: {
        id: credentialId,
        vehicleId,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
    });

    if (!credential) {
      throw new NotFoundException('Vehicle access credential not found');
    }

    return this.revoke(credentialId, currentUser);
  }

  private async createCredential(input: {
    organizationId: number;
    vehicleId: number;
    credentialType: VehicleCredentialType;
    rawIdentifier: string;
    validUntil?: string;
    createdByUserId: number;
  }) {
    const credentialHash = hashIdentifier(input.rawIdentifier, this.config.identifierPepper);
    const displaySuffix = buildDisplaySuffix(input.rawIdentifier);

    return this.prisma.vehicleAccessCredential.create({
      data: {
        organizationId: input.organizationId,
        vehicleId: input.vehicleId,
        credentialType: input.credentialType,
        credentialHash,
        displaySuffix,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        createdByUserId: input.createdByUserId,
      },
      select: credentialSelect,
    });
  }

  private async assertVehicleBelongsToOrganization(
    organizationId: number,
    vehicleId: number,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        organizationId,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
  }
}