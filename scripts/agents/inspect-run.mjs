#!/usr/bin/env node
import { loadRun, computeMetrics } from './lib/run-store.mjs';
import { readEvents } from './lib/events.mjs';

const runId = process.argv.includes('--run')
  ? process.argv[process.argv.indexOf('--run') + 1]
  : null;
const showEvents = process.argv.includes('--events');
if (!runId) {
  console.error('Usage: node scripts/agents/inspect-run.mjs --run <run-id> [--events]');
  process.exit(1);
}
const { runDir, run, tasks, events, historical } = loadRun(runId);
if (historical) {
  console.log(JSON.stringify({ runId, historical: true, runDir }, null, 2));
  process.exit(0);
}
const metrics = computeMetrics(runDir);
const out = {
  run,
  tasks,
  metrics,
  events: showEvents ? events : { count: events.length, tip: 'pass --events to list' },
};
console.log(JSON.stringify(out, null, 2));
