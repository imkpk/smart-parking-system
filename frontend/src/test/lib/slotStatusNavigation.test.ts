import { describe, expect, it } from 'vitest';
import {
  buildSlotsFilteredPath,
  isSlotStatus,
  resolveParkingLotIdForStatus,
  slotStatusFromLabel,
} from '@/lib/slotStatusNavigation';

describe('slotStatusNavigation', () => {
  const lots = [
    {
      parkingLotId: 1,
      parkingLotName: 'Lot A',
      totalSlots: 60,
      occupiedSlots: 20,
      availableSlots: 35,
      utilizationPercent: 33,
    },
    {
      parkingLotId: 2,
      parkingLotName: 'Lot B',
      totalSlots: 40,
      occupiedSlots: 30,
      availableSlots: 8,
      utilizationPercent: 75,
    },
  ];

  it('maps donut labels to slot statuses', () => {
    expect(slotStatusFromLabel('Available')).toBe('AVAILABLE');
    expect(slotStatusFromLabel('Occupied')).toBe('OCCUPIED');
    expect(slotStatusFromLabel('Reserved')).toBe('RESERVED');
    expect(slotStatusFromLabel('Maintenance')).toBe('MAINTENANCE');
  });

  it('builds a filtered slots path', () => {
    expect(buildSlotsFilteredPath(3, 'AVAILABLE')).toBe('/parking-lots/3/slots?status=AVAILABLE');
  });

  it('validates slot status query params', () => {
    expect(isSlotStatus('AVAILABLE')).toBe(true);
    expect(isSlotStatus('INVALID')).toBe(false);
  });

  it('picks the lot with the most available or occupied slots', () => {
    expect(resolveParkingLotIdForStatus('Available', lots, null)).toBe(1);
    expect(resolveParkingLotIdForStatus('Occupied', lots, null)).toBe(2);
    expect(resolveParkingLotIdForStatus('Reserved', lots, null)).toBe(1);
  });
});