import { Body, Controller, Post } from '@nestjs/common';
import { SimulateDetectionDto } from '../dto/simulate-detection.dto';
import { GateDetectionProcessorService } from '../services/gate-detection-processor.service';
import { resolveIotConfig } from '../iot.config';

@Controller('iot/simulator')
export class IotSimulatorController {
  private readonly config = resolveIotConfig();

  constructor(
    private readonly gateDetectionProcessor: GateDetectionProcessorService,
  ) {}

  @Post('detections')
  simulateDetection(@Body() dto: SimulateDetectionDto) {
    if (!this.config.simulatorEnabled || process.env.NODE_ENV === 'production') {
      return {
        enabled: false,
        message: 'IoT simulator is disabled',
      };
    }

    return this.gateDetectionProcessor.processDetection({
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