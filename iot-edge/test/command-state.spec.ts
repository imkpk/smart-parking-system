import { describe, expect, it } from 'vitest';

import { SCHEMA_VERSION } from '../src/contracts/messages.js';
import { CommandState } from '../src/state/command-state.js';

describe('CommandState', () => {
  it('marks first command as NEW and duplicates subsequent ids', () => {
    const state = new CommandState(60_000);
    const expiresAt = new Date(Date.now() + 10_000).toISOString();

    expect(state.check('cmd-1', expiresAt).disposition).toBe('NEW');
    expect(state.check('cmd-1', expiresAt).disposition).toBe('DUPLICATE');
    expect(state.size()).toBe(1);
  });

  it('rejects expired commands', () => {
    const state = new CommandState(60_000);
    const expiresAt = new Date(Date.now() - 1_000).toISOString();

    expect(state.check('cmd-expired', expiresAt).disposition).toBe('EXPIRED');
    expect(state.size()).toBe(0);
  });

  it('stores and replays RECEIVED and final ack payloads for duplicates', () => {
    const state = new CommandState(60_000);
    const expiresAt = new Date(Date.now() + 10_000).toISOString();

    expect(state.check('cmd-replay', expiresAt).disposition).toBe('NEW');

    const receivedAck = {
      schemaVersion: SCHEMA_VERSION,
      commandId: 'cmd-replay',
      status: 'RECEIVED' as const,
      acknowledgedAt: '2026-07-11T10:00:00.000Z',
    };
    const finalAck = {
      schemaVersion: SCHEMA_VERSION,
      commandId: 'cmd-replay',
      status: 'EXECUTED' as const,
      acknowledgedAt: '2026-07-11T10:00:01.000Z',
    };

    state.recordReceived('cmd-replay', receivedAck);
    state.recordFinal('cmd-replay', finalAck);

    expect(state.check('cmd-replay', expiresAt).disposition).toBe('DUPLICATE');
    expect(state.getReplayAcks('cmd-replay')).toEqual([receivedAck, finalAck]);
  });

  it('replays only RECEIVED when final ack is not yet recorded', () => {
    const state = new CommandState(60_000);
    const expiresAt = new Date(Date.now() + 10_000).toISOString();

    expect(state.check('cmd-inflight', expiresAt).disposition).toBe('NEW');

    const receivedAck = {
      schemaVersion: SCHEMA_VERSION,
      commandId: 'cmd-inflight',
      status: 'RECEIVED' as const,
      acknowledgedAt: '2026-07-11T10:00:00.000Z',
    };

    state.recordReceived('cmd-inflight', receivedAck);

    expect(state.getReplayAcks('cmd-inflight')).toEqual([receivedAck]);
  });

  it('replays FAILED final ack without requiring barrier execution', () => {
    const state = new CommandState(60_000);
    const expiresAt = new Date(Date.now() + 10_000).toISOString();

    expect(state.check('cmd-failed', expiresAt).disposition).toBe('NEW');

    const receivedAck = {
      schemaVersion: SCHEMA_VERSION,
      commandId: 'cmd-failed',
      status: 'RECEIVED' as const,
      acknowledgedAt: '2026-07-11T10:00:00.000Z',
    };
    const finalAck = {
      schemaVersion: SCHEMA_VERSION,
      commandId: 'cmd-failed',
      status: 'FAILED' as const,
      acknowledgedAt: '2026-07-11T10:00:02.000Z',
      failureCode: 'RELAY_UNREACHABLE',
      failureMessage: 'connection refused',
    };

    state.recordReceived('cmd-failed', receivedAck);
    state.recordFinal('cmd-failed', finalAck);

    expect(state.getReplayAcks('cmd-failed')).toEqual([receivedAck, finalAck]);
  });
});