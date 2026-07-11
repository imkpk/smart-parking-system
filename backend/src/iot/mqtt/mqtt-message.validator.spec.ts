import {
  parseMqttCommandAckMessage,
  parseMqttDetectionMessage,
  parseMqttTopic,
} from './mqtt-message.validator';

describe('mqtt-message.validator', () => {
  it('parses tenant-scoped MQTT topics', () => {
    expect(parseMqttTopic('smart-parking/12/device-1/detections', 'smart-parking')).toEqual({
      organizationId: 12,
      externalDeviceId: 'device-1',
      channel: 'detections',
    });
  });

  it('validates detection payloads', () => {
    const message = parseMqttDetectionMessage(
      Buffer.from(
        JSON.stringify({
          messageId: 'msg-1',
          identifierType: 'PLATE',
          identifier: 'KA05GH1212',
          confidence: 0.95,
          occurredAt: '2026-06-14T10:00:00.000Z',
          deviceAuth: 'secret',
        }),
      ),
    );

    expect(message.messageId).toBe('msg-1');
    expect(message.deviceAuth).toBe('secret');
  });

  it('validates command ack payloads', () => {
    const message = parseMqttCommandAckMessage(
      Buffer.from(
        JSON.stringify({
          commandId: 'cmd-1',
          status: 'EXECUTED',
        }),
      ),
    );

    expect(message).toEqual({
      commandId: 'cmd-1',
      status: 'EXECUTED',
    });
  });
});