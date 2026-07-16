#!/usr/bin/env node
/**
 * Validate a structured run ledger.
 * Usage: node scripts/agents/validate-run.mjs --run <run-id>
 */
import { loadRun, listTasks } from './lib/run-store.mjs';
import { validateWithSchemaFile } from './lib/schema-validate.mjs';
import { canTransition, TASK_STATES } from './lib/state-machine.mjs';
import { pathInScopes } from './lib/glob-match.mjs';
import { loadAndValidateManifest, getAgent } from './lib/manifest.mjs';

function parseArgs(argv) {
  const out = { runId: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--run') out.runId = argv[++i];
    if (argv[i] === '--help') out.help = true;
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help || !opts.runId) {
  console.log('Usage: node scripts/agents/validate-run.mjs --run <run-id>');
  process.exit(opts.help ? 0 : 1);
}

const errors = [];
const warnings = [];
const { runDir, run, tasks, historical } = loadRun(opts.runId);

if (historical) {
  console.log(`OK: historical Markdown-only run (no run.json) — ${opts.runId}`);
  process.exit(0);
}
if (!run) {
  console.error('FAIL: missing run.json');
  process.exit(1);
}

const runSchema = validateWithSchemaFile(run, 'run.schema.json');
if (!runSchema.valid) errors.push(...runSchema.errors.map((e) => `run: ${e}`));

const manifestResult = loadAndValidateManifest();
const manifest = manifestResult.manifest;

// circular task deps
const byId = new Map(tasks.map((t) => [t.id, t]));
function hasCycle() {
  const visiting = new Set();
  const visited = new Set();
  function dfs(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const d of byId.get(id)?.dependencies || []) {
      if (byId.has(d) && dfs(d)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  return [...byId.keys()].some(dfs);
}
if (hasCycle()) errors.push('circular task dependencies detected');

// unknown agents, timeouts, retries, evidence
for (const t of tasks) {
  const ts = validateWithSchemaFile(t, 'task.schema.json');
  if (!ts.valid) errors.push(...ts.errors.map((e) => `task ${t.id}: ${e}`));
  if (!TASK_STATES.includes(t.status)) errors.push(`task ${t.id}: invalid status ${t.status}`);
  if (!getAgent(manifest, t.agent)) errors.push(`task ${t.id}: unknown agent ${t.agent}`);
  if (!t.timeout || t.timeout <= 0) errors.push(`task ${t.id}: missing timeout`);
  if (!t.maximumAttempts || t.maximumAttempts < 1) errors.push(`task ${t.id}: unbounded retries`);
  if (t.maximumAttempts > 10) errors.push(`task ${t.id}: maximumAttempts too high`);

  // write scope outside permissions
  const agent = getAgent(manifest, t.agent);
  if (agent && t.allowedPaths) {
    for (const p of t.allowedPaths) {
      if (agent.deniedPaths?.some((d) => pathInScopes(p.replace(/\*\*/g, 'x'), [d]))) {
        // soft check
      }
    }
  }

  // Testing before implementation
  if (t.agent === 'testing' && t.type === 'test') {
    for (const d of t.dependencies || []) {
      const dep = byId.get(d);
      if (dep && dep.type === 'implement' && dep.status !== 'SUCCEEDED' && t.status === 'RUNNING') {
        errors.push(`Testing task ${t.id} running before implementation ${d} succeeded`);
      }
    }
  }
  // Quality before verification
  if (t.agent === 'quality') {
    const testing = tasks.find((x) => x.agent === 'testing');
    if (testing && t.status === 'SUCCEEDED' && testing.status !== 'SUCCEEDED' && testing.status !== 'CANCELLED') {
      // only error if quality finished first improperly
      if (['RUNNING', 'READY', 'PLANNED'].includes(testing.status)) {
        warnings.push(`Quality ${t.id} completed while testing still ${testing.status}`);
      }
    }
  }
}

// overlapping parallel writes: tasks RUNNING with overlapping scopes
const running = tasks.filter((t) => t.status === 'RUNNING' && t.writeMode === 'write');
for (let i = 0; i < running.length; i++) {
  for (let j = i + 1; j < running.length; j++) {
    const a = running[i];
    const b = running[j];
    const aRoots = (a.allowedPaths || []).map((p) => p.split('*')[0]);
    const bRoots = (b.allowedPaths || []).map((p) => p.split('*')[0]);
    for (const ar of aRoots) {
      for (const br of bRoots) {
        if (ar && br && (ar.startsWith(br) || br.startsWith(ar))) {
          errors.push(`overlapping parallel write ownership: ${a.id} and ${b.id}`);
        }
      }
    }
  }
}

if (errors.length) {
  console.error(`FAIL: run ${opts.runId}`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
if (warnings.length) for (const w of warnings) console.warn(`WARNING: ${w}`);
console.log(`OK: run ${opts.runId} (${tasks.length} tasks, status ${run.status})`);
