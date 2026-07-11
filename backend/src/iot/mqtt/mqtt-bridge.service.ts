import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { IotDeviceStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { GateCommandsService } from '../services/gate-commands.service';
import { GateDetectionProcessorService } from '../services/gate-detection-processor.service';
import { IotDevicesService } from '../services/iot-devices.service';
import { resolveIotConfig } from '../iot.config';
import {
  MQTT_TRANSPORT,
  MqttTransport,
} from './mqtt-transport.interface';
import {
  MqttCommandMessage,
} from './mqtt.types';
import {
  parseMqttCommandAckMessage,
  parseMqttDetectionMessage,
  parseMqttHeartbeatMessage,
  parseMqttTopic,
} from './mqtt-message.validator';

@Injectable()
export class MqttBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttBridgeService.name);
  private readonly config = resolveIotConfig();

  constructor(
    @Inject(MQTT_TRANSPORT) private readonly transport: MqttTransport,
    private readonly detectionProcessor: GateDetectionProcessorService,
    private readonly gateCommandsService: GateCommandsService,
    private readonly iotDevicesService: IotDevicesService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.transport.connect();

    if (!this.config.enabled) {
      this.logger.log('IoT MQTT subscriptions disabled by IOT_ENABLED');
      return;
    }

    const prefix = this.config.mqtt.topicPrefix;
    await this.transport.subscribe(`${prefix}/+/+/detections`, async (topic, payload) => {
      await this.handleDetectionMessage(topic, payload);
    });
    await this.transport.subscribe(`${prefix}/+/+/acks`, async (topic, payload) => {
      await this.handleAckMessage(topic, payload);
    });
    await this.transport.subscribe(`${prefix}/+/+/heartbeat`, async (topic, payload) => {
      await this.handleHeartbeatMessage(topic, payload);
    });

    this.logger.log(`MQTT bridge connected (topicPrefix=${prefix})`);
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await this.transport.disconnect();
  }

  async publishOpenCommand(input: {
    organizationId: number;
    externalDeviceId: string;
    command: MqttCommandMessage;
  }): Promise<void> {
    const topic = this.buildDeviceTopic(
      input.organizationId,
      input.externalDeviceId,
      'commands',
    );

    await this.transport.publish(topic, JSON.stringify(input.command), { qos: 1 });
  }

  private async handleDetectionMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const { organizationId, externalDeviceId } = this.parseTopic(topic);
      const message = parseMqttDetectionMessage(payload);

      await this.detectionProcessor.processDetection({
        organizationId,
        externalDeviceId,
        message,
      });
    } catch (error) {
      this.logger.error(
        'Failed to process MQTT detection message',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async handleAckMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const { organizationId, externalDeviceId } = this.parseTopic(topic);
      const message = parseMqttCommandAckMessage(payload);

      await this.gateCommandsService.handleAck({
        organizationId,
        externalDeviceId,
        ack: message,
      });
    } catch (error) {
      this.logger.error(
        'Failed to process MQTT command ack',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async handleHeartbeatMessage(topic: string, payload: Buffer): Promise<void> {
    try {
      const { organizationId, externalDeviceId } = this.parseTopic(topic);
      const message = parseMqttHeartbeatMessage(payload);

      await this.iotDevicesService.recordHeartbeat({
        organizationId,
        externalDeviceId,
        firmwareVersion: message.firmwareVersion,
        status:
          message.status === 'DEGRADED'
            ? IotDeviceStatus.DEGRADED
            : IotDeviceStatus.ONLINE,
      });
    } catch (error) {
      this.logger.error(
        'Failed to process MQTT heartbeat',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private buildDeviceTopic(
    organizationId: number,
    externalDeviceId: string,
    channel: 'commands' | 'detections' | 'acks' | 'heartbeat',
  ): string {
    return `${this.config.mqtt.topicPrefix}/${organizationId}/${externalDeviceId}/${channel}`;
  }

  private parseTopic(topic: string) {
    return parseMqttTopic(topic, this.config.mqtt.topicPrefix);
  }

  createClientId(): string {
    return `${this.config.mqtt.clientIdPrefix}-${randomUUID()}`;
  }
}