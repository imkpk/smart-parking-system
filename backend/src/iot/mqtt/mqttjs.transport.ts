import mqtt, { MqttClient } from 'mqtt';
import {
  MqttMessageHandler,
  MqttPublishOptions,
  MqttTransport,
} from './mqtt-transport.interface';

export type MqttJsTransportOptions = {
  brokerUrl: string;
  clientId: string;
  username?: string;
  password?: string;
};

export class MqttJsTransport implements MqttTransport {
  private client: MqttClient | null = null;
  private readonly handlers = new Map<string, MqttMessageHandler>();

  constructor(private readonly options: MqttJsTransportOptions) {}

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.client = mqtt.connect(this.options.brokerUrl, {
        clientId: this.options.clientId,
        username: this.options.username,
        password: this.options.password,
        clean: true,
        reconnectPeriod: 5_000,
      });

      this.client.on('connect', () => resolve());
      this.client.on('error', (error) => reject(error));
      this.client.on('message', (topic, payload) => {
        void this.dispatch(topic, payload);
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
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  async publish(
    topic: string,
    payload: string | Buffer,
    options?: MqttPublishOptions,
  ): Promise<void> {
    if (!this.client?.connected) {
      throw new Error('MQTT client is not connected');
    }

    await new Promise<void>((resolve, reject) => {
      this.client?.publish(
        topic,
        payload,
        {
          qos: options?.qos ?? 0,
          retain: options?.retain ?? false,
        },
        (error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        },
      );
    });
  }

  async subscribe(topic: string, handler: MqttMessageHandler): Promise<void> {
    this.handlers.set(topic, handler);

    if (!this.client?.connected) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.client?.subscribe(topic, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private async dispatch(topic: string, payload: Buffer): Promise<void> {
    for (const [pattern, handler] of this.handlers.entries()) {
      if (this.topicMatches(pattern, topic)) {
        await handler(topic, payload);
      }
    }
  }

  private topicMatches(pattern: string, topic: string): boolean {
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let index = 0; index < patternParts.length; index += 1) {
      const patternPart = patternParts[index];
      const topicPart = topicParts[index];

      if (patternPart === '#') {
        return true;
      }

      if (topicPart === undefined) {
        return false;
      }

      if (patternPart === '+' || patternPart === topicPart) {
        continue;
      }

      return false;
    }

    return patternParts.length === topicParts.length;
  }
}