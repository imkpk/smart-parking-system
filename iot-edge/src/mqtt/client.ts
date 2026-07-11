import mqtt, { type MqttClient } from 'mqtt';

import type { Config } from '../config.js';
import {
  commandAckTopic,
  commandsTopic,
  detectionsTopic,
  statusTopic,
  type CommandAckMessage,
  type DetectionMessage,
  type EdgeContext,
  type StatusMessage,
} from '../contracts/messages.js';

export type CommandHandler = (topic: string, payload: Buffer) => Promise<void>;

export class EdgeMqttClient {
  private client: MqttClient | null = null;
  private connected = false;
  private reconnectAttempt = 0;
  private commandHandler: CommandHandler | null = null;

  constructor(
    private readonly config: Config,
    private readonly ctx: EdgeContext,
  ) {}

  isConnected(): boolean {
    return this.connected;
  }

  async connect(onCommand: CommandHandler): Promise<void> {
    this.commandHandler = onCommand;

    if (this.client) {
      return;
    }

    const { mqtt: mqttConfig } = this.config;

    this.client = mqtt.connect(mqttConfig.brokerUrl, {
      clientId: mqttConfig.clientId,
      username: mqttConfig.username,
      password: mqttConfig.password,
      reconnectPeriod: 0,
      clean: true,
    });

    this.client.on('connect', () => {
      this.connected = true;
      this.reconnectAttempt = 0;
      this.subscribeCommands().catch((error) => {
        console.error('[mqtt] failed to subscribe to commands', error);
      });
    });

    this.client.on('close', () => {
      this.connected = false;
      this.scheduleReconnect();
    });

    this.client.on('error', (error) => {
      console.error('[mqtt] connection error', error.message);
    });

    this.client.on('message', (topic, payload) => {
      if (!this.commandHandler) {
        return;
      }

      void this.commandHandler(topic, payload).catch((error) => {
        console.error('[mqtt] command handler failed', error);
      });
    });
  }

  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.client?.end(false, {}, () => resolve());
    });

    this.client = null;
    this.connected = false;
  }

  async publishDetection(message: DetectionMessage): Promise<void> {
    await this.publish(detectionsTopic(this.ctx), message);
  }

  async publishCommandAck(message: CommandAckMessage): Promise<void> {
    await this.publish(commandAckTopic(this.ctx), message);
  }

  async publishStatus(message: StatusMessage): Promise<void> {
    await this.publish(statusTopic(this.ctx), message);
  }

  private async subscribeCommands(): Promise<void> {
    const topic = commandsTopic(this.ctx);
    await this.subscribe(topic);
    console.info(`[mqtt] subscribed to ${topic}`);
  }

  private subscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        reject(new Error('MQTT client is not initialized'));
        return;
      }

      this.client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private publish(topic: string, payload: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.connected) {
        reject(new Error('MQTT client is not connected'));
        return;
      }

      this.client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private scheduleReconnect(): void {
    if (!this.client || !this.commandHandler) {
      return;
    }

    const { reconnectMinMs, reconnectMaxMs } = this.config.mqtt;
    const delay = Math.min(
      reconnectMaxMs,
      reconnectMinMs * 2 ** this.reconnectAttempt,
    );
    this.reconnectAttempt += 1;

    setTimeout(() => {
      if (!this.client || this.connected) {
        return;
      }

      console.info(`[mqtt] reconnecting in ${delay}ms (attempt ${this.reconnectAttempt})`);
      this.client.reconnect();
    }, delay);
  }
}