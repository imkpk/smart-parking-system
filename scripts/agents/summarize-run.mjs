#!/usr/bin/env node
import { loadRun, computeMetrics } from './lib/run-store.mjs';

const runId = process.argv.includes('--run')
  ? process.argv[process.argv.indexOf('--run') + 1]
  : null;
if (!runId) {
  console.error('Usage: node scripts/agents/summarize-run.mjs --run <run-id>');
  process.exit(1);
}
const { run, tasks, historical } = loadRun(runId);
if (historical) {
  console.log(JSON.stringify({ runId, historical: true, note: 'Markdown-only historical run' }, null, 2));
  process.exit(0);
}
const metrics = computeMetrics(loadRun(runId).runDir);
console.log(
  JSON.stringify(
    {
      runId,
      status: run.status,
      pattern: run.orchestrationPattern,
      risk: run.riskLevel,
      agents: run.activatedAgents,
      tasks: tasks.map((t) => ({ id: t.id, agent: t.agent, status: t.status, attempt: t.attempt })),
      metrics,
    },
    null,
    2,
  ),
);
