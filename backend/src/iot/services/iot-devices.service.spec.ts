import { createHmac } from 'crypto';
import { IotDevicesService } from './iot-devices.service';

describe('IotDevicesService.verifyDeviceCredential', () => {
  const pepper = 'test_device_credential_pepper_32ch';

  const service = new IotDevicesService(
    {} as never,
    {} as never,
  );

  beforeEach(() => {
    Object.defineProperty(service, 'config', {
      value: { deviceCredentialPepper: pepper },
    });
  });

  function hashCredential(raw: string): string {
    return createHmac('sha256', pepper).update(`device:${raw}`).digest('hex');
  }

  it('accepts a matching credential using timing-safe comparison', () => {
    const raw = 'demo-device-credential-not-a-real-secret';

    expect(
      service.verifyDeviceCredential(
        {
          credentialHash: hashCredential(raw),
        } as never,
        raw,
      ),
    ).toBe(true);
  });

  it('rejects a non-matching credential without throwing', () => {
    expect(
      service.verifyDeviceCredential(
        {
          credentialHash: hashCredential('expected-credential'),
        } as never,
        'wrong-credential',
      ),
    ).toBe(false);
  });

  it('rejects devices without a stored credential hash', () => {
    expect(
      service.verifyDeviceCredential(
        {
          credentialHash: null,
        } as never,
        'any-credential',
      ),
    ).toBe(false);
  });
});