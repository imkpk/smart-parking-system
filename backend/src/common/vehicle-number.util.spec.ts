import { normalizeVehicleNumber } from './vehicle-number.util';

describe('normalizeVehicleNumber', () => {
  it('trims whitespace and uppercases mixed-case plates', () => {
    expect(normalizeVehicleNumber('  KA05gh1212  ')).toBe('KA05GH1212');
  });

  it('leaves already-uppercase plates unchanged', () => {
    expect(normalizeVehicleNumber('TS09EA1234')).toBe('TS09EA1234');
  });
});