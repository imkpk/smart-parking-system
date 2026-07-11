import { afterEach, describe, expect, it } from 'vitest';

import { HttpRelayBarrierAdapter } from '../src/adapters/http-relay-barrier.adapter.js';
import { validateHttpRelayUrl } from '../src/config.js';

describe('validateHttpRelayUrl', () => {
  it('accepts loopback http relay URLs', () => {
    expect(validateHttpRelayUrl('http://127.0.0.1:8080/open', false)).toBe(
      'http://127.0.0.1:8080/open',
    );
    expect(validateHttpRelayUrl('http://localhost/open', false)).toBe('http://localhost/open');
  });

  it('accepts private network relay URLs', () => {
    expect(validateHttpRelayUrl('https://192.168.1.50/relay', false)).toBe(
      'https://192.168.1.50/relay',
    );
    expect(validateHttpRelayUrl('http://10.0.0.12/open', false)).toBe('http://10.0.0.12/open');
  });

  it('rejects non-http protocols and embedded credentials', () => {
    expect(() => validateHttpRelayUrl('ftp://127.0.0.1/open', false)).toThrow(/http or https/i);
    expect(() => validateHttpRelayUrl('http://user:pass@127.0.0.1/open', false)).toThrow(
      /embedded credentials/i,
    );
  });

  it('rejects public relay URLs unless explicitly allowed', () => {
    expect(() => validateHttpRelayUrl('https://relay.example.com/open', false)).toThrow(
      /loopback or private/i,
    );
    expect(validateHttpRelayUrl('https://relay.example.com/open', true)).toBe(
      'https://relay.example.com/open',
    );
  });
});

describe('HttpRelayBarrierAdapter', () => {
  afterEach(() => {
    delete process.env.EDGE_BARRIER_ALLOW_PUBLIC;
    delete process.env.HTTP_RELAY_URL;
  });

  it('returns success when relay responds with 200', async () => {
    const adapter = new HttpRelayBarrierAdapter(
      'http://relay/open',
      1000,
      'POST',
      undefined,
      undefined,
      async () => new Response(null, { status: 200 }),
    );

    const result = await adapter.open('cmd-abc');
    expect(result.ok).toBe(true);
    expect(adapter.mode).toBe('HTTP_RELAY');
  });

  it('returns relay HTTP error for non-2xx responses', async () => {
    const adapter = new HttpRelayBarrierAdapter(
      'http://relay/open',
      1000,
      'POST',
      undefined,
      undefined,
      async () => new Response('relay down', { status: 503 }),
    );

    const result = await adapter.open('cmd-abc');
    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe('RELAY_HTTP_ERROR');
  });

  it('returns unreachable when fetch throws', async () => {
    const adapter = new HttpRelayBarrierAdapter(
      'http://relay/open',
      1000,
      'POST',
      undefined,
      undefined,
      async () => {
        throw new Error('connection refused');
      },
    );

    const result = await adapter.open('cmd-abc');
    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe('RELAY_UNREACHABLE');
    expect(result.failureMessage).toContain('connection refused');
  });

  it('returns timeout message when relay request aborts', async () => {
    const adapter = new HttpRelayBarrierAdapter(
      'http://127.0.0.1/open',
      25,
      'POST',
      undefined,
      undefined,
      async (_url, init) => {
      const signal = init?.signal;
      await new Promise<void>((resolve, reject) => {
        if (!signal) {
          resolve();
          return;
        }

        if (signal.aborted) {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
          return;
        }

        signal.addEventListener('abort', () => {
          const error = new Error('Aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
      return new Response(null, { status: 200 });
      },
    );

    const result = await adapter.open('cmd-timeout');
    expect(result.ok).toBe(false);
    expect(result.failureCode).toBe('RELAY_UNREACHABLE');
    expect(result.failureMessage).toContain('timed out after 25ms');
  });

  it('does not echo embedded credentials in failure messages', async () => {
    const adapter = new HttpRelayBarrierAdapter(
      'http://127.0.0.1/open',
      1000,
      'POST',
      undefined,
      undefined,
      async () => {
        throw new Error('401 Unauthorized for http://user:secret@127.0.0.1/open');
      },
    );

    const result = await adapter.open('cmd-abc');
    expect(result.failureMessage).not.toContain('secret');
  });
});