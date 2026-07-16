#!/usr/bin/env node
/**
 * Create a structured agent run from a deterministic plan.
 *
 * node scripts/agents/create-run.mjs --base origin/develop --head HEAD [--slug name] [--files a,b]
 */
import { planRun } from './lib/planner.mjs';
import { createRunFromPlan } from './lib/run-store.mjs';

function parseArgs(argv) {
  const out = { base: 'origin/develop', head: 'HEAD', slug: 'orchestration', dryRun: true, files: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') out.base = argv[++i];
    else if (a === '--head') out.head = argv[++i];
    else if (a === '--slug') out.slug = argv[++i];
    else if (a === '--run-id') out.runId = argv[++i];
    else if (a === '--provider') out.provider = argv[++i];
    else if (a === '--files') out.files = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--no-dry-run') out.dryRun = false;
    else if (a === '--help') out.help = true;
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  console.log('Usage: node scripts/agents/create-run.mjs --base origin/develop --head HEAD [--slug name]');
  process.exit(0);
}

try {
  const plan = planRun({ base: opts.base, head: opts.head, files: opts.files || undefined });
  const { run, runDir } = createRunFromPlan(plan, {
    slug: opts.slug,
    runId: opts.runId,
    dryRun: opts.dryRun,
    provider: opts.provider || 'local-prompt',
  });
  console.log(JSON.stringify({ runId: run.id, runDir, status: run.status, tasks: run.taskIds.length }, null, 2));
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
