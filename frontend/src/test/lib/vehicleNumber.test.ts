import { describe, expect, it } from 'vitest';
import { formatVehicleNumber, normalizeVehicleNumber } from '@/lib/vehicleNumber';

describe('normalizeVehicleNumber', () => {
  it('trims whitespace and uppercases mixed-case plates', () => {
    expect(normalizeVehicleNumber('  KA05gh1212  ')).toBe('KA05GH1212');
  });
});

describe('formatVehicleNumber', () => {
  it('returns uppercase plates for display', () => {
    expect(formatVehicleNumber('ka05gh1212')).toBe('KA05GH1212');
  });

  it('returns an empty string for missing values', () => {
    expect(formatVehicleNumber()).toBe('');
  });
});