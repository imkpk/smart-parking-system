#!/usr/bin/env node
import { integrateTaskResult } from './lib/worktree.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--run') out.runId = argv[++i];
    else if (argv[i] === '--task') out.taskId = argv[++i];
    else if (argv[i] === '--target') out.targetBranch = argv[++i];
  }
  return out;
}
const opts = parseArgs(process.argv.slice(2));
if (!opts.runId || !opts.taskId) {
  console.error('Usage: node scripts/agents/integrate-task-result.mjs --run <id> --task <id>');
  process.exit(1);
}
const result = integrateTaskResult(opts);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
