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
    allowPublicRelay: boolean;
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

function readBoolean(name: string, fallback = false): boolean {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return fallback;
  }

  const normalized = raw.toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  throw new Error(`Environment variable ${name} must be a boolean`);
}

function readBarrierMode(): BarrierMode {
  const raw = (process.env.BARRIER_MODE ?? 'SIMULATED').trim().toUpperCase();
  if (raw === 'SIMULATED' || raw === 'HTTP_RELAY') {
    return raw;
  }

  throw new Error('BARRIER_MODE must be SIMULATED or HTTP_RELAY');
}

function parseIpv4(hostname: string): number[] | null {
  const parts = hostname.split('.');
  if (parts.length !== 4) {
    return null;
  }

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null;
  }

  return octets;
}

function isPrivateOrLoopbackIpv4(hostname: string): boolean {
  const octets = parseIpv4(hostname);
  if (!octets) {
    return false;
  }

  const [a, b] = octets;
  if (a === 127) {
    return true;
  }
  if (a === 10) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }

  return false;
}

function isPrivateOrLoopbackIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === '::1') {
    return true;
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }
  if (normalized.startsWith('fe80:')) {
    return true;
  }

  return false;
}

function isPrivateOrLoopbackHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return true;
  }

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    return isPrivateOrLoopbackIpv6(normalized.slice(1, -1));
  }

  if (normalized.includes(':')) {
    return isPrivateOrLoopbackIpv6(normalized);
  }

  return isPrivateOrLoopbackIpv4(normalized);
}

export function validateHttpRelayUrl(rawUrl: string, allowPublic: boolean): string {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('HTTP_RELAY_URL must be a valid absolute URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('HTTP_RELAY_URL must use http or https');
  }

  if (parsed.username || parsed.password) {
    throw new Error('HTTP_RELAY_URL must not include embedded credentials');
  }

  if (!allowPublic && !isPrivateOrLoopbackHost(parsed.hostname)) {
    throw new Error(
      'HTTP_RELAY_URL must target loopback or private addresses unless EDGE_BARRIER_ALLOW_PUBLIC=true',
    );
  }

  return parsed.toString();
}

export function loadConfig(): Config {
  const barrierMode = readBarrierMode();
  const allowPublicRelay = readBoolean('EDGE_BARRIER_ALLOW_PUBLIC', false);
  const rawHttpRelayUrl = process.env.HTTP_RELAY_URL?.trim();
  const httpRelayUrl =
    barrierMode === 'HTTP_RELAY'
      ? validateHttpRelayUrl(rawHttpRelayUrl ?? '', allowPublicRelay)
      : rawHttpRelayUrl;

  if (barrierMode === 'HTTP_RELAY' && !rawHttpRelayUrl) {
    throw new Error('HTTP_RELAY_URL is required when BARRIER_MODE=HTTP_RELAY');
  }

  const httpRelayTimeoutMs = readNumber('HTTP_RELAY_TIMEOUT_MS', 5000);
  if (httpRelayTimeoutMs <= 0 || httpRelayTimeoutMs > 30_000) {
    throw new Error('HTTP_RELAY_TIMEOUT_MS must be between 1 and 30000');
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
      httpRelayTimeoutMs,
      simulatedDelayMs: readNumber('SIMULATED_BARRIER_DELAY_MS', 250),
      allowPublicRelay,
    },
    heartbeatIntervalMs: readNumber('HEARTBEAT_INTERVAL_MS', 15000),
    commandDedupeTtlMs: readNumber('COMMAND_DEDUPE_TTL_MS', 300000),
    mqttTopicPrefix: process.env.MQTT_TOPIC_PREFIX?.trim() ?? 'smart-parking',
  };
}