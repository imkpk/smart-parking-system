import { Injectable, NotFoundException } from '@nestjs/common';
import { GateCommandStatus, IotDeviceStatus } from '@prisma/client';
import { AccessPolicyService } from '../../common/access-policy.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeUser } from '../../users/types/safe-user.type';
import { GateMonitoringQueryDto } from '../dto/gate-monitoring-query.dto';

@Injectable()
export class GateMonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessPolicy: AccessPolicyService,
  ) {}

  async getGateHealth(gateId: number, currentUser: SafeUser) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    const gate = await this.prisma.gate.findFirst({
      where: {
        id: gateId,
        organizationId,
      },
      include: {
        devices: true,
      },
    });

    if (!gate) {
      throw new NotFoundException('Gate not found');
    }

    const onlineDevices = gate.devices.filter(
      (device) => device.status === IotDeviceStatus.ONLINE && device.isEnabled,
    ).length;

    const pendingCommands = await this.prisma.gateCommand.count({
      where: {
        gateId,
        organizationId,
        status: {
          in: [
            GateCommandStatus.PENDING,
            GateCommandStatus.PUBLISHED,
            GateCommandStatus.ACKNOWLEDGED,
          ],
        },
      },
    });

    const recentDenied = await this.prisma.gateAccessAttempt.count({
      where: {
        gateId,
        organizationId,
        decision: 'DENIED',
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    return {
      gateId: gate.id,
      gateName: gate.name,
      isActive: gate.isActive,
      autoOpenEnabled: gate.autoOpenEnabled,
      deviceCount: gate.devices.length,
      onlineDevices,
      pendingCommands,
      deniedAttemptsLastHour: recentDenied,
      devices: gate.devices.map((device) => ({
        id: device.id,
        externalDeviceId: device.externalDeviceId,
        name: device.name,
        deviceType: device.deviceType,
        status: device.status,
        isEnabled: device.isEnabled,
        lastSeenAt: device.lastSeenAt,
      })),
    };
  }

  async listAttempts(gateId: number, currentUser: SafeUser, query: GateMonitoringQueryDto) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.assertGateExists(gateId, organizationId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.gateAccessAttempt.findMany({
        where: {
          gateId,
          organizationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.gateAccessAttempt.count({
        where: {
          gateId,
          organizationId,
        },
      }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async listCommands(gateId: number, currentUser: SafeUser, query: GateMonitoringQueryDto) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);
    await this.assertGateExists(gateId, organizationId);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.gateCommand.findMany({
        where: {
          gateId,
          organizationId,
        },
        orderBy: {
          requestedAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      this.prisma.gateCommand.count({
        where: {
          gateId,
          organizationId,
        },
      }),
    ]);

    return {
      items,
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getRecentActivity(currentUser: SafeUser, limit = 20) {
    const organizationId = this.accessPolicy.getRequiredOrganizationId(currentUser);

    const [attempts, commands] = await Promise.all([
      this.prisma.gateAccessAttempt.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.gateCommand.findMany({
        where: { organizationId },
        orderBy: { requestedAt: 'desc' },
        take: limit,
      }),
    ]);

    return {
      attempts,
      commands,
    };
  }

  private async assertGateExists(gateId: number, organizationId: number) {
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