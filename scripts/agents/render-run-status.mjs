#!/usr/bin/env node
import { loadRun, renderStatusMarkdown } from './lib/run-store.mjs';
import fs from 'node:fs';
import path from 'node:path';

const runId = process.argv.includes('--run')
  ? process.argv[process.argv.indexOf('--run') + 1]
  : null;
if (!runId) {
  console.error('Usage: node scripts/agents/render-run-status.mjs --run <run-id>');
  process.exit(1);
}
const { runDir, historical, run } = loadRun(runId);
if (historical) {
  console.log(fs.readFileSync(path.join(runDir, 'status.md'), 'utf8'));
  process.exit(0);
}
renderStatusMarkdown(runDir);
console.log(fs.readFileSync(path.join(runDir, 'status.md'), 'utf8'));
