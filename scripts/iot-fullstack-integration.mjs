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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(path.join(ROOT, 'backend/package.json'));
const { PrismaClient } = require('@prisma/client');
const mqtt = require('mqtt');

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

const PAYMENT_DB = process.env.PAYMENT_DB_NAME ?? 'parking_payment_db';
const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL ?? 'demo-admin@smartparking.demo';
const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD ?? 'password123';

const prisma = new PrismaClient();
const results = [];

/** Monotonic lower bounds so queries cannot match records from earlier scenarios. */
const correlation = {
  minAttemptId: 0,
  minDetectionId: 0,
  minCommandRowId: 0,
};

let cachedAdminToken = null;

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

function filterAcksForCommand(acks, commandId) {
  return acks.filter(
    (ack) => typeof ack === 'object' && ack !== null && ack.commandId === commandId,
  );
}

async function getDemoAdminToken() {
  if (cachedAdminToken) {
    return cachedAdminToken;
  }

  const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Admin login failed (${response.status}): ${body}`);
  }

  const payload = await response.json();
  cachedAdminToken = payload.accessToken;
  assert(cachedAdminToken, 'Admin login did not return accessToken');
  return cachedAdminToken;
}

async function simulateDetectionViaBackend(token, input) {
  const response = await fetch(`${BACKEND_URL}/api/iot/simulator/detections`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      externalDeviceId: input.externalDeviceId,
      messageId: input.messageId,
      identifierType: 'PLATE',
      identifier: input.plate,
      confidence: input.confidence ?? 0.95,
      occurredAt: input.occurredAt ?? new Date().toISOString(),
      deviceAuth: input.deviceAuth,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Simulator detection failed (${response.status}): ${body}`);
  }

  return response.json();
}

function countPaymentsForParkingEvent(parkingEventId) {
  try {
    const output = execSync(
      `PGPASSWORD=${process.env.DB_PASSWORD ?? 'password'} psql -h 127.0.0.1 -U ${process.env.DB_USERNAME ?? 'postgres'} -d ${PAYMENT_DB} -t -A -c "SELECT COUNT(*) FROM payments WHERE parking_event_id = ${parkingEventId};"`,
      { stdio: 'pipe' },
    )
      .toString()
      .trim();
    return Number(output);
  } catch {
    return 0;
  }
}

async function assertMqttBrokerUnavailable() {
  await new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_URL, { reconnectPeriod: 0, connectTimeout: 2_000 });
    const timer = setTimeout(() => {
      client.end(true);
      resolve();
    }, 2_500);

    client.on('connect', () => {
      clearTimeout(timer);
      client.end(true);
      reject(new Error('MQTT broker should be unavailable while Mosquitto is stopped'));
    });

    client.on('error', () => {
      clearTimeout(timer);
      client.end(true);
      resolve();
    });
  });
}

