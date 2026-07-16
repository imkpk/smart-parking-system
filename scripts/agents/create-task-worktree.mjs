#!/usr/bin/env node
import { createTaskWorktree } from './lib/worktree.mjs';

function parseArgs(argv) {
  const out = { baseRef: 'HEAD' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--run') out.runId = argv[++i];
    else if (argv[i] === '--task') out.taskId = argv[++i];
    else if (argv[i] === '--base') out.baseRef = argv[++i];
  }
  return out;
}
const opts = parseArgs(process.argv.slice(2));
if (!opts.runId || !opts.taskId) {
  console.error('Usage: node scripts/agents/create-task-worktree.mjs --run <id> --task <id> [--base HEAD]');
  process.exit(1);
}
try {
  const result = createTaskWorktree(opts);
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
