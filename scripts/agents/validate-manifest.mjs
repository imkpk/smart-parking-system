#!/usr/bin/env node
/**
 * Validate the canonical agent manifest.
 * Usage: node scripts/agents/validate-manifest.mjs [--manifest path]
 */
import path from 'node:path';
import { loadAndValidateManifest } from './lib/manifest.mjs';
import { MANIFEST_PATH, toPosix } from './lib/paths.mjs';

const args = process.argv.slice(2);
let manifestPath = MANIFEST_PATH;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--manifest' && args[i + 1]) manifestPath = path.resolve(args[++i]);
  if (args[i] === '--help' || args[i] === '-h') {
    console.log('Usage: node scripts/agents/validate-manifest.mjs [--manifest path]');
    process.exit(0);
  }
}

const result = loadAndValidateManifest(manifestPath);
if (result.warnings.length) {
  for (const w of result.warnings) console.warn(`WARNING: ${w}`);
}
if (!result.valid) {
  console.error(`FAIL: manifest invalid (${toPosix(manifestPath)})`);
  for (const e of result.errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`OK: manifest valid (${result.manifest.agents.length} agents, version ${result.manifest.version})`);
process.exit(0);
