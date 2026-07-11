import { resolveIotConfig, validateIotSecrets } from './iot.config';

describe('iot.config', () => {
  it('rejects placeholder peppers when IoT is enabled', () => {
    const config = resolveIotConfig({
      IOT_ENABLED: 'true',
      IOT_IDENTIFIER_PEPPER: 'change_me_in_production_32_chars_min',
      IOT_DEVICE_CREDENTIAL_PEPPER: 'change_me_in_production_32_chars_min',
    });

    expect(() => validateIotSecrets(config)).toThrow(
      'IOT_IDENTIFIER_PEPPER must not use a placeholder value when IOT_ENABLED=true',
    );
  });

  it('rejects short peppers when IoT is enabled', () => {
    const config = resolveIotConfig({
      IOT_ENABLED: 'true',
      IOT_IDENTIFIER_PEPPER: 'short',
      IOT_DEVICE_CREDENTIAL_PEPPER: 'also_short_pepper_value_here_123',
    });

    expect(() => validateIotSecrets(config)).toThrow(
      'IOT_IDENTIFIER_PEPPER must be at least 32 characters when IOT_ENABLED=true',
    );
  });

  it('parses booking window configuration', () => {
    const config = resolveIotConfig({
      IOT_BOOKING_EARLY_ENTRY_MINUTES: '20',
      IOT_BOOKING_EXIT_GRACE_MINUTES: '45',
    });

    expect(config.bookingEarlyEntryMinutes).toBe(20);
    expect(config.bookingExitGraceMinutes).toBe(45);
  });
});