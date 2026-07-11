import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SafeUser } from '../../users/types/safe-user.type';
import { SimulateDetectionDto } from '../dto/simulate-detection.dto';
import { GateDetectionProcessorService } from '../services/gate-detection-processor.service';
import { resolveIotConfig } from '../iot.config';

@Controller('iot/simulator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IotSimulatorController {
  private readonly config = resolveIotConfig();

  constructor(
    private readonly gateDetectionProcessor: GateDetectionProcessorService,
  ) {}

  @Post('detections')
  @Roles(Role.TENANT_ADMIN, Role.ADMIN, Role.SECURITY)
  simulateDetection(
    @CurrentUser() currentUser: SafeUser,
    @Body() dto: SimulateDetectionDto,
  ) {
    if (!this.config.simulatorEnabled || process.env.NODE_ENV === 'production') {
      throw new NotFoundException('IoT simulator is not available');
    }

    const organizationId = currentUser.organizationId;
    if (organizationId == null) {
      throw new ForbiddenException('Organization context is required');
    }

    return this.gateDetectionProcessor.processDetection({
      organizationId,
      externalDeviceId: dto.externalDeviceId,
      message: {
        messageId: dto.messageId,
        identifierType: dto.identifierType,
        identifier: dto.identifier,
        confidence: dto.confidence,
        occurredAt: dto.occurredAt ?? new Date().toISOString(),
        deviceAuth: dto.deviceAuth,
      },
    });
  }
}