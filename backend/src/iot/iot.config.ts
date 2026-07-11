export type IotConfig = {
  enabled: boolean;
  simulatorEnabled: boolean;
  identifierPepper: string;
  deviceCredentialPepper: string;
  manualOverrideRateLimitPerMinute: number;
  bookingEarlyEntryMinutes: number;
  bookingExitGraceMinutes: number;
  mqtt: {
    brokerUrl: string;
    username?: string;
    password?: string;
    clientIdPrefix: string;
    topicPrefix: string;
  };
};

const PLACEHOLDER_PEPPERS = new Set([
  'dev_iot_identifier_pepper_change_me',
  'change_me_in_production_32_chars_min',
]);

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true' || value === '1';
}

function parsePositiveInt(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return defaultValue;
  }

  return Math.floor(parsed);
}

function parseNonNegativeInt(value: string | undefined, defaultValue: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return defaultValue;
  }

  return Math.floor(parsed);
}

export function validateIotSecrets(config: IotConfig): void {
  if (!config.enabled) {
    return;
  }

  for (const [name, pepper] of [
    ['IOT_IDENTIFIER_PEPPER', config.identifierPepper],
    ['IOT_DEVICE_CREDENTIAL_PEPPER', config.deviceCredentialPepper],
  ] as const) {
    if (!pepper || pepper.length < 32) {
      throw new Error(`${name} must be at least 32 characters when IOT_ENABLED=true`);
    }

    if (PLACEHOLDER_PEPPERS.has(pepper)) {
      throw new Error(`${name} must not use a placeholder value when IOT_ENABLED=true`);
    }
  }
}

export function resolveIotConfig(env: NodeJS.ProcessEnv = process.env): IotConfig {
  const identifierPepper =
    env.IOT_IDENTIFIER_PEPPER ?? 'dev_iot_identifier_pepper_change_me';

  return {
    enabled: parseBoolean(env.IOT_ENABLED, false),
    simulatorEnabled: parseBoolean(env.IOT_SIMULATOR_ENABLED, false),
    identifierPepper,
    deviceCredentialPepper:
      env.IOT_DEVICE_CREDENTIAL_PEPPER ?? identifierPepper,
    manualOverrideRateLimitPerMinute: parsePositiveInt(
      env.IOT_MANUAL_OVERRIDE_RATE_LIMIT_PER_MINUTE,
      10,
    ),
    bookingEarlyEntryMinutes: parseNonNegativeInt(
      env.IOT_BOOKING_EARLY_ENTRY_MINUTES,
      15,
    ),
    bookingExitGraceMinutes: parseNonNegativeInt(
      env.IOT_BOOKING_EXIT_GRACE_MINUTES,
      30,
    ),
    mqtt: {
      brokerUrl: env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883',
      username: env.MQTT_USERNAME,
      password: env.MQTT_PASSWORD,
      clientIdPrefix: env.MQTT_CLIENT_ID_PREFIX ?? 'smart-parking-backend',
      topicPrefix: env.MQTT_TOPIC_PREFIX ?? 'smart-parking',
    },
  };
}