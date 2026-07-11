import { Injectable, NotFoundException } from '@nestjs/common';
import { IotDevice, IotDeviceStatus, Prisma } from '@prisma/client';
import { randomBytes, timingSafeEqual } from 'crypto';
import { AccessPolicyService } from '../../common/access-policy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../../users/types/safe-user.type';
import { CreateIotDeviceDto } from '../dto/create-iot-device.dto';
import { UpdateIotDeviceDto } from '../dto/update-iot-device.dto';
import { hashDeviceCredential } from '../iot-identifier.util';
import { resolveIotConfig } from '../iot.config';

@Injectable()
export class IotDevicesService {
  private readonly config = resolveIotConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  findAll(currentUser: SafeUser, gateId?: number) {
    return this.prisma.iotDevice.findMany({
      where: {
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
        ...(gateId ? { gateId } : {}),
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number, currentUser: SafeUser) {
    const device = await this.prisma.iotDevice.findFirst({
      where: {
        id,
        ...this.accessPolicy.buildOrganizationWhere(currentUser),
      },
    });

    if (!device) {
      throw new NotFoundException('IoT device not found');
    }

    return this.presentDevice(device);
  }

  async create(currentUser: SafeUser, dto: CreateIotDeviceDto) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.assertGateBelongsToOrganization(organizationId, dto.gateId);

    const created = await this.prisma.iotDevice.create({
      data: {
        organizationId,
        gateId: dto.gateId,
        externalDeviceId: dto.externalDeviceId,
        name: dto.name,
        deviceType: dto.deviceType,
        isEnabled: dto.isEnabled ?? true,
        firmwareVersion: dto.firmwareVersion,
        metadata: dto.metadata,
      },
    });

    return this.presentDevice(created);
  }

  async update(id: number, currentUser: SafeUser, dto: UpdateIotDeviceDto) {
    await this.findOne(id, currentUser);

    const data: Prisma.IotDeviceUpdateInput = { ...dto };

    if (dto.gateId !== undefined) {
      const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
      await this.assertGateBelongsToOrganization(organizationId, dto.gateId);
      data.gate = { connect: { id: dto.gateId } };
      delete (data as { gateId?: number }).gateId;
    }

    const updated = await this.prisma.iotDevice.update({
      where: { id },
      data,
    });

    return this.presentDevice(updated);
  }

  async disable(id: number, currentUser: SafeUser) {
    await this.findOne(id, currentUser);

    const updated = await this.prisma.iotDevice.update({
      where: { id },
      data: {
        isEnabled: false,
        status: IotDeviceStatus.DISABLED,
      },
    });

    return this.presentDevice(updated);
  }

  async rotateCredential(id: number, currentUser: SafeUser) {
    const device = await this.findOne(id, currentUser);
    const rawCredential = randomBytes(32).toString('base64url');
    const credentialHash = hashDeviceCredential(
      rawCredential,
      this.config.deviceCredentialPepper,
    );

    await this.prisma.iotDevice.update({
      where: { id: device.id },
      data: {
        credentialHash,
      },
    });

    return {
      deviceId: device.id,
      externalDeviceId: device.externalDeviceId,
      credential: rawCredential,
      message: 'Store this credential securely; it will not be shown again.',
    };
  }

  async findByExternalDeviceId(organizationId: number, externalDeviceId: string) {
    return this.prisma.iotDevice.findFirst({
      where: {
        organizationId,
        externalDeviceId,
      },
      include: {
        gate: true,
      },
    });
  }

  verifyDeviceCredential(device: IotDevice, rawCredential: string): boolean {
    if (!device.credentialHash) {
      return false;
    }

    const candidate = hashDeviceCredential(
      rawCredential,
      this.config.deviceCredentialPepper,
    );

    const expected = Buffer.from(device.credentialHash, 'utf8');
    const actual = Buffer.from(candidate, 'utf8');

    if (expected.length !== actual.length) {
      return false;
    }

    return timingSafeEqual(expected, actual);
  }

  async recordHeartbeat(input: {
    organizationId: number;
    externalDeviceId: string;
    firmwareVersion?: string;
    status?: IotDeviceStatus;
  }) {
    const device = await this.findByExternalDeviceId(
      input.organizationId,
      input.externalDeviceId,
    );

    if (!device || !device.isEnabled) {
      return null;
    }

    return this.prisma.iotDevice.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        status: input.status ?? IotDeviceStatus.ONLINE,
        firmwareVersion: input.firmwareVersion ?? device.firmwareVersion,
      },
    });
  }

  private presentDevice(device: IotDevice) {
    const { credentialHash: _credentialHash, ...safeDevice } = device;
    return safeDevice;
  }

  private async assertGateBelongsToOrganization(organizationId: number, gateId: number) {
    const gate = await this.prisma.gate.findFirst({
      where: {
        id: gateId,
        organizationId,
      },
    });

    if (!gate) {
      throw new NotFoundException('Gate not found');
    }
  }
}