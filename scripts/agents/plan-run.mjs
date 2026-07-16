#!/usr/bin/env node
/**
 * Deterministic planner CLI.
 *
 * node scripts/agents/plan-run.mjs --base origin/develop --head HEAD --format json
 * node scripts/agents/plan-run.mjs --files a.ts,b.ts --format text
 */
import { planRun, formatPlanText, formatActivationComment } from './lib/planner.mjs';

function parseArgs(argv) {
  const out = {
    base: 'origin/develop',
    head: 'HEAD',
    format: 'text',
    files: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') out.base = argv[++i];
    else if (a === '--head') out.head = argv[++i];
    else if (a === '--format') out.format = argv[++i];
    else if (a === '--files') out.files = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  console.log(`Usage:
  node scripts/agents/plan-run.mjs --base origin/develop --head HEAD --format json|text|comment
  node scripts/agents/plan-run.mjs --files path1,path2 --format json`);
  process.exit(0);
}

try {
  const plan = planRun({
    base: opts.base,
    head: opts.head,
    files: opts.files || undefined,
  });
  if (opts.format === 'json') {
    console.log(JSON.stringify(plan, null, 2));
  } else if (opts.format === 'comment') {
    console.log(formatActivationComment(plan));
  } else {
    console.log(formatPlanText(plan));
  }
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
