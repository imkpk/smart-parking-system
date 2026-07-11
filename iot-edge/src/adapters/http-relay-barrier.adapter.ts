import type { BarrierAdapter, BarrierOpenResult } from './barrier-adapter.js';

function sanitizeRelayErrorMessage(message: string): string {
  return message.replace(/\/\/[^@/]+@/g, '//[redacted]@');
}

export class HttpRelayBarrierAdapter implements BarrierAdapter {
  readonly mode = 'HTTP_RELAY' as const;

  constructor(
    private readonly relayUrl: string,
    private readonly timeoutMs: number,
    private readonly method: 'POST' | 'PUT' = 'POST',
    private readonly authHeaderName?: string,
    private readonly authHeaderValue?: string,
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.authHeaderName && this.authHeaderValue) {
        headers[this.authHeaderName] = this.authHeaderValue;
      }

      const response = await this.fetchImpl(this.relayUrl, {
        method: this.method,
        headers,
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
      const rawMessage =
        error instanceof Error && error.name === 'AbortError'
          ? `Relay request timed out after ${this.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : 'Unknown relay error';
      return {
        ok: false,
        failureCode: 'RELAY_UNREACHABLE',
        failureMessage: sanitizeRelayErrorMessage(rawMessage),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}