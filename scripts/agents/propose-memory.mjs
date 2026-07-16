#!/usr/bin/env node
/**
 * Propose durable memory — never auto-promotes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { MEMORY_DIR, toPosix } from './lib/paths.mjs';
import { validateWithSchemaFile } from './lib/schema-validate.mjs';
import { loadYamlFile } from './lib/yaml-load.mjs';
import { ORCHESTRATION_DIR } from './lib/paths.mjs';
import { appendEvent } from './lib/events.mjs';
import { runDirFor } from './lib/run-store.mjs';

function parseArgs(argv) {
  const out = { evidence: [], external: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--title') out.title = argv[++i];
    else if (a === '--body') out.body = argv[++i];
    else if (a === '--run') out.runId = argv[++i];
    else if (a === '--task') out.taskId = argv[++i];
    else if (a === '--evidence') out.evidence.push(argv[++i]);
    else if (a === '--scope') out.scope = argv[++i];
    else if (a === '--confidence') out.confidence = argv[++i];
    else if (a === '--external') out.external.push(argv[++i]);
    else if (a === '--id') out.id = argv[++i];
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.title || !opts.runId || !opts.taskId || !opts.evidence.length) {
  console.error(
    'Usage: node scripts/agents/propose-memory.mjs --title t --run id --task id --evidence e [--body b] [--scope s]',
  );
  process.exit(1);
}

const policy = loadYamlFile(path.join(ORCHESTRATION_DIR, 'memory-policy.yaml'));
const body = opts.body || opts.title;
for (const re of policy.secretPatterns || []) {
  const rx = new RegExp(re, 'i');
  if (rx.test(body) || rx.test(opts.title)) {
    console.error('ERROR: proposal appears to contain secrets — rejected');
    process.exit(1);
  }
}

const id = opts.id || `mem-${Date.now()}`;
const proposal = {
  id,
  title: opts.title,
  sourceRun: opts.runId,
  sourceTask: opts.taskId,
  evidence: opts.evidence,
  body,
  confidence: opts.confidence || 'medium',
  scope: opts.scope || 'general',
  createdAt: new Date().toISOString(),
  status: 'proposed',
  reviewer: null,
  reviewDate: null,
  expiry: null,
  externalSources: opts.external,
  containsSecrets: false,
};

const schema = validateWithSchemaFile(proposal, 'memory-proposal.schema.json');
if (!schema.valid) {
  console.error('ERROR: schema validation failed');
  for (const e of schema.errors) console.error(`  - ${e}`);
  process.exit(1);
}

const outDir = path.join(MEMORY_DIR, 'proposals');
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `${id}.json`);
fs.writeFileSync(file, JSON.stringify(proposal, null, 2), 'utf8');

// also copy under run
const runProp = path.join(runDirFor(opts.runId), 'memory-proposals', `${id}.json`);
try {
  fs.mkdirSync(path.dirname(runProp), { recursive: true });
  fs.writeFileSync(runProp, JSON.stringify(proposal, null, 2), 'utf8');
  appendEvent(runDirFor(opts.runId), {
    type: 'memory.proposed',
    runId: opts.runId,
    taskId: opts.taskId,
    payload: { id, title: opts.title },
  });
} catch {
  /* run may not exist in unit tests */
}

console.log(JSON.stringify({ ok: true, id, path: toPosix(path.relative(process.cwd(), file)) }, null, 2));
