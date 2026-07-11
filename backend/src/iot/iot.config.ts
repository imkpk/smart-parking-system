export type IotConfig = {
  enabled: boolean;
  simulatorEnabled: boolean;
  identifierPepper: string;
  deviceCredentialPepper: string;
  manualOverrideRateLimitPerMinute: number;
  mqtt: {
    brokerUrl: string;
    username?: string;
    password?: string;
    clientIdPrefix: string;
    topicPrefix: string;
  };
};

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
    mqtt: {
      brokerUrl: env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883',
      username: env.MQTT_USERNAME,
      password: env.MQTT_PASSWORD,
      clientIdPrefix: env.MQTT_CLIENT_ID_PREFIX ?? 'smart-parking-backend',
      topicPrefix: env.MQTT_TOPIC_PREFIX ?? 'smart-parking',
    },
  };
}