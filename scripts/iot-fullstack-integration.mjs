#!/usr/bin/env node
/**
 * Full-stack IoT gate lifecycle integration harness.
 *
 * Prerequisites (started by CI or docker-compose.fullstack-iot.yml):
 *   - PostgreSQL with demo seed (DEMO_RESEED=1 npm run prisma:demo-seed)
 *   - Mosquitto on MQTT_BROKER_URL (default mqtt://127.0.0.1:1883)
 *   - NestJS backend with IOT_ENABLED=true
 *   - Spring payment-service on PAYMENT_SERVICE_URL
 *   - iot-edge entry gateway (edge-gw-demo-001)
 *
 * Usage:
 *   node scripts/iot-fullstack-integration.mjs
 */

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mqtt from 'mqtt';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(path.join(ROOT, 'backend/package.json'));
const { PrismaClient } = require('@prisma/client');

const ORG_ID = Number(process.env.ORGANIZATION_ID ?? 1);
const MQTT_URL = process.env.MQTT_BROKER_URL ?? 'mqtt://127.0.0.1:1883';
const MQTT_PREFIX = process.env.MQTT_TOPIC_PREFIX ?? 'smart-parking';
const EDGE_URL = process.env.EDGE_URL ?? 'http://127.0.0.1:3100';
const EDGE_API_KEY = process.env.EDGE_LOCAL_API_KEY ?? 'dev-edge-key';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:3000';
const PAYMENT_URL = process.env.PAYMENT_SERVICE_URL ?? 'http://127.0.0.1:8081';
const MARKER_LOT = process.env.DEMO_MARKER_LOT ?? 'Hitech City Mall Parking';

const EDGE_ENTRY = process.env.EXTERNAL_DEVICE_ID ?? 'edge-gw-demo-001';
const EDGE_EXIT = process.env.EXIT_EXTERNAL_DEVICE_ID ?? 'edge-gw-demo-exit';
const ENTRY_CREDENTIAL =
  process.env.EDGE_DEVICE_CREDENTIAL ?? 'demo-device-credential-not-a-real-secret';
const EXIT_CREDENTIAL =
  process.env.EXIT_DEVICE_CREDENTIAL ?? 'demo-exit-device-credential';

const MOSQUITTO_CONTAINER =
  process.env.MOSQUITTO_CONTAINER ?? 'smart-parking-mosquitto';

const prisma = new PrismaClient();
const results = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHttp(url, attempts = 60, delayMs = 2000) {
  for (let i = 1; i <= attempts; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // retry
    }
    await sleep(delayMs);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function runDocker(args) {
  try {
    execSync(`docker ${args}`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function mosquittoContainerRunning() {
  try {
    const output = execSync(
      `docker inspect -f '{{.State.Running}}' ${MOSQUITTO_CONTAINER}`,
      { stdio: 'pipe' },
    )
      .toString()
      .trim();
    return output === 'true';
  } catch {
    return false;
  }
}

async function stopMosquitto() {
  if (!mosquittoContainerRunning()) {
    return false;
  }
  return runDocker(`stop ${MOSQUITTO_CONTAINER}`);
}

async function startMosquitto() {
  if (mosquittoContainerRunning()) {
    return true;
  }
  return runDocker(`start ${MOSQUITTO_CONTAINER}`);
}

async function postEdgeAnpr(payload) {
  const response = await fetch(`${EDGE_URL}/vendor/anpr`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': EDGE_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Edge ANPR failed (${response.status}): ${body}`);
  }

  return response.json();
}

function publishDetection(deviceId, credential, message) {
  return new Promise((resolve, reject) => {
    const topic = `${MQTT_PREFIX}/${ORG_ID}/${deviceId}/detections`;
    const client = mqtt.connect(MQTT_URL, { reconnectPeriod: 0 });

    client.on('connect', () => {
      const payload = {
        schemaVersion: 1,
        messageId: message.messageId,
        identifierType: 'PLATE',
        identifier: message.plate,
        confidence: message.confidence ?? 0.95,
        occurredAt: message.occurredAt ?? new Date().toISOString(),
        source: 'ANPR',
        deviceAuth: credential,
      };

      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (error) => {
        client.end(true);
        if (error) {
          reject(error);
          return;
        }
        resolve(payload);
      });
    });

    client.on('error', (error) => {
      client.end(true);
      reject(error);
    });
  });
}

function collectMqttMessages(topic, { timeoutMs = 25_000, minCount = 1 } = {}) {
  return new Promise((resolve, reject) => {
    const messages = [];
    const client = mqtt.connect(MQTT_URL, { reconnectPeriod: 0 });

    const timer = setTimeout(() => {
      client.end(true);
      if (messages.length >= minCount) {
        resolve(messages);
        return;
      }
      reject(new Error(`Timed out collecting MQTT messages on ${topic}`));
    }, timeoutMs);

    client.on('connect', () => {
      client.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          clearTimeout(timer);
          client.end(true);
          reject(error);
        }
      });
    });

    client.on('message', (_topic, payload) => {
      try {
        messages.push(JSON.parse(payload.toString('utf8')));
      } catch {
        messages.push(payload.toString('utf8'));
      }

      if (messages.length >= minCount) {
        clearTimeout(timer);
        client.end(true);
        resolve(messages);
      }
    });

    client.on('error', (error) => {
      clearTimeout(timer);
      client.end(true);
      reject(error);
    });
  });
}

