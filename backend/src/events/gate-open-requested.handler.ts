import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OutboxEventType } from '@prisma/client';
import { MqttBridgeService } from '../iot/mqtt/mqtt-bridge.service';
import { GateCommandsService } from '../iot/services/gate-commands.service';
import { EventHandlerRegistry } from './event-handler.registry';

type GateOpenRequestedPayload = {
  organizationId: number;
  gateId: number;
  commandId: string;
  controllerDeviceId: number;
  externalDeviceId: string;
  action: 'OPEN';
  expiresAt: string;
};

@Injectable()
export class GateOpenRequestedHandler implements OnModuleInit {
  private readonly logger = new Logger(GateOpenRequestedHandler.name);

  constructor(
    private readonly handlerRegistry: EventHandlerRegistry,
    private readonly mqttBridgeService: MqttBridgeService,
    private readonly gateCommandsService: GateCommandsService,
  ) {}

  onModuleInit(): void {
    this.handlerRegistry.register(OutboxEventType.GATE_OPEN_REQUESTED, async (event) => {
      const payload = event.payload as GateOpenRequestedPayload | null;

      if (!payload?.commandId || !payload.externalDeviceId) {
        throw new Error('GATE_OPEN_REQUESTED payload is missing command details');
      }

      await this.gateCommandsService.getPublishableCommand(payload.commandId);

      await this.mqttBridgeService.publishOpenCommand({
        organizationId: payload.organizationId,
        externalDeviceId: payload.externalDeviceId,
        command: {
          commandId: payload.commandId,
          action: payload.action,
          expiresAt: payload.expiresAt,
        },
      });

      await this.gateCommandsService.markCommandPublished(payload.commandId);

      this.logger.debug(
        `Published gate open command ${payload.commandId} for gate ${payload.gateId}`,
      );
    });
  }
}