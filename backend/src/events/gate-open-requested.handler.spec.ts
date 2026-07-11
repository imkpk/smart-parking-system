import { OutboxEventType } from '@prisma/client';
import { GateOpenRequestedHandler } from './gate-open-requested.handler';

describe('GateOpenRequestedHandler', () => {
  it('publishes MQTT before marking the command as published', async () => {
    const calls: string[] = [];
    let registeredCallback: ((event: unknown) => Promise<void>) | undefined;
    const handlerRegistry = {
      register: jest.fn((_eventType, callback) => {
        registeredCallback = callback;
      }),
    };
    const mqttBridgeService = {
      publishOpenCommand: jest.fn(async () => {
        calls.push('mqtt');
      }),
    };
    const gateCommandsService = {
      claimCommandForPublishing: jest.fn(async () => {
        calls.push('claim');
        return { commandId: 'cmd-1' };
      }),
      releasePublishingClaim: jest.fn(),
      markCommandPublished: jest.fn(async () => {
        calls.push('mark');
      }),
    };

    const handler = new GateOpenRequestedHandler(
      handlerRegistry as never,
      mqttBridgeService as never,
      gateCommandsService as never,
    );

    handler.onModuleInit();

    await registeredCallback!({
      payload: {
        organizationId: 1,
        gateId: 2,
        commandId: 'cmd-1',
        controllerDeviceId: 7,
        externalDeviceId: 'barrier-1',
        action: 'OPEN',
        expiresAt: new Date().toISOString(),
      },
    });

    expect(handlerRegistry.register).toHaveBeenCalledWith(
      OutboxEventType.GATE_OPEN_REQUESTED,
      expect.any(Function),
    );
    expect(calls).toEqual(['claim', 'mqtt', 'mark']);
    expect(gateCommandsService.claimCommandForPublishing).toHaveBeenCalledWith('cmd-1');
    expect(mqttBridgeService.publishOpenCommand).toHaveBeenCalled();
    expect(gateCommandsService.markCommandPublished).toHaveBeenCalledWith('cmd-1');
  });
});