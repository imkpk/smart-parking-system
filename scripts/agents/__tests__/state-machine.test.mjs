import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertTransition, canTransition, TASK_STATES } from '../lib/state-machine.mjs';

describe('task state machine', () => {
  it('allows CREATED -> PLANNED -> READY -> RUNNING -> SUCCEEDED', () => {
    assert.equal(canTransition('CREATED', 'PLANNED'), true);
    assert.equal(canTransition('PLANNED', 'READY'), true);
    assert.equal(canTransition('READY', 'RUNNING'), true);
    assert.equal(canTransition('RUNNING', 'SUCCEEDED'), true);
  });

  it('rejects Quality-style invalid jumps', () => {
    assert.equal(canTransition('CREATED', 'SUCCEEDED'), false);
    assert.equal(canTransition('SUCCEEDED', 'RUNNING'), false);
  });

  it('allows retry FAILED -> READY within attempts', () => {
    const ok = assertTransition('FAILED', 'READY', { attempt: 1, maximumAttempts: 3 });
    assert.equal(ok.ok, true);
    const bad = assertTransition('FAILED', 'READY', { attempt: 3, maximumAttempts: 3 });
    assert.equal(bad.ok, false);
  });

  it('defines all required states', () => {
    for (const s of [
      'CREATED',
      'PLANNED',
      'READY',
      'RUNNING',
      'VERIFYING',
      'SUCCEEDED',
      'FAILED',
      'BLOCKED',
      'ESCALATED',
      'CANCELLED',
    ]) {
      assert.ok(TASK_STATES.includes(s));
    }
  });
});
