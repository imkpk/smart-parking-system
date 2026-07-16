#!/usr/bin/env node
/**
 * Dry-run / plan-only / resume orchestrator.
 *
 * Simulated providers (mock, local-prompt) produce SIMULATED task/run state —
 * never real SUCCEEDED / quality.approved.
 */
import { planRun, formatPlanText } from './lib/planner.mjs';
import { loadAndValidateManifest } from './lib/manifest.mjs';
import {
  createRunFromPlan,
  loadRun,
  updateTaskState,
  listTasks,
  readTask,
  renderStatusMarkdown,
} from './lib/run-store.mjs';
import { appendEvent } from './lib/events.mjs';
import { getProvider } from './providers/provider.mjs';
import { executeTask, runReadyLoop } from './lib/orchestrator-core.mjs';

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

  const plan = planRun({ base: opts.base, head: opts.head, files: opts.files || undefined });
  const { run, runDir } = createRunFromPlan(plan, {
    slug: opts.slug,
    dryRun: opts.dryRun,
    provider: opts.provider,
    simulatedGraph: opts.dryRun,
  });

  const provider = await getProvider(opts.provider);
  await runReadyLoop({
    runId: run.id,
    runDir,
    manifest,
    provider,
    dryRun: opts.dryRun,
  });

  renderStatusMarkdown(runDir);
  const final = loadRun(run.id);
  console.log(
    JSON.stringify(
      {
        mode: opts.dryRun ? 'dry-run' : 'execute',
        runId: run.id,
        status: final.run.status,
        simulated: final.run.status === 'SIMULATED' || final.run.dryRun,
        qualityVerdict: final.run.qualityVerdict,
        tasks: final.tasks.map((t) => ({ id: t.id, status: t.status })),
        note:
          final.run.status === 'SIMULATED' || opts.dryRun
            ? 'Simulation only — no external model invocation; not production success; quality.approved not emitted.'
            : 'Execution mode — still uses configured provider adapter.',
      },
      null,
      2,
    ),
  );
}

async function resumeRun(runId, opts, manifest) {
  const { runDir, run, historical } = loadRun(runId);
  if (historical) throw new Error(`Cannot resume historical Markdown-only run: ${runId}`);
  if (!run) throw new Error(`Missing run.json for ${runId}`);

  appendEvent(runDir, { type: 'run.resumed', runId, payload: { task: opts.task } });
  const provider = await getProvider(opts.provider || run.provider || 'local-prompt');

  const targets = opts.task
    ? [readTask(runDir, opts.task)]
    : listTasks(runDir).filter((t) => ['READY', 'FAILED', 'BLOCKED'].includes(t.status));

  for (const t of targets) {
    if (t.status === 'SUCCEEDED' || t.status === 'SIMULATED') continue;

    if (t.status === 'FAILED') {
      try {
        updateTaskState(runId, t.id, 'READY');
      } catch (err) {
        // retry budget exhausted
        continue;
      }
    }

    // Explicit re-resume of BLOCKED only when --task is set
    if (t.status === 'BLOCKED') {
      if (!opts.task) continue;
      try {
        updateTaskState(runId, t.id, 'READY');
      } catch {
        continue;
      }
    }

    const current = readTask(runDir, t.id);
    if (current.status !== 'READY') continue;

    // executeTask validates permissions and WILL NOT invoke provider on denial
    await executeTask({
      runId,
      runDir,
      taskId: current.id,
      manifest,
      provider,
      relevantFiles: run.changedFiles || [],
      dryRun: run.dryRun !== false,
    });
  }

  // continue dependency chain in simulated graph if needed
  await runReadyLoop({
    runId,
    runDir,
    manifest,
    provider,
    dryRun: run.dryRun !== false,
  });

  renderStatusMarkdown(runDir);
  const final = loadRun(runId);
  console.log(
    JSON.stringify(
      {
        mode: 'resume',
        runId,
        status: final.run.status,
        simulated: final.run.status === 'SIMULATED' || final.run.dryRun,
        qualityVerdict: final.run.qualityVerdict,
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
