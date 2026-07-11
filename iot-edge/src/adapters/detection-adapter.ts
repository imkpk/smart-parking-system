import { randomUUID } from 'node:crypto';

import {
  SCHEMA_VERSION,
  type DetectionMessage,
  type DetectionSource,
  type EdgeContext,
  type IdentifierType,
} from '../contracts/messages.js';

export interface VendorAnprPayload {
  plate: string;
  confidence?: number;
  capturedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface VendorRfidPayload {
  tagId: string;
  readAt?: string;
  metadata?: Record<string, unknown>;
}

export interface VendorQrPayload {
  code: string;
  scannedAt?: string;
  metadata?: Record<string, unknown>;
}

export type VendorPayload = VendorAnprPayload | VendorRfidPayload | VendorQrPayload;

export interface NormalizeOptions {
  messageId?: string;
  occurredAt?: string;
}

function normalizeTimestamp(value: string | undefined): string {
  if (value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return new Date().toISOString();
}

function buildDetection(
  ctx: EdgeContext,
  source: DetectionSource,
  identifierType: IdentifierType,
  identifier: string,
  confidence: number | undefined,
  occurredAt: string | undefined,
  metadata: Record<string, unknown> | undefined,
  options: NormalizeOptions = {},
): DetectionMessage {
  const trimmedIdentifier = identifier.trim();
  if (!trimmedIdentifier) {
    throw new Error('Identifier value is required');
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    messageId: options.messageId ?? randomUUID(),
    identifierType,
    identifier: trimmedIdentifier,
    confidence,
    occurredAt: normalizeTimestamp(occurredAt ?? options.occurredAt),
    source,
    metadata,
  };
}

export function normalizeAnprDetection(
  ctx: EdgeContext,
  payload: VendorAnprPayload,
  options: NormalizeOptions = {},
): DetectionMessage {
  return buildDetection(
    ctx,
    'ANPR',
    'PLATE',
    payload.plate,
    payload.confidence,
    payload.capturedAt,
    payload.metadata,
    options,
  );
}

export function normalizeRfidDetection(
  ctx: EdgeContext,
  payload: VendorRfidPayload,
  options: NormalizeOptions = {},
): DetectionMessage {
  return buildDetection(
    ctx,
    'RFID',
    'UHF_RFID',
    payload.tagId,
    undefined,
    payload.readAt,
    payload.metadata,
    options,
  );
}

export function normalizeQrDetection(
  ctx: EdgeContext,
  payload: VendorQrPayload,
  options: NormalizeOptions = {},
): DetectionMessage {
  return buildDetection(
    ctx,
    'QR',
    'QR_CODE',
    payload.code,
    undefined,
    payload.scannedAt,
    payload.metadata,
    options,
  );
}