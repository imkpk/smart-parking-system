export type GateDirection = 'ENTRY' | 'EXIT' | 'BIDIRECTIONAL';

export type IotDeviceType =
  | 'EDGE_GATEWAY'
  | 'ANPR_CAMERA'
  | 'RFID_READER'
  | 'QR_READER'
  | 'BARRIER_CONTROLLER';

export type IotDeviceStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'DISABLED';

export type VehicleCredentialType = 'UHF_RFID' | 'QR_CODE';

export type VehicleCredentialStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export type GateIdentifierType = 'PLATE' | 'UHF_RFID' | 'QR_CODE';

export type GateAccessSource = 'ANPR' | 'RFID' | 'QR' | 'MANUAL_OVERRIDE';

export type GateAccessDecision = 'GRANTED' | 'DENIED' | 'REVIEW_REQUIRED' | 'ERROR';

export type GateCommandStatus =
  | 'PENDING'
  | 'PUBLISHED'
  | 'ACKNOWLEDGED'
  | 'EXECUTED'
  | 'FAILED'
  | 'EXPIRED';

export const gateDirectionOptions: GateDirection[] = ['ENTRY', 'EXIT', 'BIDIRECTIONAL'];

export const iotDeviceTypeOptions: IotDeviceType[] = [
  'EDGE_GATEWAY',
  'ANPR_CAMERA',
  'RFID_READER',
  'QR_READER',
  'BARRIER_CONTROLLER',
];

export interface Gate {
  id: number;
  parkingLotId: number;
  externalId: string;
  name: string;
  direction: GateDirection;
  isActive: boolean;
  autoOpenEnabled: boolean;
  anprConfidenceThreshold: number;
  duplicateWindowSeconds: number;
  commandTtlSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface GatePayload {
  externalId: string;
  name: string;
  direction: GateDirection;
  isActive?: boolean;
  autoOpenEnabled?: boolean;
  anprConfidenceThreshold?: number;
  duplicateWindowSeconds?: number;
  commandTtlSeconds?: number;
}

export interface IotDevice {
  id: number;
  gateId: number;
  externalDeviceId: string;
  name: string;
  deviceType: IotDeviceType;
  status: IotDeviceStatus;
  isEnabled: boolean;
  lastSeenAt: string | null;
  firmwareVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IotDeviceUpdatePayload {
  name?: string;
  isEnabled?: boolean;
}

export interface GateLiveStatus {
  gateId: number;
  gateName: string;
  isActive: boolean;
  autoOpenEnabled: boolean;
  devicesOnline: number;
  devicesTotal: number;
  devices: IotDevice[];
  lastDetectionAt: string | null;
  lastAccessAttemptAt: string | null;
  pendingCommands: number;
}

export interface GateDetection {
  id: number;
  gateId: number;
  deviceId: number;
  deviceName: string;
  messageId: string;
  identifierType: GateIdentifierType;
  identifierDisplay: string | null;
  confidence: number | null;
  occurredAt: string;
  matchedVehicleId: number | null;
  matchedVehicleNumber: string | null;
}

export interface GateAccessAttempt {
  id: number;
  attemptId: string;
  gateId: number;
  source: GateAccessSource;
  decision: GateAccessDecision;
  reasonCode: string;
  reasonDetail: string | null;
  vehicleId: number | null;
  vehicleNumber: string | null;
  bookingId: number | null;
  parkingEventId: number | null;
  commandId: string | null;
  createdAt: string;
}

export interface ManualGateOpenPayload {
  reason: string;
}

export interface ManualGateOpenResult {
  attemptId: string;
  commandId: string;
  decision: GateAccessDecision;
  message: string;
}

export interface VehicleCredential {
  id: number;
  vehicleId: number;
  credentialType: VehicleCredentialType;
  displaySuffix: string;
  status: VehicleCredentialStatus;
  validFrom: string;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignRfidCredentialPayload {
  rfidTag: string;
}

export interface AssignRfidCredentialResult {
  credential: VehicleCredential;
}

export interface GenerateQrCredentialResult {
  credential: VehicleCredential;
  /** One-time plaintext token — shown only once for QR encoding. */
  qrPayload: string;
}