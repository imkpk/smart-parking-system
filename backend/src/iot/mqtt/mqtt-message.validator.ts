import { resolveIotConfig } from '../iot.config';
import {
  MqttCommandAckMessage,
  MqttDetectionMessage,
  MqttHeartbeatMessage,
} from './mqtt.types';

const config = resolveIotConfig();

function assertObject(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
}

function assertString(value: unknown, field: string, maxLength = 500): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }

  if (value.length > maxLength) {
    throw new Error(`${field} exceeds maximum length`);
  }
}

function assertPayloadSize(payload: Buffer): void {
  if (payload.byteLength > config.maxMqttPayloadBytes) {
    throw new Error('MQTT payload exceeds maximum allowed size');
  }
}

function assertIsoTimestamp(value: string, field: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${field} must be a valid ISO timestamp`);
  }

  const skew = Math.abs(Date.now() - parsed.getTime());
  if (skew > config.maxClockSkewMs) {
    throw new Error(`${field} is outside the allowed clock skew window`);
  }

  return parsed;
}

export function parseMqttDetectionMessage(payload: Buffer): MqttDetectionMessage {
  assertPayloadSize(payload);

  const parsed = JSON.parse(payload.toString()) as unknown;
  assertObject(parsed, 'Detection message');

  assertString(parsed.messageId, 'messageId', 64);
  assertString(parsed.identifierType, 'identifierType', 32);
  assertString(parsed.identifier, 'identifier', config.maxIdentifierLength);
  assertString(parsed.occurredAt, 'occurredAt');
  assertIsoTimestamp(parsed.occurredAt, 'occurredAt');

  if (
    parsed.identifierType !== 'PLATE' &&
    parsed.identifierType !== 'UHF_RFID' &&
    parsed.identifierType !== 'QR_CODE'
  ) {
    throw new Error('identifierType must be PLATE, UHF_RFID, or QR_CODE');
  }

  if (parsed.confidence !== undefined) {
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      throw new Error('confidence must be a number between 0 and 1');
    }
  }

  if (parsed.deviceAuth === undefined || typeof parsed.deviceAuth !== 'string' || !parsed.deviceAuth.trim()) {
    throw new Error('deviceAuth is required');
  }

  return parsed as MqttDetectionMessage;
}

export function parseMqttCommandAckMessage(payload: Buffer): MqttCommandAckMessage {
  assertPayloadSize(payload);

  const parsed = JSON.parse(payload.toString()) as unknown;
  assertObject(parsed, 'Command ack message');

  assertString(parsed.commandId, 'commandId', 64);
  assertString(parsed.status, 'status', 32);

  if (
    parsed.status !== 'ACKNOWLEDGED' &&
    parsed.status !== 'RECEIVED' &&
    parsed.status !== 'EXECUTED' &&
    parsed.status !== 'FAILED'
  ) {
    throw new Error('status must be ACKNOWLEDGED, RECEIVED, EXECUTED, or FAILED');
  }

  if (parsed.failureMessage !== undefined) {
    assertString(parsed.failureMessage, 'failureMessage', config.maxFailureMessageLength);
  }

  return parsed as MqttCommandAckMessage;
}

export function parseMqttHeartbeatMessage(payload: Buffer): MqttHeartbeatMessage {
  assertPayloadSize(payload);

  const parsed = JSON.parse(payload.toString()) as unknown;
  assertObject(parsed, 'Heartbeat message');

  if (parsed.firmwareVersion !== undefined && typeof parsed.firmwareVersion !== 'string') {
    throw new Error('firmwareVersion must be a string');
  }

  if (parsed.status !== undefined && parsed.status !== 'ONLINE' && parsed.status !== 'DEGRADED') {
    throw new Error('status must be ONLINE or DEGRADED');
  }

  if (parsed.occurredAt !== undefined) {
    assertString(parsed.occurredAt, 'occurredAt');
    assertIsoTimestamp(parsed.occurredAt, 'occurredAt');
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