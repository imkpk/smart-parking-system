import type { BarrierAdapter, BarrierOpenResult } from './barrier-adapter.js';

export class SimulatedBarrierAdapter implements BarrierAdapter {
  readonly mode = 'SIMULATED' as const;

  constructor(private readonly delayMs: number) {}

  async open(commandId: string): Promise<BarrierOpenResult> {
    if (!commandId.trim()) {
      return {
        ok: false,
        failureCode: 'INVALID_COMMAND',
        failureMessage: 'commandId is required',
      };
    }

    await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    return { ok: true };
  }
}