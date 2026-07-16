import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { planRun } from '../lib/planner.mjs';
import { createRunFromPlan, loadRun, updateTaskState, listTasks } from '../lib/run-store.mjs';
import { loadAndValidateManifest } from '../lib/manifest.mjs';
import { executeTask } from '../lib/orchestrator-core.mjs';
import { readEvents } from '../lib/events.mjs';
import { AGENT_RUNS_DIR } from '../lib/paths.mjs';

function countingProvider(impl) {
  const state = { invokes: 0, lastInv: null };
  return {
    state,
    provider: {
      name: 'counting-mock',
      async invoke(inv) {
        state.invokes += 1;
        state.lastInv = inv;
        return impl(inv);
      },
    },
  };
}

describe('orchestrator end-to-end permission enforcement', () => {
  const { manifest } = loadAndValidateManifest();
  const created = [];

  after(() => {
    for (const id of created) {
      try {
        fs.rmSync(path.join(AGENT_RUNS_DIR, id), { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
  });

  function makeRun(files, runId) {
    const plan = planRun({ files });
    // Assign concrete write files only to the owning implement agent
    for (const t of plan.tasks) {
      if (t.agent === 'core-api') t.changedFilesInScope = files;
      else if (t.type === 'implement') t.changedFilesInScope = t.changedFilesInScope || [];
      else t.changedFilesInScope = [];
    }
    const r = createRunFromPlan(plan, {
      runId,
      dryRun: true,
      provider: 'mock',
      force: true,
    });
    created.push(runId);
    return r;
  }

  async function unlockCoreApi(runId, runDir, provider) {
    // complete orchestrator so core-api becomes READY
    for (const t of listTasks(runDir).filter((x) => x.status === 'READY' && x.agent === 'orchestrator')) {
      await executeTask({
        runId,
        runDir,
        taskId: t.id,
        manifest,
        provider,
        relevantFiles: [],
        dryRun: true,
      });
    }
    return listTasks(runDir).find((t) => t.agent === 'core-api' && t.status === 'READY');
  }

  it('permitted task invokes the mock provider', async () => {
    const runId = `perm-ok-${Date.now()}`;
    const { runDir } = makeRun(['backend/src/bookings/bookings.service.ts'], runId);
    const { provider, state } = countingProvider(() => ({
      status: 'succeeded',
      provider: 'mock',
      dryRun: true,
      realExecution: false,
      evidence: [],
    }));
    const core = await unlockCoreApi(runId, runDir, provider);
    assert.ok(core, 'core-api task ready');
    const before = state.invokes;
    const res = await executeTask({
      runId,
      runDir,
      taskId: core.id,
      manifest,
      provider,
      relevantFiles: ['backend/src/bookings/bookings.service.ts'],
      dryRun: true,
    });
    assert.equal(res.invoked, true);
    assert.ok(state.invokes > before);
    assert.equal(res.task.status, 'SIMULATED');
  });

  it('denied concrete path does not invoke the provider', async () => {
    const runId = `perm-deny-path-${Date.now()}`;
    const { runDir } = makeRun(['backend/src/bookings/bookings.service.ts'], runId);
    const { provider, state } = countingProvider(() => ({
      status: 'succeeded',
      provider: 'mock',
      dryRun: true,
      realExecution: false,
    }));
    const core = await unlockCoreApi(runId, runDir, provider);
    // Override task scope to the denied path
    const taskPath = path.join(runDir, 'tasks', `${core.id}.json`);
    const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
    task.changedFilesInScope = ['frontend/src/App.tsx'];
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

    const before = state.invokes;
    const res = await executeTask({
      runId,
      runDir,
      taskId: core.id,
      manifest,
      provider,
      relevantFiles: ['frontend/src/App.tsx'],
      dryRun: true,
    });
    assert.equal(res.invoked, false);
    assert.equal(state.invokes, before);
    assert.equal(res.task.status, 'BLOCKED');
    assert.ok(res.task.denials?.length || res.task.error);
    const blocked = readEvents(runDir).filter((e) => e.type === 'task.blocked');
    assert.ok(blocked.length >= 1);
  });

  it('denied verification command does not invoke the provider', async () => {
    const runId = `perm-deny-cmd-${Date.now()}`;
    const { runDir } = makeRun(['backend/src/bookings/bookings.service.ts'], runId);
    const { provider, state } = countingProvider(() => ({
      status: 'succeeded',
      provider: 'mock',
      dryRun: true,
      realExecution: false,
    }));
    const core = await unlockCoreApi(runId, runDir, provider);
    const taskPath = path.join(runDir, 'tasks', `${core.id}.json`);
    const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
    task.verificationCommands = ['git push --force origin develop'];
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

    const before = state.invokes;
    const res = await executeTask({
      runId,
      runDir,
      taskId: core.id,
      manifest,
      provider,
      relevantFiles: ['backend/src/bookings/bookings.service.ts'],
      dryRun: true,
    });
    assert.equal(res.invoked, false);
    assert.equal(state.invokes, before);
    assert.equal(res.task.status, 'BLOCKED');
  });

  it('Quality cannot write feature paths', async () => {
    const runId = `perm-quality-${Date.now()}`;
    const { runDir } = makeRun(['backend/src/bookings/bookings.service.ts'], runId);
    // force quality task ready with write mode and feature file
    const q = listTasks(runDir).find((t) => t.agent === 'quality');
    const taskPath = path.join(runDir, 'tasks', `${q.id}.json`);
    const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
    task.status = 'READY';
    task.dependencies = [];
    task.writeMode = 'write';
    task.type = 'implement';
    task.changedFilesInScope = ['backend/src/bookings/bookings.service.ts'];
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));

    const { provider, state } = countingProvider(() => ({
      status: 'succeeded',
      provider: 'mock',
      dryRun: true,
      realExecution: false,
    }));
    const before = state.invokes;
    const res = await executeTask({
      runId,
      runDir,
      taskId: q.id,
      manifest,
      provider,
      relevantFiles: ['backend/src/bookings/bookings.service.ts'],
      dryRun: true,
    });
    assert.equal(res.invoked, false);
    assert.equal(state.invokes, before);
    assert.equal(res.task.status, 'BLOCKED');
  });

  it('secret-like files are denied', async () => {
    const runId = `perm-secret-${Date.now()}`;
    const { runDir } = makeRun(['backend/src/bookings/bookings.service.ts'], runId);
    const { provider, state } = countingProvider(() => ({
      status: 'succeeded',
      provider: 'mock',
      dryRun: true,
      realExecution: false,
    }));
    const core = await unlockCoreApi(runId, runDir, provider);
    const before = state.invokes;
    const taskPath = path.join(runDir, 'tasks', `${core.id}.json`);
    const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
    task.changedFilesInScope = ['backend/.env'];
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
    const res = await executeTask({
      runId,
      runDir,
      taskId: core.id,
      manifest,
      provider,
      relevantFiles: ['backend/.env'],
      dryRun: true,
    });
    assert.equal(res.invoked, false);
    assert.equal(state.invokes, before, 'provider must not be invoked after denial');
    assert.equal(res.task.status, 'BLOCKED');
  });

  it('traversal paths are denied', async () => {
    const runId = `perm-trav-${Date.now()}`;
    const { runDir } = makeRun(['backend/src/bookings/bookings.service.ts'], runId);
    const { provider, state } = countingProvider(() => ({
      status: 'succeeded',
      provider: 'mock',
      dryRun: true,
      realExecution: false,
    }));
    const core = await unlockCoreApi(runId, runDir, provider);
    const before = state.invokes;
    const taskPath = path.join(runDir, 'tasks', `${core.id}.json`);
    const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
    task.changedFilesInScope = ['backend/src/../../.env'];
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
    const res = await executeTask({
      runId,
      runDir,
      taskId: core.id,
      manifest,
      provider,
      relevantFiles: ['backend/src/../../.env'],
      dryRun: true,
    });
    assert.equal(res.invoked, false);
    assert.equal(state.invokes, before, 'provider must not be invoked after denial');
    assert.equal(res.task.status, 'BLOCKED');
  });

  it('resume does not invoke provider after denial', async () => {
    const runId = `perm-resume-${Date.now()}`;
    const { runDir } = makeRun(['backend/src/bookings/bookings.service.ts'], runId);
    // mark core-api READY with bad command
    for (const t of listTasks(runDir).filter((x) => x.agent === 'orchestrator')) {
      const tp = path.join(runDir, 'tasks', `${t.id}.json`);
      const task = JSON.parse(fs.readFileSync(tp, 'utf8'));
      task.status = 'SIMULATED';
      fs.writeFileSync(tp, JSON.stringify(task, null, 2));
    }
    const core = listTasks(runDir).find((t) => t.agent === 'core-api');
    const tp = path.join(runDir, 'tasks', `${core.id}.json`);
    const task = JSON.parse(fs.readFileSync(tp, 'utf8'));
    task.status = 'READY';
    task.dependencies = [];
    task.verificationCommands = ['prisma migrate reset'];
    fs.writeFileSync(tp, JSON.stringify(task, null, 2));

    const { provider, state } = countingProvider(() => ({
      status: 'succeeded',
      provider: 'mock',
      dryRun: true,
      realExecution: false,
    }));
    const res = await executeTask({
      runId,
      runDir,
      taskId: core.id,
      manifest,
      provider,
      relevantFiles: ['backend/src/bookings/bookings.service.ts'],
      dryRun: true,
    });
    assert.equal(res.invoked, false);
    assert.equal(state.invokes, 0);
    assert.equal(res.task.status, 'BLOCKED');
    assert.ok(res.task.error || res.task.denials);
  });

  it('blocked tasks contain structured error evidence', async () => {
    const runId = `perm-struct-${Date.now()}`;
    const { runDir } = makeRun(['backend/src/bookings/bookings.service.ts'], runId);
    const { provider } = countingProvider(() => ({
      status: 'succeeded',
      provider: 'mock',
      dryRun: true,
      realExecution: false,
    }));
    const core = await unlockCoreApi(runId, runDir, provider);
    const taskPath = path.join(runDir, 'tasks', `${core.id}.json`);
    const task = JSON.parse(fs.readFileSync(taskPath, 'utf8'));
    task.changedFilesInScope = ['frontend/src/App.tsx'];
    fs.writeFileSync(taskPath, JSON.stringify(task, null, 2));
    const res = await executeTask({
      runId,
      runDir,
      taskId: core.id,
      manifest,
      provider,
      relevantFiles: ['frontend/src/App.tsx'],
      dryRun: true,
    });
    assert.equal(res.task.status, 'BLOCKED');
    assert.ok(Array.isArray(res.denials) || Array.isArray(res.task.denials));
    const denials = res.denials || res.task.denials;
    assert.ok(denials.some((d) => d.type === 'path'));
    assert.ok(res.task.evidence?.some((e) => String(e).includes('permission-denied')));
  });
});
