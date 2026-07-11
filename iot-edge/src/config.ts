import type { BarrierMode } from './contracts/messages.js';

export interface Config {
  localApiKey: string;
  httpPort: number;
  mqtt: {
    brokerUrl: string;
    username?: string;
    password?: string;
    clientId: string;
    reconnectMinMs: number;
    reconnectMaxMs: number;
  };
  edge: {
    organizationId: number;
    gateId: number;
    externalDeviceId: string;
    firmwareVersion: string;
  };
  barrier: {
    mode: BarrierMode;
    httpRelayUrl?: string;
    httpRelayTimeoutMs: number;
    simulatedDelayMs: number;
  };
  heartbeatIntervalMs: number;
  commandDedupeTtlMs: number;
  mqttTopicPrefix: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a number`);
  }

  return parsed;
}

function readBarrierMode(): BarrierMode {
  const raw = (process.env.BARRIER_MODE ?? 'SIMULATED').trim().toUpperCase();
  if (raw === 'SIMULATED' || raw === 'HTTP_RELAY') {
    return raw;
  }

  throw new Error('BARRIER_MODE must be SIMULATED or HTTP_RELAY');
}

export function loadConfig(): Config {
  const barrierMode = readBarrierMode();
  const httpRelayUrl = process.env.HTTP_RELAY_URL?.trim();

  if (barrierMode === 'HTTP_RELAY' && !httpRelayUrl) {
    throw new Error('HTTP_RELAY_URL is required when BARRIER_MODE=HTTP_RELAY');
  }

  return {
    localApiKey: requireEnv('EDGE_LOCAL_API_KEY'),
    httpPort: readNumber('HTTP_PORT', 3100),
    mqtt: {
      brokerUrl: process.env.MQTT_BROKER_URL?.trim() ?? 'mqtt://127.0.0.1:1883',
      username: process.env.MQTT_USERNAME?.trim() || undefined,
      password: process.env.MQTT_PASSWORD?.trim() || undefined,
      clientId:
        process.env.MQTT_CLIENT_ID?.trim() ??
        `iot-edge-${process.env.EXTERNAL_DEVICE_ID?.trim() ?? 'local'}`,
      reconnectMinMs: readNumber('MQTT_RECONNECT_MIN_MS', 1000),
      reconnectMaxMs: readNumber('MQTT_RECONNECT_MAX_MS', 30000),
    },
    edge: {
      organizationId: readNumber('ORGANIZATION_ID', 1),
      gateId: readNumber('GATE_ID', 1),
      externalDeviceId: requireEnv('EXTERNAL_DEVICE_ID'),
      firmwareVersion: process.env.FIRMWARE_VERSION?.trim() ?? '0.1.0',
    },
    barrier: {
      mode: barrierMode,
      httpRelayUrl,
      httpRelayTimeoutMs: readNumber('HTTP_RELAY_TIMEOUT_MS', 5000),
      simulatedDelayMs: readNumber('SIMULATED_BARRIER_DELAY_MS', 250),
    },
    heartbeatIntervalMs: readNumber('HEARTBEAT_INTERVAL_MS', 15000),
    commandDedupeTtlMs: readNumber('COMMAND_DEDUPE_TTL_MS', 300000),
    mqttTopicPrefix: process.env.MQTT_TOPIC_PREFIX?.trim() ?? 'smart-parking',
  };
}