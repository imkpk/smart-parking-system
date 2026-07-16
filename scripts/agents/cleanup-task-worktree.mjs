#!/usr/bin/env node
import { cleanupTaskWorktree } from './lib/worktree.mjs';

function parseArgs(argv) {
  const out = { force: false, allowDirty: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--run') out.runId = argv[++i];
    else if (argv[i] === '--task') out.taskId = argv[++i];
    else if (argv[i] === '--force') out.force = true;
    else if (argv[i] === '--allow-dirty') out.allowDirty = true;
  }
  return out;
}
const opts = parseArgs(process.argv.slice(2));
if (!opts.runId || !opts.taskId) {
  console.error(
    'Usage: node scripts/agents/cleanup-task-worktree.mjs --run <id> --task <id> [--force --allow-dirty]',
  );
  process.exit(1);
}
const result = cleanupTaskWorktree(opts);
console.log(JSON.stringify(result, null, 2));
process.exit(result.cleaned ? 0 : 2);
