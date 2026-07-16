#!/usr/bin/env node
/**
 * node scripts/agents/update-task-state.mjs --run <id> --task <id> --status RUNNING [--error msg]
 */
import { updateTaskState } from './lib/run-store.mjs';

function parseArgs(argv) {
  const out = { evidence: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run') out.runId = argv[++i];
    else if (a === '--task') out.taskId = argv[++i];
    else if (a === '--status') out.status = argv[++i];
    else if (a === '--error') out.error = argv[++i];
    else if (a === '--evidence') out.evidence.push(argv[++i]);
    else if (a === '--help') out.help = true;
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || !opts.runId || !opts.taskId || !opts.status) {
  console.log('Usage: node scripts/agents/update-task-state.mjs --run <id> --task <id> --status <STATE>');
  process.exit(opts.help ? 0 : 1);
}

try {
  const task = updateTaskState(opts.runId, opts.taskId, opts.status, {
    error: opts.error,
    evidence: opts.evidence,
  });
  console.log(JSON.stringify({ id: task.id, status: task.status, attempt: task.attempt }, null, 2));
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
