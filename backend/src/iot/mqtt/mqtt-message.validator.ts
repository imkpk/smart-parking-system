import {
  MqttCommandAckMessage,
  MqttDetectionMessage,
  MqttHeartbeatMessage,
} from './mqtt.types';

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

export function parseMqttDetectionMessage(payload: Buffer): MqttDetectionMessage {
  const parsed = JSON.parse(payload.toString()) as unknown;
  assertObject(parsed, 'Detection message');

  assertString(parsed.messageId, 'messageId');
  assertString(parsed.identifierType, 'identifierType');
  assertString(parsed.identifier, 'identifier');
  assertString(parsed.occurredAt, 'occurredAt');

  if (
    parsed.identifierType !== 'PLATE' &&
    parsed.identifierType !== 'UHF_RFID' &&
    parsed.identifierType !== 'QR_CODE'
  ) {
    throw new Error('identifierType must be PLATE, UHF_RFID, or QR_CODE');
  }

  if (parsed.confidence !== undefined && typeof parsed.confidence !== 'number') {
    throw new Error('confidence must be a number');
  }

  if (parsed.deviceAuth !== undefined && typeof parsed.deviceAuth !== 'string') {
    throw new Error('deviceAuth must be a string');
  }

  return parsed as MqttDetectionMessage;
}

export function parseMqttCommandAckMessage(payload: Buffer): MqttCommandAckMessage {
  const parsed = JSON.parse(payload.toString()) as unknown;
  assertObject(parsed, 'Command ack message');

  assertString(parsed.commandId, 'commandId');
  assertString(parsed.status, 'status');

  if (
    parsed.status !== 'ACKNOWLEDGED' &&
    parsed.status !== 'RECEIVED' &&
    parsed.status !== 'EXECUTED' &&
    parsed.status !== 'FAILED'
  ) {
    throw new Error('status must be ACKNOWLEDGED, RECEIVED, EXECUTED, or FAILED');
  }

  return parsed as MqttCommandAckMessage;
}

export function parseMqttHeartbeatMessage(payload: Buffer): MqttHeartbeatMessage {
  const parsed = JSON.parse(payload.toString()) as unknown;
  assertObject(parsed, 'Heartbeat message');

  if (parsed.firmwareVersion !== undefined && typeof parsed.firmwareVersion !== 'string') {
    throw new Error('firmwareVersion must be a string');
  }

  if (parsed.status !== undefined && parsed.status !== 'ONLINE' && parsed.status !== 'DEGRADED') {
    throw new Error('status must be ONLINE or DEGRADED');
  }

  if (parsed.occurredAt !== undefined && typeof parsed.occurredAt !== 'string') {
    throw new Error('occurredAt must be a string');
  }

  return parsed as MqttHeartbeatMessage;
}

export function parseMqttTopic(
  topic: string,
  expectedPrefix: string,
): {
  organizationId: number;
  externalDeviceId: string;
  channel: 'commands' | 'detections' | 'acks' | 'heartbeat';
} {
  const parts = topic.split('/');

  if (parts.length !== 4) {
    throw new Error(`Invalid MQTT topic: ${topic}`);
  }

  const [prefix, organizationIdRaw, externalDeviceId, channel] = parts;

  if (prefix !== expectedPrefix) {
    throw new Error(`Unexpected MQTT topic prefix: ${prefix}`);
  }

  const organizationId = Number(organizationIdRaw);
  if (!Number.isInteger(organizationId) || organizationId < 1) {
    throw new Error(`Invalid organizationId in MQTT topic: ${topic}`);
  }

  if (!externalDeviceId) {
    throw new Error(`Invalid externalDeviceId in MQTT topic: ${topic}`);
  }

  if (
    channel !== 'commands' &&
    channel !== 'detections' &&
    channel !== 'acks' &&
    channel !== 'heartbeat'
  ) {
    throw new Error(`Invalid MQTT channel in topic: ${topic}`);
  }

  return {
    organizationId,
    externalDeviceId,
    channel,
  };
}