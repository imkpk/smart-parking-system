import { describe, expect, it } from 'vitest';
import { normalizeVehicleNumber } from '@/lib/vehicleNumber';

describe('normalizeVehicleNumber', () => {
  it('trims whitespace and uppercases mixed-case plates', () => {
    expect(normalizeVehicleNumber('  KA05gh1212  ')).toBe('KA05GH1212');
  });
});