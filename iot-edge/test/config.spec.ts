import { afterEach, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';

const BASE_ENV = {
  EDGE_LOCAL_API_KEY: 'dev-edge-key',
  EDGE_DEVICE_CREDENTIAL: 'demo-device-credential-not-a-real-secret',
  EXTERNAL_DEVICE_ID: 'edge-gw-demo-001',
};

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('requires EDGE_DEVICE_CREDENTIAL', () => {
    process.env = {
      ...BASE_ENV,
      EDGE_DEVICE_CREDENTIAL: '',
    };

    expect(() => loadConfig()).toThrow(/EDGE_DEVICE_CREDENTIAL/);
  });

  it('loads device credential into edge config without exposing it elsewhere', () => {
    process.env = { ...BASE_ENV };

    const config = loadConfig();

    expect(config.edge.deviceCredential).toBe('demo-device-credential-not-a-real-secret');
    expect(config.edge.externalDeviceId).toBe('edge-gw-demo-001');
  });
});