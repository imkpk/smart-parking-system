import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { planRun } from '../lib/planner.mjs';
import {
  createRunFromPlan,
  loadRun,
  listTasks,
  renderStatusMarkdown,
} from '../lib/run-store.mjs';
import { loadAndValidateManifest } from '../lib/manifest.mjs';
import { executeTask, runReadyLoop, countEvents } from '../lib/orchestrator-core.mjs';
import { evaluateQualityResult, terminalStatusForResult } from '../lib/quality-gate.mjs';
import { getProvider } from '../providers/provider.mjs';
import { readEvents } from '../lib/events.mjs';
import { AGENT_RUNS_DIR } from '../lib/paths.mjs';

describe('simulation vs real success / quality approval', () => {
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

  it('local-prompt produces a simulated task state', async () => {
    const runId = `sim-lp-${Date.now()}`;
    created.push(runId);
    const plan = planRun({ files: ['backend/src/bookings/bookings.service.ts'] });
    const { runDir } = createRunFromPlan(plan, {
      runId,
      dryRun: true,
      provider: 'local-prompt',
      force: true,
    });
    const provider = await getProvider('local-prompt');
    await runReadyLoop({ runId, runDir, manifest, provider, dryRun: true });
    const { run, tasks } = loadRun(runId);
    assert.equal(run.status, 'SIMULATED');
    assert.ok(tasks.every((t) => t.status === 'SIMULATED' || t.status === 'BLOCKED'));
    assert.ok(tasks.some((t) => t.status === 'SIMULATED'));
    assert.equal(run.qualityVerdict, null);
    assert.equal(countEvents(runDir, 'quality.approved'), 0);
    assert.ok(countEvents(runDir, 'task.simulated') >= 1);
    assert.ok(countEvents(runDir, 'run.simulated') >= 1);
  });

  it('mock dry-run produces a simulated run unless realExecution configured', async () => {
    const runId = `sim-mock-${Date.now()}`;
    created.push(runId);
    const plan = planRun({ files: ['backend/src/bookings/bookings.service.ts'] });
    const { runDir } = createRunFromPlan(plan, {
      runId,
      dryRun: true,
      provider: 'mock',
      force: true,
    });
    const provider = await getProvider('mock');
    await runReadyLoop({ runId, runDir, manifest, provider, dryRun: true });
    const { run, tasks } = loadRun(runId);
    assert.equal(run.status, 'SIMULATED');
    assert.ok(tasks.filter((t) => t.status === 'SIMULATED').length >= 1);
    assert.equal(countEvents(runDir, 'task.completed'), 0);
    assert.equal(countEvents(runDir, 'quality.approved'), 0);
  });

  it('simulated Quality does not emit quality.approved', async () => {
    const runId = `sim-q-${Date.now()}`;
    created.push(runId);
    const plan = planRun({ files: ['docs/agents/ROLES.md'] });
    const { runDir } = createRunFromPlan(plan, {
      runId,
      dryRun: true,
      provider: 'local-prompt',
      force: true,
    });
    const provider = await getProvider('local-prompt');
    await runReadyLoop({ runId, runDir, manifest, provider, dryRun: true });
    assert.equal(countEvents(runDir, 'quality.approved'), 0);
    const q = listTasks(runDir).find((t) => t.agent === 'quality');
    assert.equal(q.status, 'SIMULATED');
    assert.equal(loadRun(runId).run.qualityVerdict, null);
  });

  it('simulated Quality does not set a real Quality verdict', () => {
    const r = evaluateQualityResult({
      task: { agent: 'quality' },
      result: {
        status: 'simulated',
        provider: 'local-prompt',
        dryRun: true,
        qualityVerdict: 'APPROVE',
        evidence: ['x'],
      },
      run: { dryRun: true },
    });
    assert.equal(r.approve, false);
  });

  it('real normalized Quality success with evidence can emit approval', async () => {
    const runId = `real-q-${Date.now()}`;
    created.push(runId);
    const plan = planRun({ files: ['docs/agents/ROLES.md'] });
    const { runDir, run } = createRunFromPlan(plan, {
      runId,
      dryRun: false,
      simulatedGraph: false,
      provider: 'mock',
      force: true,
    });
    // mark dryRun false on disk
    const runJson = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
    runJson.dryRun = false;
    runJson.simulatedGraph = false;
    fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(runJson, null, 2));

    // complete non-quality tasks as SIMULATED first won't unlock without simulatedGraph
    // Force all deps satisfied: mark non-quality SUCCEEDED for graph, quality READY
    for (const t of listTasks(runDir)) {
      const p = path.join(runDir, 'tasks', `${t.id}.json`);
      const task = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (task.agent === 'quality') {
        task.status = 'READY';
        task.dependencies = [];
      } else {
        task.status = 'SUCCEEDED';
      }
      fs.writeFileSync(p, JSON.stringify(task, null, 2));
    }

    const provider = {
      name: 'mock',
      async invoke(inv) {
        return {
          status: 'succeeded',
          provider: 'mock',
          dryRun: false,
          realExecution: true,
          qualityVerdict: 'APPROVE',
          evidence: ['manifest-validation', 'routing-tests', 'permission-tests'],
          summary: 'real quality',
        };
      },
    };

    const q = listTasks(runDir).find((t) => t.agent === 'quality');
    const res = await executeTask({
      runId,
      runDir,
      taskId: q.id,
      manifest,
      provider,
      relevantFiles: ['docs/agents/ROLES.md'],
      dryRun: false,
    });
    assert.equal(res.invoked, true);
    assert.equal(res.task.status, 'SUCCEEDED');
    assert.equal(countEvents(runDir, 'quality.approved'), 1);
    assert.equal(loadRun(runId).run.qualityVerdict, 'APPROVE');
  });

  it('Quality BLOCK emits quality.blocked', async () => {
    const runId = `block-q-${Date.now()}`;
    created.push(runId);
    const plan = planRun({ files: ['docs/agents/ROLES.md'] });
    const { runDir } = createRunFromPlan(plan, {
      runId,
      dryRun: false,
      provider: 'mock',
      force: true,
    });
    const runJson = JSON.parse(fs.readFileSync(path.join(runDir, 'run.json'), 'utf8'));
    runJson.dryRun = false;
    runJson.simulatedGraph = false;
    fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(runJson, null, 2));
    for (const t of listTasks(runDir)) {
      const p = path.join(runDir, 'tasks', `${t.id}.json`);
      const task = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (task.agent === 'quality') {
        task.status = 'READY';
        task.dependencies = [];
      } else task.status = 'SUCCEEDED';
      fs.writeFileSync(p, JSON.stringify(task, null, 2));
    }
    const provider = {
      async invoke() {
        return {
          status: 'failed',
          provider: 'mock',
          dryRun: false,
          realExecution: true,
          qualityVerdict: 'BLOCK',
          error: 'blocked by quality',
          evidence: ['finding'],
        };
      },
    };
    const q = listTasks(runDir).find((t) => t.agent === 'quality');
    await executeTask({
      runId,
      runDir,
      taskId: q.id,
      manifest,
      provider,
      dryRun: false,
      relevantFiles: [],
    });
    assert.ok(countEvents(runDir, 'quality.blocked') >= 1);
    assert.equal(countEvents(runDir, 'quality.approved'), 0);
  });

  it('missing verdict cannot produce approval', () => {
    const r = evaluateQualityResult({
      task: { agent: 'quality' },
      result: {
        status: 'succeeded',
        provider: 'live',
        dryRun: false,
        realExecution: true,
        evidence: ['a'],
      },
      run: { dryRun: false },
    });
    assert.equal(r.approve, false);
    assert.match(r.reason, /missing qualityVerdict/);
  });

  it('missing evidence cannot produce approval', () => {
    const r = evaluateQualityResult({
      task: { agent: 'quality' },
      result: {
        status: 'succeeded',
        provider: 'live',
        dryRun: false,
        realExecution: true,
        qualityVerdict: 'APPROVE',
        evidence: [],
      },
      run: { dryRun: false },
    });
    assert.equal(r.approve, false);
    assert.match(r.reason, /missing evidence/);
  });

  it('dry-run cannot produce approval', () => {
    const r = evaluateQualityResult({
      task: { agent: 'quality' },
      result: {
        status: 'succeeded',
        provider: 'mock',
        dryRun: false,
        realExecution: true,
        qualityVerdict: 'APPROVE',
        evidence: ['a'],
      },
      run: { dryRun: true },
    });
    assert.equal(r.approve, false);
  });

  it('status Markdown distinguishes simulated and succeeded runs', async () => {
    const runId = `sim-md-${Date.now()}`;
    created.push(runId);
    const plan = planRun({ files: ['backend/src/bookings/bookings.service.ts'] });
    const { runDir } = createRunFromPlan(plan, {
      runId,
      dryRun: true,
      provider: 'mock',
      force: true,
    });
    const provider = await getProvider('mock');
    await runReadyLoop({ runId, runDir, manifest, provider, dryRun: true });
    renderStatusMarkdown(runDir);
    const md = fs.readFileSync(path.join(runDir, 'status.md'), 'utf8');
    assert.match(md, /SIMULATED/);
    assert.match(md, /not production/);
    assert.doesNotMatch(md, /Real quality\.approved events are present/);
  });

  it('terminalStatusForResult maps correctly', () => {
    assert.equal(
      terminalStatusForResult({ status: 'simulated', dryRun: true, provider: 'local-prompt' }),
      'SIMULATED',
    );
    assert.equal(
      terminalStatusForResult({
        status: 'succeeded',
        dryRun: true,
        provider: 'mock',
        realExecution: false,
      }),
      'SIMULATED',
    );
    assert.equal(
      terminalStatusForResult({
        status: 'succeeded',
        dryRun: false,
        provider: 'mock',
        realExecution: true,
      }),
      'SUCCEEDED',
    );
  });
});
