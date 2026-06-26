import { computeNextRunAt, resolveOutboxWorkerConfig } from './outbox-worker.config';

describe('outbox-worker.config', () => {
  it('uses safe defaults when env is missing', () => {
    expect(resolveOutboxWorkerConfig({})).toEqual(
      expect.objectContaining({
        enabled: true,
        intervalMs: 5_000,
        batchSize: 10,
      }),
    );
  });

  it('can disable the worker', () => {
    expect(resolveOutboxWorkerConfig({ OUTBOX_WORKER_ENABLED: 'false' }).enabled).toBe(false);
  });

  it('computes retry backoff from attempts', () => {
    const now = new Date('2026-06-26T12:00:00.000Z');
    const nextRunAt = computeNextRunAt(2, now);

    expect(nextRunAt.getTime() - now.getTime()).toBe(10_000);
  });
});