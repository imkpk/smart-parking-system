#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { MEMORY_DIR } from './lib/paths.mjs';
import { loadYamlFile } from './lib/yaml-load.mjs';
import { ORCHESTRATION_DIR } from './lib/paths.mjs';

const policy = loadYamlFile(path.join(ORCHESTRATION_DIR, 'memory-policy.yaml'));
const findings = [];

function scanDir(rel, statusExpected) {
  const dir = path.join(MEMORY_DIR, rel);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { file: f, data };
    });
}

const now = Date.now();
for (const { file, data } of scanDir('promoted')) {
  if (data.expiry && new Date(data.expiry).getTime() < now) {
    findings.push({ level: 'warn', msg: `expired promoted memory ${data.id}`, file });
  }
  if (!data.reviewer) findings.push({ level: 'error', msg: `promoted without reviewer ${file}` });
  if (!data.evidence?.length) findings.push({ level: 'error', msg: `promoted without evidence ${file}` });
  for (const re of policy.secretPatterns || []) {
    if (new RegExp(re, 'i').test(JSON.stringify(data))) {
      findings.push({ level: 'error', msg: `possible secret in ${file}` });
    }
  }
}

for (const { file, data } of scanDir('proposals')) {
  if (data.containsSecrets) findings.push({ level: 'error', msg: `proposal secrets flag ${file}` });
}

const errors = findings.filter((f) => f.level === 'error');
const warnings = findings.filter((f) => f.level === 'warn');
console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings }, null, 2));
process.exit(errors.length ? 1 : 0);