async function waitForAccessAttempt(where, { timeoutMs = 25_000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const attempt = await prisma.gateAccessAttempt.findFirst({
      where,
      orderBy: { id: 'desc' },
    });

    if (attempt) {
      return attempt;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for gate access attempt: ${JSON.stringify(where)}`);
}

async function waitForGateCommand(where, status, { timeoutMs = 25_000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const command = await prisma.gateCommand.findFirst({
      where: { ...where, status },
      orderBy: { id: 'desc' },
    });

    if (command) {
      return command;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for gate command status ${status}`);
}

async function waitForOutboxAttempts(aggregateId, minAttempts, { timeoutMs = 35_000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const event = await prisma.outboxEvent.findFirst({
      where: {
        aggregateId,
        eventType: 'GATE_OPEN_REQUESTED',
      },
      orderBy: { id: 'desc' },
    });

    if (event && event.attempts >= minAttempts) {
      return event;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for outbox retries on ${aggregateId}`);
}

async function loadGateContext() {
  const markerLot = await prisma.parkingLot.findFirst({
    where: { organizationId: ORG_ID, name: MARKER_LOT },
  });
  assert(markerLot, `Marker lot "${MARKER_LOT}" not found — run DEMO_RESEED=1 npm run prisma:demo-seed`);

  const entryGate = await prisma.gate.findFirst({
    where: { organizationId: ORG_ID, externalId: 'ENTRY-01' },
  });
  const exitGate = await prisma.gate.findFirst({
    where: { organizationId: ORG_ID, externalId: 'EXIT-01' },
  });

  assert(entryGate && exitGate, 'Demo IoT gates ENTRY-01 / EXIT-01 not seeded');

  return { markerLot, entryGate, exitGate };
}

async function findEntryCandidate(markerLotId, excludeVehicleIds = []) {
  const booking = await prisma.booking.findFirst({
    where: {
      organizationId: ORG_ID,
      parkingLotId: markerLotId,
      status: 'CONFIRMED',
      vehicleId: excludeVehicleIds.length
        ? { notIn: excludeVehicleIds }
        : undefined,
      vehicle: {
        parkingEvents: {
          none: {
            organizationId: ORG_ID,
            status: 'ACTIVE',
            checkOutTime: null,
          },
        },
      },
    },
    include: { vehicle: true },
    orderBy: { id: 'asc' },
  });

  assert(booking?.vehicle, 'No vehicle with confirmed booking and no active session');
  return booking;
}

async function findActiveExitCandidate(markerLotId, excludeEventIds = []) {
  const event = await prisma.parkingEvent.findFirst({
    where: {
      organizationId: ORG_ID,
      parkingLotId: markerLotId,
      status: 'ACTIVE',
      checkOutTime: null,
      id: excludeEventIds.length ? { notIn: excludeEventIds } : undefined,
    },
    include: { vehicle: true },
    orderBy: { id: 'asc' },
  });

  assert(event?.vehicle, 'No active parking session at marker lot for exit flow');
  return event;
}

async function scenarioAnprEntryGrant(ctx) {
  const booking = await findEntryCandidate(ctx.markerLot.id);
  const messageId = `fs-entry-${Date.now()}`;
  const plate = booking.vehicle.vehicleNumber;

  const ackCollector = collectMqttMessages(
    `${MQTT_PREFIX}/${ORG_ID}/${EDGE_ENTRY}/acks`,
    { timeoutMs: 30_000, minCount: 2 },
  );

  await postEdgeAnpr({
    plate,
    confidence: 0.95,
    capturedAt: new Date().toISOString(),
    messageId,
  });

  const attempt = await waitForAccessAttempt({
    gateId: ctx.entryGate.id,
    decision: 'GRANTED',
    vehicleId: booking.vehicle.id,
  });

  const command = await waitForGateCommand(
    { gateId: ctx.entryGate.id, commandId: attempt.commandId },
    'EXECUTED',
    { timeoutMs: 35_000 },
  );

  const acks = await ackCollector;
  const statuses = acks.map((ack) => ack.status);
  assert(statuses.includes('RECEIVED'), 'Expected RECEIVED ack from edge gateway');
  assert(statuses.includes('EXECUTED'), 'Expected EXECUTED ack from edge gateway');

  const parkingEvent = await prisma.parkingEvent.findFirst({
    where: {
      organizationId: ORG_ID,
      bookingId: booking.id,
      status: 'ACTIVE',
    },
  });
  assert(parkingEvent, 'Entry grant should create an active parking event');

  return { attempt, command, parkingEvent, plate, vehicleId: booking.vehicle.id };
}

async function scenarioDuplicateDetection(ctx) {
  const booking = await findEntryCandidate(ctx.markerLot.id);
  const plate = booking.vehicle.vehicleNumber;
  const firstMessageId = `fs-dup-a-${Date.now()}`;
  const secondMessageId = `fs-dup-b-${Date.now()}`;

  await publishDetection(EDGE_ENTRY, ENTRY_CREDENTIAL, {
    messageId: firstMessageId,
    plate,
    confidence: 0.95,
  });

  await waitForAccessAttempt({
    gateId: ctx.entryGate.id,
    vehicleId: booking.vehicle.id,
    decision: 'GRANTED',
  });

  await publishDetection(EDGE_ENTRY, ENTRY_CREDENTIAL, {
    messageId: secondMessageId,
    plate,
    confidence: 0.95,
  });

  const duplicateAttempt = await waitForAccessAttempt({
    gateId: ctx.entryGate.id,
    reasonCode: 'DUPLICATE_DETECTION',
  });

  assert(duplicateAttempt.decision === 'DENIED', 'Duplicate detection must be denied');

  const detectionCount = await prisma.gateDetection.count({
    where: {
      gateId: ctx.entryGate.id,
      messageId: { in: [firstMessageId, secondMessageId] },
    },
  });
  assert(detectionCount === 2, 'Both detections should be persisted');
}

async function scenarioDeniedDetection(ctx) {
  const messageId = `fs-denied-${Date.now()}`;
  const plate = `ZZ99XX${String(Date.now()).slice(-4)}`;

  await publishDetection(EDGE_ENTRY, ENTRY_CREDENTIAL, {
    messageId,
    plate,
    confidence: 0.92,
  });

  const attempt = await waitForAccessAttempt({
    gateId: ctx.entryGate.id,
    decision: 'DENIED',
    reasonCode: 'VEHICLE_NOT_FOUND',
  });

  assert(!attempt.commandId, 'Denied detection must not create a gate command');
}

async function scenarioAutomaticExitWithPayment(ctx, consumedEventIds) {
  const activeEvent = await findActiveExitCandidate(ctx.markerLot.id, consumedEventIds);
  const messageId = `fs-exit-pay-${Date.now()}`;

  const ackCollector = collectMqttMessages(
    `${MQTT_PREFIX}/${ORG_ID}/${EDGE_EXIT}/acks`,
    { timeoutMs: 35_000, minCount: 2 },
  );

  await publishDetection(EDGE_EXIT, EXIT_CREDENTIAL, {
    messageId,
    plate: activeEvent.vehicle.vehicleNumber,
    confidence: 0.96,
  });

  const attempt = await waitForAccessAttempt({
    gateId: ctx.exitGate.id,
    decision: 'GRANTED',
    vehicleId: activeEvent.vehicle.id,
  });

  await waitForGateCommand(
    { gateId: ctx.exitGate.id, commandId: attempt.commandId },
    'EXECUTED',
    { timeoutMs: 35_000 },
  );

  const completedEvent = await prisma.parkingEvent.findUnique({
    where: { id: activeEvent.id },
  });
  assert(completedEvent?.status === 'COMPLETED', 'Exit should complete parking session');
  assert(Number(completedEvent.feeAmount ?? 0) >= 0.01, 'Exit fee should be calculated');

  const acks = await ackCollector;
  assert(acks.some((ack) => ack.status === 'EXECUTED'), 'Exit gate command should execute');

  return activeEvent.id;
}

async function stopPaymentService() {
  const pidFile = path.join(ROOT, 'payment-iot.pid');
  let pid = null;

  try {
    pid = Number(execSync(`cat ${pidFile}`, { stdio: 'pipe' }).toString().trim());
  } catch {
    pid = null;
  }

  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    return false;
  }

  await sleep(2000);
  return true;
}

async function scenarioPaymentFailureBlocksGate(ctx, consumedEventIds) {
  const activeEvent = await findActiveExitCandidate(ctx.markerLot.id, consumedEventIds);
  const messageId = `fs-exit-blocked-${Date.now()}`;

  const stopped = await stopPaymentService();
  assert(stopped, 'Payment service PID file missing — cannot run payment failure scenario');

  const paymentDown = await fetch(`${PAYMENT_URL}/actuator/health`).then(
    (response) => response.ok,
    () => false,
  );
  assert(!paymentDown, 'Payment service must be stopped for this scenario');

  await publishDetection(EDGE_EXIT, EXIT_CREDENTIAL, {
    messageId,
    plate: activeEvent.vehicle.vehicleNumber,
    confidence: 0.94,
  });

  const attempt = await waitForAccessAttempt({
    gateId: ctx.exitGate.id,
    vehicleId: activeEvent.vehicle.id,
    decision: 'ERROR',
    reasonCode: 'ORCHESTRATION_FAILED',
  });

  assert(!attempt.commandId, 'Payment failure must not open exit gate');

  const completedEvent = await prisma.parkingEvent.findUnique({
    where: { id: activeEvent.id },
  });
  assert(
    completedEvent?.status === 'COMPLETED',
    'Checkout transaction completes before payment gate check',
  );
}

async function scenarioMqttRetry(ctx, excludeVehicleIds) {
  const booking = await findEntryCandidate(ctx.markerLot.id, excludeVehicleIds);
  const messageId = `fs-retry-${Date.now()}`;
  const plate = booking.vehicle.vehicleNumber;

  await postEdgeAnpr({
    plate,
    confidence: 0.95,
    capturedAt: new Date().toISOString(),
    messageId,
  });

  const attempt = await waitForAccessAttempt({
    gateId: ctx.entryGate.id,
    vehicleId: booking.vehicle.id,
    decision: 'GRANTED',
  });
  assert(attempt.commandId, 'Gate command should be created before MQTT retry test');

  const stopped = await stopMosquitto();
  assert(stopped, 'Mosquitto container must be stoppable for MQTT retry scenario');

  await waitForOutboxAttempts(attempt.commandId, 1, { timeoutMs: 40_000 });

  await startMosquitto();
  await sleep(2500);

  await waitForGateCommand({ commandId: attempt.commandId }, 'PUBLISHED', {
    timeoutMs: 40_000,
  });
}

async function scenarioFastAckRace(ctx, excludeVehicleIds) {
  const booking = await findEntryCandidate(ctx.markerLot.id, excludeVehicleIds);
  const messageId = `fs-fast-ack-${Date.now()}`;
  const plate = booking.vehicle.vehicleNumber;

  const ackCollector = collectMqttMessages(
    `${MQTT_PREFIX}/${ORG_ID}/${EDGE_ENTRY}/acks`,
    { timeoutMs: 30_000, minCount: 2 },
  );

  await postEdgeAnpr({
    plate,
    confidence: 0.95,
    capturedAt: new Date().toISOString(),
    messageId,
  });

  const attempt = await waitForAccessAttempt({
    gateId: ctx.entryGate.id,
    vehicleId: booking.vehicle.id,
    decision: 'GRANTED',
  });

  const acks = await ackCollector;
  const receivedIndex = acks.findIndex((ack) => ack.status === 'RECEIVED');
  const executedIndex = acks.findIndex((ack) => ack.status === 'EXECUTED');
  assert(receivedIndex >= 0, 'Fast ack race should emit RECEIVED');
  assert(executIndex >= 0, 'Fast ack race should emit EXECUTED');
  assert(
    receivedIndex < executedIndex,
    'RECEIVED ack must arrive before EXECUTED ack',
  );

  const command = await waitForGateCommand(
    { commandId: attempt.commandId },
    'EXECUTED',
    { timeoutMs: 35_000 },
  );
  assert(command.executedAt, 'Command should be marked EXECUTED in database');
}

async function runScenario(name, fn) {
  const started = Date.now();
  try {
    await fn();
    const ms = Date.now() - started;
    results.push({ name, ok: true, ms });
    console.log(`✓ ${name} (${ms}ms)`);
  } catch (error) {
    const ms = Date.now() - started;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, ok: false, ms, message });
    console.error(`✗ ${name} (${ms}ms): ${message}`);
  }
}

async function main() {
  console.log('IoT full-stack integration');
  console.log(`  backend=${BACKEND_URL}`);
  console.log(`  edge=${EDGE_URL}`);
  console.log(`  mqtt=${MQTT_URL}`);
  console.log(`  payment=${PAYMENT_URL}`);

  await waitForHttp(`${BACKEND_URL}/api/health`);
  await waitForHttp(`${EDGE_URL}/health`);
  await waitForHttp(`${PAYMENT_URL}/actuator/health`);

  const gateContext = await loadGateContext();
  const usedVehicleIds = [];
  const consumedExitEventIds = [];

  await runScenario('denied detection', async () => {
    await scenarioDeniedDetection(gateContext);
  });

  await runScenario('duplicate detection', async () => {
    await scenarioDuplicateDetection(gateContext);
    const booking = await prisma.booking.findFirst({
      where: {
        organizationId: ORG_ID,
        parkingLotId: gateContext.markerLot.id,
        status: 'CONFIRMED',
      },
      orderBy: { id: 'asc' },
      select: { vehicleId: true },
    });
    if (booking?.vehicleId) {
      usedVehicleIds.push(booking.vehicleId);
    }
  });

  await runScenario('ANPR entry grant', async () => {
    const outcome = await scenarioAnprEntryGrant(gateContext);
    usedVehicleIds.push(outcome.vehicleId);
  });

  await runScenario('fast ack race', async () => {
    await scenarioFastAckRace(gateContext, usedVehicleIds);
  });

  await runScenario('automatic exit with payment', async () => {
    const eventId = await scenarioAutomaticExitWithPayment(gateContext, consumedExitEventIds);
    consumedExitEventIds.push(eventId);
  });

  await runScenario('payment failure blocks gate', async () => {
    await scenarioPaymentFailureBlocksGate(gateContext, consumedExitEventIds);
  });

  await runScenario('MQTT retry', async () => {
    await scenarioMqttRetry(gateContext, usedVehicleIds);
  });

  await prisma.$disconnect();

  console.log('\n--- Summary ---');
  for (const result of results) {
    console.log(
      `${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.message ? ` — ${result.message}` : ''}`,
    );
  }

  const failed = results.filter((result) => !result.ok);
  if (failed.length > 0) {
    process.exit(1);
  }

  console.log(`\nAll ${results.length} scenarios passed.`);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});