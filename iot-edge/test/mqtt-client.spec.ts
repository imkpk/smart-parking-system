import { describe, expect, it, vi } from 'vitest';

import type { Config } from '../src/config.js';
import type { DetectionMessage, EdgeContext } from '../src/contracts/messages.js';
import { EdgeMqttClient } from '../src/mqtt/client.js';

const ctx: EdgeContext = {
  organizationId: 1,
  gateId: 1,
  externalDeviceId: 'edge-gw-demo-001',
  topicPrefix: 'smart-parking',
};

const config = {
  mqtt: {
    brokerUrl: 'mqtt://127.0.0.1:1883',
    clientId: 'test-client',
    reconnectMinMs: 1000,
    reconnectMaxMs: 30000,
  },
} as Config;

describe('EdgeMqttClient.publishDetection', () => {
  it('injects deviceAuth when publishing detections', async () => {
    const client = new EdgeMqttClient(config, ctx, 'edge-secret-credential');
    const publish = vi
      .spyOn(
        client as unknown as { publish: (topic: string, payload: unknown) => Promise<void> },
        'publish',
      )
      .mockResolvedValue(undefined);

    const message: DetectionMessage = {
      schemaVersion: 1,
      messageId: 'msg-1',
      identifierType: 'PLATE',
      identifier: 'KA01AB1234',
      occurredAt: '2026-07-11T10:00:00.000Z',
      source: 'ANPR',
    };

    await client.publishDetection(message);

    expect(publish).toHaveBeenCalledWith(
      'smart-parking/1/edge-gw-demo-001/detections',
      expect.objectContaining({
        deviceAuth: 'edge-secret-credential',
      }),
    );
  });
});