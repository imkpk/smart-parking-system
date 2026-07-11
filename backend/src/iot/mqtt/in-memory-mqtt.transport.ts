import {
  MqttMessageHandler,
  MqttPublishOptions,
  MqttTransport,
} from './mqtt-transport.interface';

type Subscription = {
  pattern: string;
  handler: MqttMessageHandler;
};

export class InMemoryMqttTransport implements MqttTransport {
  private connected = false;
  private readonly subscriptions: Subscription[] = [];

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.subscriptions.length = 0;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish(
    topic: string,
    payload: string | Buffer,
    _options?: MqttPublishOptions,
  ): Promise<void> {
    if (!this.connected) {
      throw new Error('In-memory MQTT transport is not connected');
    }

    const buffer = typeof payload === 'string' ? Buffer.from(payload) : payload;

    for (const subscription of this.subscriptions) {
      if (this.topicMatches(subscription.pattern, topic)) {
        await subscription.handler(topic, buffer);
      }
    }
  }

  async subscribe(topic: string, handler: MqttMessageHandler): Promise<void> {
    this.subscriptions.push({ pattern: topic, handler });
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

      if (patternPart === '+') {
        continue;
      }

      if (patternPart !== topicPart) {
        return false;
      }
    }

    return patternParts.length === topicParts.length;
  }
}