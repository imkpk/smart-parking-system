import { describe, expect, it } from 'vitest';

import { SimulatedBarrierAdapter } from '../src/adapters/simulated-barrier.adapter.js';

describe('SimulatedBarrierAdapter', () => {
  it('opens barrier after configured delay', async () => {
    const adapter = new SimulatedBarrierAdapter(10);
    const started = Date.now();
    const result = await adapter.open('cmd-123');
    const elapsed = Date.now() - started;

    expect(result.ok).toBe(true);
    expect(elapsed).toBeGreaterThanOrEqual(8);
    expect(adapter.mode).toBe('SIMULATED');
  });

  it('fails when commandId is missing', async () => {
    const adapter = new SimulatedBarrierAdapter(0);
    const result = await adapter.open('  ');

    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe('INVALID_COMMAND');
  });
});