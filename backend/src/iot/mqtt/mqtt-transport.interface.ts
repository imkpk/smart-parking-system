export type MqttMessageHandler = (topic: string, payload: Buffer) => void | Promise<void>;

export type MqttPublishOptions = {
  qos?: 0 | 1 | 2;
  retain?: boolean;
};

export interface MqttTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  publish(topic: string, payload: string | Buffer, options?: MqttPublishOptions): Promise<void>;
  subscribe(topic: string, handler: MqttMessageHandler): Promise<void>;
  isConnected(): boolean;
}

export const MQTT_TRANSPORT = Symbol('MQTT_TRANSPORT');