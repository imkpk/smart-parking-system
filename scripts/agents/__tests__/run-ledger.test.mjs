import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { planRun } from '../lib/planner.mjs';
import {
  createRunFromPlan,
  updateTaskState,
  loadRun,
  runDirFor,
  computeMetrics,
} from '../lib/run-store.mjs';
import { AGENT_RUNS_DIR } from '../lib/paths.mjs';

const RUN_ID = `test-run-ledger-${Date.now()}`;

describe('typed run ledger', () => {
  let runDir;

  before(() => {
    const plan = planRun({
      files: ['backend/src/bookings/bookings.service.ts'],
    });
    const created = createRunFromPlan(plan, {
      runId: RUN_ID,
      dryRun: true,
      provider: 'mock',
      force: true,
    });
    runDir = created.runDir;
  });

  after(() => {
    // leave artifact for inspection under agent-runs; optional cleanup
    try {
      fs.rmSync(runDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('creates run.json and events', () => {
    assert.ok(fs.existsSync(path.join(runDir, 'run.json')));
    assert.ok(fs.existsSync(path.join(runDir, 'events.jsonl')));
    assert.ok(fs.existsSync(path.join(runDir, 'status.md')));
    assert.ok(fs.existsSync(path.join(runDir, 'plan.md')));
  });

  it('enforces state transitions and records retries', () => {
    const { tasks } = loadRun(RUN_ID);
    const ready = tasks.find((t) => t.status === 'READY');
    assert.ok(ready);
    updateTaskState(RUN_ID, ready.id, 'RUNNING');
    updateTaskState(RUN_ID, ready.id, 'FAILED', { error: 'boom' });
    updateTaskState(RUN_ID, ready.id, 'READY');
    updateTaskState(RUN_ID, ready.id, 'RUNNING');
    updateTaskState(RUN_ID, ready.id, 'SUCCEEDED', { evidence: ['ok'] });
    const t = loadRun(RUN_ID).tasks.find((x) => x.id === ready.id);
    assert.equal(t.status, 'SUCCEEDED');
    assert.ok(t.attempt >= 2);
  });

  it('rejects invalid transition', () => {
    const { tasks } = loadRun(RUN_ID);
    const done = tasks.find((t) => t.status === 'SUCCEEDED');
    assert.throws(() => updateTaskState(RUN_ID, done.id, 'RUNNING'));
  });

  it('computes metrics', () => {
    const m = computeMetrics(runDir);
    assert.ok(m.eventSummary.eventCount > 0);
  });
});
