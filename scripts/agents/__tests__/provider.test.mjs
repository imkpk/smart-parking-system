import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getProvider } from '../providers/provider.mjs';

const inv = {
  taskGoal: 'test',
  allowedPaths: ['backend/src/**'],
  deniedPaths: [],
  acceptanceCriteria: [],
  verificationCommands: [],
  relevantFiles: [],
  skills: [],
  referenceMemory: [],
  runId: 'run-1',
  taskId: 'task-1',
  agent: 'core-api',
};

describe('providers', () => {
  it('mock succeeds', async () => {
    const p = await getProvider('mock');
    const r = await p.invoke(inv);
    assert.equal(r.status, 'succeeded');
    assert.equal(r.provider, 'mock');
    assert.equal(r.dryRun, true);
  });

  it('mock can force fail', async () => {
    const p = await getProvider('mock');
    const r = await p.invoke({ ...inv, taskGoal: 'FORCE_FAIL now' });
    assert.equal(r.status, 'failed');
  });

  it('local-prompt does not call external models', async () => {
    const p = await getProvider('local-prompt');
    const r = await p.invoke(inv);
    assert.equal(r.status, 'simulated');
    assert.ok(r.prompt.includes('Run: run-1'));
    assert.ok(r.prompt.includes('no external model'));
  });

  it('claude blocks without credentials', async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const p = await getProvider('claude');
    const r = await p.invoke(inv);
    assert.equal(r.status, 'blocked');
    if (prev) process.env.ANTHROPIC_API_KEY = prev;
  });
});
