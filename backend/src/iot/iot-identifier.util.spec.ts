import {
  buildDisplaySuffix,
  hashDeviceCredential,
  hashIdentifier,
  hashPlateForDedup,
} from './iot-identifier.util';

describe('iot-identifier.util', () => {
  const pepper = 'test-pepper';

  it('hashes identifiers deterministically with HMAC-SHA256', () => {
    const first = hashIdentifier(' RFID-12345 ', pepper);
    const second = hashIdentifier('RFID-12345', pepper);

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });

  it('builds a display suffix without exposing full values', () => {
    expect(buildDisplaySuffix('ABCDEFGH')).toBe('EFGH');
    expect(buildDisplaySuffix('AB')).toBe('AB');
  });

  it('hashes plates separately for deduplication', () => {
    const plateHash = hashPlateForDedup('KA05GH1212', pepper);
    const identifierHash = hashIdentifier('KA05GH1212', pepper);

    expect(plateHash).not.toBe(identifierHash);
  });

  it('hashes device credentials with a distinct prefix', () => {
    const hash = hashDeviceCredential('secret-token', pepper);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});