async function waitForMqttBroker() {
  await new Promise((resolve, reject) => {
    const client = mqtt.connect(MQTT_URL, { reconnectPeriod: 0, connectTimeout: 5_000 });
    const timer = setTimeout(() => {
      client.end(true);
      reject(new Error('Timed out waiting for MQTT broker'));
    }, 6_000);

    client.on('connect', () => {
      clearTimeout(timer);
      client.end(true);
      resolve();
    });

    client.on('error', (error) => {
      clearTimeout(timer);
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

    client.on('error', () => {
      // Keep waiting until timeout when the broker is temporarily unavailable.
    });
  });
}

async function waitForDetection(where, { timeoutMs = 25_000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const detection = await prisma.gateDetection.findFirst({
      where: {
        ...where,
        id: { gt: correlation.minDetectionId },
      },
      orderBy: { id: 'asc' },
    });

    if (detection) {
      return detection;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for gate detection: ${JSON.stringify(where)}`);
}

async function waitForAccessAttempt(where, { timeoutMs = 25_000, minId } = {}) {
  const deadline = Date.now() + timeoutMs;
  const attemptMinId = minId ?? correlation.minAttemptId;

  while (Date.now() < deadline) {
    const attempt = await prisma.gateAccessAttempt.findFirst({
      where: {
        ...where,
        id: { gt: attemptMinId },
      },
      orderBy: { id: 'asc' },
    });

    if (attempt) {
      return attempt;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for gate access attempt: ${JSON.stringify(where)}`);
}

async function waitForAccessAttemptForDetection(detectionId, where = {}, options = {}) {
  return waitForAccessAttempt({ ...where, detectionId }, options);
}

async function waitForGateCommand(where, status, { timeoutMs = 25_000 } = {}) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const command = await prisma.gateCommand.findFirst({
      where: {
        ...where,
        status,
        id: { gt: correlation.minCommandRowId },
      },
      orderBy: { id: 'asc' },
    });

    if (command) {
      return command;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for gate command status ${status}`);
}

async function countGateCommands(where) {
  return prisma.gateCommand.count({
    where: {
      ...where,
      id: { gt: correlation.minCommandRowId },
    },
  });
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
  const where = {
    organizationId: ORG_ID,
    parkingLotId: markerLotId,
    status: 'CONFIRMED',
    vehicle: {
      events: {
        none: {
          organizationId: ORG_ID,
          status: 'ACTIVE',
          checkOutTime: null,
        },
      },
    },
  };

  if (excludeVehicleIds.length > 0) {
    where.vehicleId = { notIn: excludeVehicleIds };
  }

  const booking = await prisma.booking.findFirst({
    where,
    include: { vehicle: true },
    orderBy: { id: 'asc' },
  });

  assert(booking?.vehicle, 'No vehicle with confirmed booking and no active session');
  return booking;
}

async function findActiveExitCandidate(markerLotId, excludeEventIds = []) {
  const where = {
    organizationId: ORG_ID,
    parkingLotId: markerLotId,
    status: 'ACTIVE',
    checkOutTime: null,
  };

  if (excludeEventIds.length > 0) {
    where.id = { notIn: excludeEventIds };
  }

  const event = await prisma.parkingEvent.findFirst({
    where,
    include: { vehicle: true },
    orderBy: { id: 'asc' },
  });

  assert(event?.vehicle, 'No active parking session at marker lot for exit flow');
  return event;
}

async function scenarioAnprEntryGrant(ctx, excludeVehicleIds = []) {
  const booking = await findEntryCandidate(ctx.markerLot.id, excludeVehicleIds);
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

  const acks = filterAcksForCommand(await ackCollector, attempt.commandId);
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

async function scenarioDuplicateDetection(ctx, bookingOverride) {
  const booking = bookingOverride ?? (await findEntryCandidate(ctx.markerLot.id));
  const plate = booking.vehicle.vehicleNumber;
  const firstMessageId = `fs-dup-a-${Date.now()}`;
  const secondMessageId = `fs-dup-b-${Date.now()}`;

  const commandsBefore = await countGateCommands({
    gateId: ctx.entryGate.id,
    accessAttempt: { vehicleId: booking.vehicle.id },
  });

  await publishDetection(EDGE_ENTRY, ENTRY_CREDENTIAL, {
    messageId: firstMessageId,
    plate,
    confidence: 0.95,
  });

  const firstDetection = await waitForDetection({
    gateId: ctx.entryGate.id,
    messageId: firstMessageId,
  });

  const grantedAttempt = await waitForAccessAttemptForDetection(firstDetection.id, {
    gateId: ctx.entryGate.id,
    vehicleId: booking.vehicle.id,
    decision: 'GRANTED',
  });
  assert(grantedAttempt.commandId, 'First detection should open the gate once');

  const commandsAfterFirst = await countGateCommands({
    gateId: ctx.entryGate.id,
    accessAttempt: { vehicleId: booking.vehicle.id },
  });
  assert(
    commandsAfterFirst === commandsBefore + 1,
    'Duplicate scenario should create exactly one gate command on first detection',
  );

  await publishDetection(EDGE_ENTRY, ENTRY_CREDENTIAL, {
    messageId: secondMessageId,
    plate,
    confidence: 0.95,
  });

  const secondDetection = await waitForDetection({
    gateId: ctx.entryGate.id,
    messageId: secondMessageId,
  });

  const duplicateAttempt = await waitForAccessAttemptForDetection(secondDetection.id, {
    gateId: ctx.entryGate.id,
    reasonCode: 'DUPLICATE_DETECTION',
  });

  assert(duplicateAttempt.decision === 'DENIED', 'Duplicate detection must be denied');
  assert(!duplicateAttempt.commandId, 'Duplicate detection must not create a gate command');

  const commandsAfterDuplicate = await countGateCommands({
    gateId: ctx.entryGate.id,
    accessAttempt: { vehicleId: booking.vehicle.id },
  });
  assert(
    commandsAfterDuplicate === commandsAfterFirst,
    'Duplicate detection must not pulse the barrier twice',
  );

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

  const detection = await waitForDetection({
    gateId: ctx.entryGate.id,
    messageId,
  });

  const attempt = await waitForAccessAttemptForDetection(detection.id, {
    gateId: ctx.entryGate.id,
    decision: 'DENIED',
    reasonCode: 'VEHICLE_NOT_FOUND',
  });

  assert(!attempt.commandId, 'Denied detection must not create a gate command');
}

async function scenarioAutomaticExitWithPayment(ctx, consumedEventIds) {
  const activeEvent = await findActiveExitCandidate(ctx.markerLot.id, consumedEventIds);
  assert(activeEvent.status === 'ACTIVE', 'Exit scenario requires an active parking session');
  const messageId = `fs-exit-pay-${Date.now()}`;
  const paymentsBefore = countPaymentsForParkingEvent(activeEvent.id);

  const ackCollector = collectMqttMessages(
    `${MQTT_PREFIX}/${ORG_ID}/${EDGE_EXIT}/acks`,
    { timeoutMs: 35_000, minCount: 2 },
  );

  await publishDetection(EDGE_EXIT, EXIT_CREDENTIAL, {
    messageId,
    plate: activeEvent.vehicle.vehicleNumber,
    confidence: 0.96,
  });

  const detection = await waitForDetection({
    gateId: ctx.exitGate.id,
    messageId,
  });

  const attempt = await waitForAccessAttemptForDetection(detection.id, {
    gateId: ctx.exitGate.id,
    decision: 'GRANTED',
    vehicleId: activeEvent.vehicle.id,
  });
  assert(attempt.commandId, 'Successful exit must create a gate command after payment');

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

  const paymentsAfter = countPaymentsForParkingEvent(activeEvent.id);
  assert(
    paymentsAfter > paymentsBefore,
    'Spring payment service should persist a payment row for IoT checkout',
  );

  const acks = filterAcksForCommand(await ackCollector, attempt.commandId);
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

  const commandCollector = collectMqttMessages(
    `${MQTT_PREFIX}/${ORG_ID}/${EDGE_EXIT}/commands`,
    { timeoutMs: 8_000, minCount: 99 },
  ).catch(() => []);

  await publishDetection(EDGE_EXIT, EXIT_CREDENTIAL, {
    messageId,
    plate: activeEvent.vehicle.vehicleNumber,
    confidence: 0.94,
  });

  const detection = await waitForDetection({
    gateId: ctx.exitGate.id,
    messageId,
  });

  const attempt = await waitForAccessAttemptForDetection(detection.id, {
    gateId: ctx.exitGate.id,
    vehicleId: activeEvent.vehicle.id,
    decision: 'ERROR',
    reasonCode: 'PAYMENT_INITIATION_FAILED',
  });

  assert(!attempt.commandId, 'Payment failure must not open exit gate');

  const publishedCommands = await commandCollector;
  assert(
    publishedCommands.length === 0,
    'Payment failure must not publish an MQTT gate command',
  );

  const completedEvent = await prisma.parkingEvent.findUnique({
    where: { id: activeEvent.id },
  });
  assert(
    completedEvent?.status === 'COMPLETED',
    'Checkout transaction completes before payment gate check',
  );
}

async function scenarioMqttRetry(ctx, excludeVehicleIds) {
  const stopped = await stopMosquitto();
  assert(stopped, 'Mosquitto container must be stoppable for MQTT retry scenario');
  await assertMqttBrokerUnavailable();

  const booking = await findEntryCandidate(ctx.markerLot.id, excludeVehicleIds);
  const messageId = `fs-retry-${Date.now()}`;
  const plate = booking.vehicle.vehicleNumber;
  const token = await getDemoAdminToken();

  await simulateDetectionViaBackend(token, {
    externalDeviceId: EDGE_ENTRY,
    messageId,
    plate,
    deviceAuth: ENTRY_CREDENTIAL,
  });

  const detection = await waitForDetection({
    gateId: ctx.entryGate.id,
    messageId,
  });

  const attempt = await waitForAccessAttemptForDetection(detection.id, {
    gateId: ctx.entryGate.id,
    vehicleId: booking.vehicle.id,
    decision: 'GRANTED',
  });
  assert(attempt.commandId, 'Gate command should be created before MQTT retry test');

  await waitForOutboxAttempts(attempt.commandId, 1, { timeoutMs: 40_000 });

  const pendingPublish = await prisma.gateCommand.findFirst({
    where: { commandId: attempt.commandId },
  });
  assert(
    pendingPublish &&
      !['PUBLISHED', 'ACKNOWLEDGED', 'EXECUTED'].includes(pendingPublish.status),
    'MQTT retry scenario requires the command to remain unpublished while the broker is down',
  );

  await startMosquitto();
  await sleep(2_500);
  await waitForMqttBroker();

  const ackCollector = collectMqttMessages(
    `${MQTT_PREFIX}/${ORG_ID}/${EDGE_ENTRY}/acks`,
    { timeoutMs: 45_000, minCount: 2 },
  );

  await waitForGateCommand({ commandId: attempt.commandId }, 'EXECUTED', {
    timeoutMs: 45_000,
  });

  const acks = filterAcksForCommand(await ackCollector, attempt.commandId);
  assert(acks.some((ack) => ack.status === 'EXECUTED'), 'MQTT retry should execute the gate command');
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

  const acks = filterAcksForCommand(await ackCollector, attempt.commandId);
  const receivedIndex = acks.findIndex((ack) => ack.status === 'RECEIVED');
  const executedIndex = acks.findIndex((ack) => ack.status === 'EXECUTED');
  assert(receivedIndex >= 0, 'Fast ack race should emit RECEIVED');
  assert(executedIndex >= 0, 'Fast ack race should emit EXECUTED');
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

  const [maxAttempt, maxDetection, maxCommand] = await Promise.all([
    prisma.gateAccessAttempt.aggregate({ _max: { id: true } }),
    prisma.gateDetection.aggregate({ _max: { id: true } }),
    prisma.gateCommand.aggregate({ _max: { id: true } }),
  ]);
  correlation.minAttemptId = maxAttempt._max.id ?? 0;
  correlation.minDetectionId = maxDetection._max.id ?? 0;
  correlation.minCommandRowId = maxCommand._max.id ?? 0;

  const gateContext = await loadGateContext();
  const usedVehicleIds = [];
  const consumedExitEventIds = [];

  await runScenario('denied detection', async () => {
    await scenarioDeniedDetection(gateContext);
  });

  await runScenario('duplicate detection', async () => {
    const booking = await findEntryCandidate(gateContext.markerLot.id);
    await scenarioDuplicateDetection(gateContext, booking);
    usedVehicleIds.push(booking.vehicle.id);
  });

  await runScenario('ANPR entry grant', async () => {
    const outcome = await scenarioAnprEntryGrant(gateContext, usedVehicleIds);
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