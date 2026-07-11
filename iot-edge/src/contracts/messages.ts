export const SCHEMA_VERSION = 1 as const;

export type IdentifierType = 'PLATE' | 'UHF_RFID' | 'QR_CODE';
export type DetectionSource = 'ANPR' | 'RFID' | 'QR';
export type CommandAction = 'OPEN';
export type CommandAckStatus = 'RECEIVED' | 'EXECUTED' | 'FAILED';
export type DeviceRuntimeStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE';
export type BarrierMode = 'SIMULATED' | 'HTTP_RELAY';

export interface DetectionMessage {
  schemaVersion: typeof SCHEMA_VERSION;
  messageId: string;
  identifierType: IdentifierType;
  identifier: string;
  confidence?: number;
  occurredAt: string;
  source: DetectionSource;
  deviceAuth?: string;
  metadata?: Record<string, unknown>;
}

export interface CommandMessage {
  schemaVersion: typeof SCHEMA_VERSION;
  commandId: string;
  action: CommandAction;
  expiresAt: string;
  requestedAt?: string;
  accessAttemptId?: string;
}

export interface CommandAckMessage {
  schemaVersion: typeof SCHEMA_VERSION;
  commandId: string;
  status: CommandAckStatus;
  acknowledgedAt: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface StatusMessage {
  schemaVersion: typeof SCHEMA_VERSION;
  status: DeviceRuntimeStatus;
  barrierMode: BarrierMode;
  mqttConnected: boolean;
  firmwareVersion?: string;
  occurredAt: string;
}

export interface EdgeContext {
  organizationId: number;
  gateId: number;
  externalDeviceId: string;
  topicPrefix: string;
}

export function topicBase(ctx: EdgeContext): string {
  return `${ctx.topicPrefix}/${ctx.organizationId}/${ctx.externalDeviceId}`;
}

export function detectionsTopic(ctx: EdgeContext): string {
  return `${topicBase(ctx)}/detections`;
}

export function commandsTopic(ctx: EdgeContext): string {
  return `${topicBase(ctx)}/commands`;
}

export function commandAckTopic(ctx: EdgeContext): string {
  return `${topicBase(ctx)}/acks`;
}

export function statusTopic(ctx: EdgeContext): string {
  return `${topicBase(ctx)}/heartbeat`;
}

export function isCommandMessage(value: unknown): value is CommandMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.commandId === 'string' &&
    record.action === 'OPEN' &&
    typeof record.expiresAt === 'string'
  );
}

export function isDetectionMessage(value: unknown): value is DetectionMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.messageId === 'string' &&
    typeof record.identifierType === 'string' &&
    typeof record.identifier === 'string' &&
    typeof record.occurredAt === 'string'
  );
}