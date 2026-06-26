import { hostname } from 'node:os';
import { OutboxWorkerConfig } from './event-types';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function parseEnabled(value: string | undefined): boolean {
  if (value === undefined || value.trim() === '') {
    return true;
  }

  const normalized = value.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0' && normalized !== 'off' && normalized !== 'no';
}

export function resolveOutboxWorkerConfig(
  env: NodeJS.ProcessEnv = process.env,
): OutboxWorkerConfig {
  const workerId = `${hostname()}-${process.pid}`;

  return {
    enabled: parseEnabled(env.OUTBOX_WORKER_ENABLED),
    intervalMs: parsePositiveInt(env.OUTBOX_WORKER_INTERVAL_MS, 5_000),
    batchSize: parsePositiveInt(env.OUTBOX_WORKER_BATCH_SIZE, 10),
    workerId,
  };
}

export function computeNextRunAt(attempts: number, now = new Date()): Date {
  const delayMs = Math.min(60_000, Math.max(1_000, attempts * 5_000));
  return new Date(now.getTime() + delayMs);
}