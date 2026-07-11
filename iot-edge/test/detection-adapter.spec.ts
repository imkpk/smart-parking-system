import { describe, expect, it } from 'vitest';

import {
  normalizeAnprDetection,
  normalizeQrDetection,
  normalizeRfidDetection,
} from '../src/adapters/detection-adapter.js';
import { SCHEMA_VERSION } from '../src/contracts/messages.js';

const ctx = {
  organizationId: 1,
  gateId: 10,
  externalDeviceId: 'edge-gw-001',
};

describe('detection-adapter', () => {
  it('normalizes ANPR vendor payload', () => {
    const message = normalizeAnprDetection(ctx, {
      plate: ' KA01AB1234 ',
      confidence: 0.93,
      capturedAt: '2026-07-11T10:00:00.000Z',
      metadata: { lane: 'entry-1' },
    });

    expect(message).toMatchObject({
      schemaVersion: SCHEMA_VERSION,
      identifierType: 'PLATE',
      identifier: 'KA01AB1234',
      confidence: 0.93,
      source: 'ANPR',
      metadata: { lane: 'entry-1' },
    });
    expect(message.messageId).toBeTruthy();
    expect(message.occurredAt).toBe('2026-07-11T10:00:00.000Z');
  });

  it('normalizes RFID vendor payload', () => {
    const message = normalizeRfidDetection(ctx, {
      tagId: 'E20034120123456789012',
      readAt: '2026-07-11T10:01:00.000Z',
    });

    expect(message.identifierType).toBe('UHF_RFID');
    expect(message.source).toBe('RFID');
    expect(message.identifier).toBe('E20034120123456789012');
  });

  it('normalizes QR vendor payload', () => {
    const message = normalizeQrDetection(ctx, {
      code: 'qr-token-abc',
    });

    expect(message.identifierType).toBe('QR_CODE');
    expect(message.source).toBe('QR');
    expect(message.identifier).toBe('qr-token-abc');
    expect(message.occurredAt).toBeTruthy();
  });

  it('rejects empty identifier values', () => {
    expect(() =>
      normalizeAnprDetection(ctx, {
        plate: '   ',
      }),
    ).toThrow(/Identifier value is required/);
  });
});