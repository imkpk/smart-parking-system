export interface BarrierOpenResult {
  ok: boolean;
  failureCode?: string;
  failureMessage?: string;
}

export interface BarrierAdapter {
  readonly mode: 'SIMULATED' | 'HTTP_RELAY';
  open(commandId: string): Promise<BarrierOpenResult>;
}