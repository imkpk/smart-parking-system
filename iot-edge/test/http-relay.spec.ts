import { describe, expect, it } from 'vitest';

import { HttpRelayBarrierAdapter } from '../src/adapters/http-relay-barrier.adapter.js';

describe('HttpRelayBarrierAdapter', () => {
  it('returns success when relay responds with 200', async () => {
    const adapter = new HttpRelayBarrierAdapter('http://relay/open', 1000, async () =>
      new Response(null, { status: 200 }),
    );

    const result = await adapter.open('cmd-abc');
    expect(result.ok).toBe(true);
    expect(adapter.mode).toBe('HTTP_RELAY');
  });

  it('returns relay HTTP error for non-2xx responses', async () => {
    const adapter = new HttpRelayBarrierAdapter('http://relay/open', 1000, async () =>
      new Response('relay down', { status: 503 }),
    );

    const result = await adapter.open('cmd-abc');
    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe('RELAY_HTTP_ERROR');
  });

  it('returns unreachable when fetch throws', async () => {
    const adapter = new HttpRelayBarrierAdapter('http://relay/open', 1000, async () => {
      throw new Error('connection refused');
    });

    const result = await adapter.open('cmd-abc');
    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe('RELAY_UNREACHABLE');
    expect(result.failureMessage).toContain('connection refused');
  });
});