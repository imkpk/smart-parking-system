export type MqttDetectionMessage = {
  messageId: string;
  identifierType: 'PLATE' | 'UHF_RFID' | 'QR_CODE';
  identifier: string;
  confidence?: number;
  occurredAt: string;
  deviceAuth?: string;
};

export type MqttCommandMessage = {
  commandId: string;
  action: 'OPEN';
  expiresAt: string;
};

export type MqttCommandAckMessage = {
  commandId: string;
  status: 'ACKNOWLEDGED' | 'RECEIVED' | 'EXECUTED' | 'FAILED';
  failureCode?: string;
  failureMessage?: string;
  occurredAt?: string;
};

export type MqttHeartbeatMessage = {
  firmwareVersion?: string;
  status?: 'ONLINE' | 'DEGRADED';
  occurredAt?: string;
};