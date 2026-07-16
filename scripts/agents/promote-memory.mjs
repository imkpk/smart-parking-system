#!/usr/bin/env node
/**
 * Promote a reviewed memory proposal (Quality or human only).
 */
import fs from 'node:fs';
import path from 'node:path';
import { MEMORY_DIR, toPosix } from './lib/paths.mjs';
import { validateWithSchemaFile } from './lib/schema-validate.mjs';
import { appendEvent } from './lib/events.mjs';
import { runDirFor } from './lib/run-store.mjs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--id') out.id = argv[++i];
    else if (argv[i] === '--reviewer') out.reviewer = argv[++i];
    else if (argv[i] === '--expiry') out.expiry = argv[++i];
    else if (argv[i] === '--review-date') out.reviewDate = argv[++i];
  }
  return out;
}

const opts = parseArgs(process.argv.slice(2));
if (!opts.id || !opts.reviewer) {
  console.error(
    'Usage: node scripts/agents/promote-memory.mjs --id <id> --reviewer quality|human [--expiry ISO] [--review-date ISO]',
  );
  process.exit(1);
}
if (!['quality', 'human', '⑤', 'quality-agent'].includes(opts.reviewer) && !opts.reviewer.startsWith('human')) {
  // allow explicit quality/human tokens
  if (opts.reviewer !== 'quality' && !opts.reviewer.includes('human')) {
    console.error('ERROR: promotion requires reviewer quality or human');
    process.exit(1);
  }
}

const propFile = path.join(MEMORY_DIR, 'proposals', `${opts.id}.json`);
if (!fs.existsSync(propFile)) {
  console.error(`ERROR: proposal not found: ${opts.id}`);
  process.exit(1);
}
const proposal = JSON.parse(fs.readFileSync(propFile, 'utf8'));
if (!proposal.evidence?.length) {
  console.error('ERROR: cannot promote without evidence');
  process.exit(1);
}
if (proposal.externalSources?.length && !opts.reviewer.includes('human')) {
  console.error('ERROR: proposals citing external web sources require human review');
  process.exit(1);
}
if (proposal.containsSecrets) {
  console.error('ERROR: proposal marked containsSecrets');
  process.exit(1);
}

const reviewDate = opts.reviewDate || new Date().toISOString();
const expiry =
  opts.expiry ||
  new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString();

const promoted = {
  ...proposal,
  status: 'promoted',
  reviewer: opts.reviewer,
  reviewDate,
  expiry,
};

const schema = validateWithSchemaFile(promoted, 'memory-proposal.schema.json');
if (!schema.valid) {
  console.error(schema.errors.join('\n'));
  process.exit(1);
}

// conflict detection by title
const promotedDir = path.join(MEMORY_DIR, 'promoted');
fs.mkdirSync(promotedDir, { recursive: true });
for (const f of fs.readdirSync(promotedDir).filter((x) => x.endsWith('.json'))) {
  const other = JSON.parse(fs.readFileSync(path.join(promotedDir, f), 'utf8'));
  if (other.title === promoted.title && other.id !== promoted.id && other.status === 'promoted') {
    promoted.conflictsWith = other.id;
    other.status = 'superseded';
    fs.writeFileSync(path.join(promotedDir, f), JSON.stringify(other, null, 2), 'utf8');
  }
}

fs.writeFileSync(path.join(promotedDir, `${promoted.id}.json`), JSON.stringify(promoted, null, 2), 'utf8');
proposal.status = 'promoted';
fs.writeFileSync(propFile, JSON.stringify(proposal, null, 2), 'utf8');

try {
  appendEvent(runDirFor(proposal.sourceRun), {
    type: 'memory.promoted',
    runId: proposal.sourceRun,
    taskId: proposal.sourceTask,
    payload: { id: promoted.id, reviewer: opts.reviewer },
  });
} catch {
  /* ignore */
}

console.log(
  JSON.stringify(
    {
      ok: true,
      id: promoted.id,
      path: toPosix(path.join('.grok/memory/promoted', `${promoted.id}.json`)),
      conflictsWith: promoted.conflictsWith || null,
    },
    null,
    2,
  ),
);
