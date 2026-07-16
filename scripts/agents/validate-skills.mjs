#!/usr/bin/env node
import path from 'node:path';
import { ORCHESTRATION_DIR } from './lib/paths.mjs';
import { loadYamlFile } from './lib/yaml-load.mjs';
import { validateWithSchemaFile } from './lib/schema-validate.mjs';
import { loadAndValidateManifest } from './lib/manifest.mjs';

const data = loadYamlFile(path.join(ORCHESTRATION_DIR, 'skills.yaml'));
const errors = [];
const warnings = [];
const byId = new Map();

for (const skill of data.skills || []) {
  const schema = validateWithSchemaFile(skill, 'skill.schema.json');
  if (!schema.valid) errors.push(...schema.errors.map((e) => `${skill.id}: ${e}`));
  if (byId.has(skill.id)) errors.push(`duplicate skill id ${skill.id}`);
  byId.set(skill.id, skill);
  if (skill.networkAccess !== 'none' && skill.riskTier === 'critical') {
    warnings.push(`${skill.id}: critical skill with network access`);
  }
  if (skill.status === 'active' && !skill.lastReview) {
    errors.push(`${skill.id}: active skill missing lastReview`);
  }
}

// manifest skill references must exist
const manifest = loadAndValidateManifest().manifest;
for (const agent of manifest.agents) {
  for (const sid of agent.skills || []) {
    if (!byId.has(sid)) errors.push(`agent ${agent.id} references unknown skill ${sid}`);
  }
}

// coexistence: loading multiple skills should not contradict hard rules
const active = [...byId.values()].filter((s) => s.status === 'active');
const contradictions = [];
// Example rule: prisma-migration-safety forbids migrate reset; no skill should instruct it
for (const s of active) {
  if (/migrate reset/i.test(s.instructions || '') && s.id !== 'prisma-migration-safety') {
    contradictions.push(`${s.id} instructs migrate reset`);
  }
}
if (contradictions.length) errors.push(...contradictions.map((c) => `coexistence: ${c}`));

if (errors.length) {
  console.error('FAIL: skills invalid');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
for (const w of warnings) console.warn(`WARNING: ${w}`);
console.log(`OK: ${byId.size} skills valid; coexistence checks passed`);
