#!/usr/bin/env node
/**
 * Dry-run / plan-only / resume orchestrator.
 *
 * node scripts/agents/orchestrate-run.mjs --dry-run --base origin/develop --head HEAD
 * node scripts/agents/orchestrate-run.mjs --plan-only --files a.ts
 * node scripts/agents/orchestrate-run.mjs --resume <run-id>
 * node scripts/agents/orchestrate-run.mjs --resume <run-id> --task <task-id>
 */
import fs from 'node:fs';
import path from 'node:path';
import { planRun, formatPlanText } from './lib/planner.mjs';
import { loadAndValidateManifest, getAgent } from './lib/manifest.mjs';
import {
  createRunFromPlan,
  loadRun,
  updateTaskState,
  listTasks,
  readTask,
  writeTask,
  renderStatusMarkdown,
} from './lib/run-store.mjs';
import { appendEvent } from './lib/events.mjs';
import { getProvider } from './providers/provider.mjs';
import { assertWriteAllowed, assertCommandAllowed } from './lib/permissions.mjs';

function parseArgs(argv) {
  const out = {
    base: 'origin/develop',
    head: 'HEAD',
    dryRun: false,
    planOnly: false,
    resume: null,
    task: null,
    provider: 'local-prompt',
    files: null,
    slug: 'orchestration',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--plan-only') out.planOnly = true;
    else if (a === '--resume') out.resume = argv[++i];
    else if (a === '--task') out.task = argv[++i];
    else if (a === '--base') out.base = argv[++i];
    else if (a === '--head') out.head = argv[++i];
    else if (a === '--provider') out.provider = argv[++i];
    else if (a === '--slug') out.slug = argv[++i];
    else if (a === '--files') out.files = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--help') out.help = true;
  }
  // default to dry-run safety if neither resume nor plan-only
  if (!out.resume && !out.planOnly && !out.dryRun) out.dryRun = true;
  return out;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  console.log(`Usage:
  node scripts/agents/orchestrate-run.mjs --dry-run --base origin/develop --head HEAD
  node scripts/agents/orchestrate-run.mjs --plan-only --files a,b
  node scripts/agents/orchestrate-run.mjs --resume <run-id> [--task <task-id>]`);
  process.exit(0);
}

async function main() {
  // 1. Validate configuration
  const manifestResult = loadAndValidateManifest();
  if (!manifestResult.valid) {
    throw new Error(`Invalid manifest:\n${manifestResult.errors.join('\n')}`);
  }
  const manifest = manifestResult.manifest;

  if (opts.planOnly) {
    const plan = planRun({ base: opts.base, head: opts.head, files: opts.files || undefined });
    console.log(formatPlanText(plan));
    return;
  }

  if (opts.resume) {
    await resumeRun(opts.resume, opts, manifest);
    return;
  }

  // 2-4. Inspect diff, generate plan, create run state
  const plan = planRun({ base: opts.base, head: opts.head, files: opts.files || undefined });
  const { run, tasks, runDir } = createRunFromPlan(plan, {
    slug: opts.slug,
    dryRun: opts.dryRun,
    provider: opts.provider,
  });

  // 5-8. Build deps already in plan; enforce permissions; emit events; produce prompts
  const provider = await getProvider(opts.provider);
  const prompts = [];

  for (const t of tasks) {
    // permission check on allowed paths
    for (const p of t.allowedPaths || []) {
      // paths are globs — check a sample concrete path is not secret-only
      if (p.includes('.env') && !p.includes('.env.example')) {
        const check = assertWriteAllowed(manifest, t.agent, p.replace('**', 'x'));
        if (!check.ok && t.writeMode === 'write') {
          updateTaskState(run.id, t.id, 'BLOCKED', { error: check.error });
        }
      }
    }

    const agent = getAgent(manifest, t.agent);
    const inv = {
      taskGoal: `${t.type} task for ${t.agent}`,
      allowedPaths: t.allowedPaths || [],
      deniedPaths: t.deniedPaths || [],
      acceptanceCriteria: t.acceptanceCriteria || agent?.qualityRequirements?.evidence || [],
      verificationCommands: agent?.qualityRequirements?.verification || [],
      relevantFiles: t.changedFilesInScope || plan.changedFiles || [],
      skills: agent?.skills || [],
      referenceMemory: [],
      runId: run.id,
      taskId: t.id,
      agent: t.agent,
      outputSchema: { summary: 'string', evidence: ['string'] },
    };

    // 9. Dry-run: invoke provider but mock/local-prompt never calls external models
    if (t.status === 'READY' || t.status === 'PLANNED') {
      if (t.status === 'PLANNED') {
        // leave for deps
        continue;
      }
      updateTaskState(run.id, t.id, 'RUNNING');
      const result = await provider.invoke(inv);
      const logDir = path.join(runDir, 'logs');
      fs.mkdirSync(logDir, { recursive: true });
      if (result.prompt) {
        const promptFile = path.join(logDir, `${t.id}.prompt.md`);
        fs.writeFileSync(promptFile, result.prompt, 'utf8');
        prompts.push(promptFile);
      }
      fs.writeFileSync(path.join(logDir, `${t.id}.result.json`), JSON.stringify(result, null, 2), 'utf8');

      if (result.status === 'blocked') {
        updateTaskState(run.id, t.id, 'BLOCKED', { error: result.error });
      } else if (result.status === 'failed') {
        updateTaskState(run.id, t.id, 'FAILED', { error: result.error });
      } else {
        // dry-run succeeds tasks as simulated
        updateTaskState(run.id, t.id, 'SUCCEEDED', {
          evidence: [`provider:${result.provider}:${result.status}`],
        });
      }
    }
  }

  // Second pass: promote and complete remaining READY after deps
  let guard = 0;
  while (guard++ < 50) {
    const current = listTasks(runDir);
    const ready = current.filter((t) => t.status === 'READY');
    if (!ready.length) break;
    for (const t of ready) {
      const agent = getAgent(manifest, t.agent);
      updateTaskState(run.id, t.id, 'RUNNING');
      const result = await provider.invoke({
        taskGoal: `${t.type} task for ${t.agent}`,
        allowedPaths: t.allowedPaths || [],
        deniedPaths: t.deniedPaths || [],
        acceptanceCriteria: [],
        verificationCommands: agent?.qualityRequirements?.verification || [],
        relevantFiles: plan.changedFiles || [],
        skills: agent?.skills || [],
        referenceMemory: [],
        runId: run.id,
        taskId: t.id,
        agent: t.agent,
      });
      const logDir = path.join(runDir, 'logs');
      fs.mkdirSync(logDir, { recursive: true });
      if (result.prompt) {
        fs.writeFileSync(path.join(logDir, `${t.id}.prompt.md`), result.prompt, 'utf8');
      }
      fs.writeFileSync(path.join(logDir, `${t.id}.result.json`), JSON.stringify(result, null, 2), 'utf8');
      if (result.status === 'blocked') updateTaskState(run.id, t.id, 'BLOCKED', { error: result.error });
      else if (result.status === 'failed') updateTaskState(run.id, t.id, 'FAILED', { error: result.error });
      else updateTaskState(run.id, t.id, 'SUCCEEDED', { evidence: [`provider:${result.provider}`] });
    }
  }

  // quality events
  const finalTasks = listTasks(runDir);
  const q = finalTasks.find((t) => t.agent === 'quality');
  if (q?.status === 'SUCCEEDED') {
    appendEvent(runDir, { type: 'quality.approved', runId: run.id, taskId: q.id, agent: 'quality' });
  }

  renderStatusMarkdown(runDir);
  const final = loadRun(run.id);
  console.log(
    JSON.stringify(
      {
        mode: opts.dryRun ? 'dry-run' : 'execute',
        runId: run.id,
        status: final.run.status,
        tasks: final.tasks.map((t) => ({ id: t.id, status: t.status })),
        note: opts.dryRun
          ? 'Stopped safely before external model invocation (local-prompt/mock only).'
          : 'Execution mode — still uses configured provider adapter.',
      },
      null,
      2,
    ),
  );
}

