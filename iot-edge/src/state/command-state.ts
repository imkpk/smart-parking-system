import type { CommandAckMessage } from '../contracts/messages.js';

export type CommandDisposition = 'NEW' | 'DUPLICATE' | 'EXPIRED';

export interface CommandCheckResult {
  disposition: CommandDisposition;
}

interface SeenCommand {
  seenAt: number;
  receivedAck?: CommandAckMessage;
  finalAck?: CommandAckMessage;
}

export class CommandState {
  private readonly seen = new Map<string, SeenCommand>();

  constructor(private readonly dedupeTtlMs: number) {}

  check(commandId: string, expiresAtIso: string, now = Date.now()): CommandCheckResult {
    this.prune(now);

    const expiresAt = Date.parse(expiresAtIso);
    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      return { disposition: 'EXPIRED' };
    }

    if (this.seen.has(commandId)) {
      return { disposition: 'DUPLICATE' };
    }

    this.seen.set(commandId, { seenAt: now });
    return { disposition: 'NEW' };
  }

  recordReceived(commandId: string, ack: CommandAckMessage): void {
    const entry = this.seen.get(commandId);
    if (!entry) {
      return;
    }

    entry.receivedAck = ack;
  }

  recordFinal(commandId: string, ack: CommandAckMessage): void {
    const entry = this.seen.get(commandId);
    if (!entry) {
      return;
    }

    entry.finalAck = ack;
  }

  getReplayAcks(commandId: string): CommandAckMessage[] {
    const entry = this.seen.get(commandId);
    if (!entry) {
      return [];
    }

    const replay: CommandAckMessage[] = [];
    if (entry.receivedAck) {
      replay.push(entry.receivedAck);
    }
    if (entry.finalAck) {
      replay.push(entry.finalAck);
    }

    return replay;
  }

  size(): number {
    return this.seen.size;
  }

  private prune(now: number): void {
    for (const [commandId, entry] of this.seen.entries()) {
      if (now - entry.seenAt > this.dedupeTtlMs) {
        this.seen.delete(commandId);
      }
    }
  }
}