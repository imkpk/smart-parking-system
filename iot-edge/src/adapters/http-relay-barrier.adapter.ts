import type { BarrierAdapter, BarrierOpenResult } from './barrier-adapter.js';

export class HttpRelayBarrierAdapter implements BarrierAdapter {
  readonly mode = 'HTTP_RELAY' as const;

  constructor(
    private readonly relayUrl: string,
    private readonly timeoutMs: number,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async open(commandId: string): Promise<BarrierOpenResult> {
    if (!commandId.trim()) {
      return {
        ok: false,
        failureCode: 'INVALID_COMMAND',
        failureMessage: 'commandId is required',
      };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchImpl(this.relayUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commandId, action: 'OPEN' }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          ok: false,
          failureCode: 'RELAY_HTTP_ERROR',
          failureMessage: `Relay responded with HTTP ${response.status}`,
        };
      }

      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown relay error';
      return {
        ok: false,
        failureCode: 'RELAY_UNREACHABLE',
        failureMessage: message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}