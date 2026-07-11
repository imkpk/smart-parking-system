import type { BarrierAdapter } from './adapters/barrier-adapter.js';
import { HttpRelayBarrierAdapter } from './adapters/http-relay-barrier.adapter.js';
import { SimulatedBarrierAdapter } from './adapters/simulated-barrier.adapter.js';
import { loadConfig } from './config.js';
import {
  SCHEMA_VERSION,
  type CommandAckMessage,
  type CommandMessage,
  type EdgeContext,
  type StatusMessage,
  isCommandMessage,
} from './contracts/messages.js';
import { createHttpServer, startHttpServer } from './http/server.js';
import { EdgeMqttClient } from './mqtt/client.js';
import { CommandState } from './state/command-state.js';

function createBarrierAdapter(config: ReturnType<typeof loadConfig>): BarrierAdapter {
  if (config.barrier.mode === 'HTTP_RELAY') {
    return new HttpRelayBarrierAdapter(
      config.barrier.httpRelayUrl!,
      config.barrier.httpRelayTimeoutMs,
      config.barrier.httpMethod,
      config.barrier.httpAuthHeaderName,
      config.barrier.httpAuthHeaderValue,
    );
  }

  return new SimulatedBarrierAdapter(config.barrier.simulatedDelayMs);
}

async function main(): Promise<void> {
  const config = loadConfig();
  const ctx: EdgeContext = {
    organizationId: config.edge.organizationId,
    gateId: config.edge.gateId,
    externalDeviceId: config.edge.externalDeviceId,
    topicPrefix: config.mqttTopicPrefix,
  };

  const commandState = new CommandState(config.commandDedupeTtlMs);
  const barrier = createBarrierAdapter(config);
  const mqttClient = new EdgeMqttClient(config, ctx, config.edge.deviceCredential);

  let degraded = false;

  const publishStatus = async (): Promise<void> => {
    const status: StatusMessage = {
      schemaVersion: SCHEMA_VERSION,
      status: !mqttClient.isConnected() ? 'OFFLINE' : degraded ? 'DEGRADED' : 'ONLINE',
      barrierMode: barrier.mode,
      mqttConnected: mqttClient.isConnected(),
      firmwareVersion: config.edge.firmwareVersion,
      occurredAt: new Date().toISOString(),
    };

    try {
      await mqttClient.publishStatus(status);
    } catch (error) {
      console.error('[status] failed to publish heartbeat', error);
    }
  };

  const handleCommand = async (_topic: string, payload: Buffer): Promise<void> => {
    let parsed: unknown;

    try {
      parsed = JSON.parse(payload.toString('utf8'));
    } catch {
      console.warn('[command] received invalid JSON payload');
      return;
    }

    if (!isCommandMessage(parsed)) {
      console.warn('[command] received payload that does not match command contract');
      return;
    }

    const command = parsed as CommandMessage;

    const check = commandState.check(command.commandId, command.expiresAt);
    if (check.disposition === 'DUPLICATE') {
      console.info(`[command] duplicate commandId=${command.commandId} — replaying acks`);
      const replayAcks = commandState.getReplayAcks(command.commandId);
      for (const ack of replayAcks) {
        await mqttClient.publishCommandAck(ack);
      }
      return;
    }

    if (check.disposition === 'EXPIRED') {
      console.info(`[command] expired commandId=${command.commandId}`);
      const ack: CommandAckMessage = {
        schemaVersion: SCHEMA_VERSION,
        commandId: command.commandId,
        status: 'FAILED',
        acknowledgedAt: new Date().toISOString(),
        failureCode: 'COMMAND_EXPIRED',
        failureMessage: 'Command expired before execution',
      };
      await mqttClient.publishCommandAck(ack);
      return;
    }

    const receivedAck: CommandAckMessage = {
      schemaVersion: SCHEMA_VERSION,
      commandId: command.commandId,
      status: 'RECEIVED',
      acknowledgedAt: new Date().toISOString(),
    };

    commandState.recordReceived(command.commandId, receivedAck);
    await mqttClient.publishCommandAck(receivedAck);

    const result = await barrier.open(command.commandId);
    const finalAck: CommandAckMessage = {
      schemaVersion: SCHEMA_VERSION,
      commandId: command.commandId,
      status: result.ok ? 'EXECUTED' : 'FAILED',
      acknowledgedAt: new Date().toISOString(),
      failureCode: result.failureCode,
      failureMessage: result.failureMessage,
    };

    commandState.recordFinal(command.commandId, finalAck);
    await mqttClient.publishCommandAck(finalAck);

    if (!result.ok) {
      degraded = true;
      await publishStatus();
    }
  };

  await mqttClient.connect(handleCommand);

  const httpServer = createHttpServer({
    config,
    ctx,
    detectionCtx: {
      deviceAuth: config.edge.deviceCredential,
    },
    publishDetection: (message) => mqttClient.publishDetection(message),
    getHealth: () => ({
      status: 'ok',
      mqttConnected: mqttClient.isConnected(),
      barrierMode: barrier.mode,
      organizationId: ctx.organizationId,
      gateId: ctx.gateId,
      deviceId: ctx.externalDeviceId,
      degraded,
      uptimeSeconds: Math.floor(process.uptime()),
    }),
  });

  await startHttpServer(httpServer, config.httpPort);

  const heartbeat = setInterval(() => {
    void publishStatus();
  }, config.heartbeatIntervalMs);

  void publishStatus();

  const shutdown = async (signal: string) => {
    console.info(`[edge] shutting down (${signal})`);
    clearInterval(heartbeat);
    httpServer.close();
    await mqttClient.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error) => {
  console.error('[edge] fatal startup error', error);
  process.exit(1);
});