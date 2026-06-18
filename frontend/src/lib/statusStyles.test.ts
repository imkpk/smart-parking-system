import { describe, expect, it } from 'vitest';
import { getStatusStyle, statusStyles } from './statusStyles';

const allStatuses = [
  'AVAILABLE',
  'RESERVED',
  'OCCUPIED',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'EXPIRED',
  'ACTIVE',
  'INITIATED',
  'SUCCESS',
  'FAILED',
  'REFUNDED',
  'PENDING',
  'MAINTENANCE',
] as const;

describe('statusStyles', () => {
  it('defines styles for all known statuses', () => {
    for (const status of allStatuses) {
      expect(statusStyles[status]).toEqual(
        expect.objectContaining({
          bgcolor: expect.any(String),
          borderColor: expect.any(String),
          color: expect.any(String),
        }),
      );
    }
  });
});

describe('getStatusStyle', () => {
  it('returns mapped style for known statuses', () => {
    expect(getStatusStyle('AVAILABLE')).toBe(statusStyles.AVAILABLE);
    expect(getStatusStyle('FAILED')).toBe(statusStyles.FAILED);
    expect(getStatusStyle('PENDING')).toBe(statusStyles.PENDING);
  });

  it('returns neutral style for unknown status', () => {
    expect(getStatusStyle('UNKNOWN_STATUS')).toBe(statusStyles.EXPIRED);
  });
});