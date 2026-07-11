import { describe, expect, it } from 'vitest';

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
});