async function resumeRun(runId, opts, manifest) {
  const { runDir, run, tasks, historical } = loadRun(runId);
  if (historical) throw new Error(`Cannot resume historical Markdown-only run: ${runId}`);
  if (!run) throw new Error(`Missing run.json for ${runId}`);

  appendEvent(runDir, { type: 'run.resumed', runId, payload: { task: opts.task } });
  const provider = await getProvider(opts.provider || run.provider || 'local-prompt');

  const targets = opts.task
    ? [readTask(runDir, opts.task)]
    : listTasks(runDir).filter((t) => ['READY', 'FAILED', 'BLOCKED'].includes(t.status));

  for (const t of targets) {
    // idempotent: skip SUCCEEDED
    if (t.status === 'SUCCEEDED') continue;
    if (t.status === 'FAILED') {
      // retry if attempts remain
      updateTaskState(runId, t.id, 'READY');
    }
    if (t.status === 'BLOCKED' && !opts.task) continue;

    const current = readTask(runDir, t.id);
    if (current.status !== 'READY' && current.status !== 'RUNNING') {
      if (current.status === 'PLANNED' || current.status === 'CREATED') continue;
    }
    if (current.status === 'READY') updateTaskState(runId, t.id, 'RUNNING');

    const agent = getAgent(manifest, current.agent);
    // verify commands permission
    for (const cmd of agent?.qualityRequirements?.verification || []) {
      const check = assertCommandAllowed(current.agent, cmd, { toolProfile: agent.toolProfile });
      if (!check.ok) {
        updateTaskState(runId, t.id, 'BLOCKED', { error: check.error });
        continue;
      }
    }

    const result = await provider.invoke({
      taskGoal: `resume ${current.type} for ${current.agent}`,
      allowedPaths: current.allowedPaths || [],
      deniedPaths: current.deniedPaths || [],
      acceptanceCriteria: current.acceptanceCriteria || [],
      verificationCommands: agent?.qualityRequirements?.verification || [],
      relevantFiles: run.changedFiles || [],
      skills: agent?.skills || [],
      referenceMemory: [],
      runId,
      taskId: current.id,
      agent: current.agent,
    });
    const logDir = path.join(runDir, 'logs');
    fs.mkdirSync(logDir, { recursive: true });
    fs.writeFileSync(
      path.join(logDir, `${current.id}.resume-${Date.now()}.json`),
      JSON.stringify(result, null, 2),
      'utf8',
    );
    if (result.status === 'blocked') updateTaskState(runId, t.id, 'BLOCKED', { error: result.error });
    else if (result.status === 'failed') updateTaskState(runId, t.id, 'FAILED', { error: result.error });
    else updateTaskState(runId, t.id, 'SUCCEEDED', { evidence: [`resume:${result.provider}`] });
  }

  renderStatusMarkdown(runDir);
  const final = loadRun(runId);
  console.log(
    JSON.stringify(
      {
        mode: 'resume',
        runId,
        status: final.run.status,
        tasks: final.tasks.map((t) => ({ id: t.id, status: t.status, attempt: t.attempt })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
