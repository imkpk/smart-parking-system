#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { ORCHESTRATION_DIR, REPO_ROOT } from './lib/paths.mjs';
import { loadYamlFile } from './lib/yaml-load.mjs';
import { validateWithSchemaFile } from './lib/schema-validate.mjs';

const data = loadYamlFile(path.join(ORCHESTRATION_DIR, 'schedules.yaml'));
const errors = [];
const warnings = [];

if (!Array.isArray(data.schedules) || !data.schedules.length) {
  errors.push('schedules must be a non-empty array');
}

const forbiddenDefault = data.defaults?.forbiddenActions || [];

for (const s of data.schedules || []) {
  const schema = validateWithSchemaFile(s, 'schedule.schema.json');
  if (!schema.valid) errors.push(...schema.errors.map((e) => `${s.id || '?'}: ${e}`));

  if (!s.timeout || s.timeout <= 0) errors.push(`${s.id}: missing timeout`);
  if (s.retryPolicy?.maxAttempts == null || s.retryPolicy.maxAttempts > 3) {
    errors.push(`${s.id}: unsafe retry policy (maxAttempts must be 0-3)`);
  }
  if (!['read-only', 'report-only', 'propose-only'].includes(s.mode)) {
    errors.push(`${s.id}: unsafe mode ${s.mode}`);
  }
  if (s.permissions?.contents === 'write' && s.mode !== 'propose-only') {
    errors.push(`${s.id}: write permissions require propose-only mode and explicit review`);
  }
  if (s.workflow) {
    const wf = path.join(REPO_ROOT, s.workflow);
    if (!fs.existsSync(wf)) errors.push(`${s.id}: workflow missing ${s.workflow}`);
  } else {
    errors.push(`${s.id}: schedule must reference a workflow (no drift registry)`);
  }
  // cron basic check
  if (!s.cron || s.cron.split(/\s+/).length < 5) errors.push(`${s.id}: invalid cron`);
  if (s.pause?.enabled) warnings.push(`${s.id}: currently paused`);

  const forbidden = [...forbiddenDefault, ...(s.forbiddenActions || [])];
  for (const bad of ['merge', 'deploy', 'change-secrets']) {
    // ensure defaults cover safety
    if (!forbidden.includes(bad) && s.mode !== 'read-only' && s.mode !== 'report-only') {
      warnings.push(`${s.id}: consider forbidding ${bad}`);
    }
  }
}

if (errors.length) {
  console.error('FAIL: schedules invalid');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
for (const w of warnings) console.warn(`WARNING: ${w}`);
console.log(`OK: ${data.schedules.length} schedules valid`);
