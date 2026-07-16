/**
 * YAML load/dump helpers (yaml package resolved from scripts/agents/node_modules).
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse, stringify } from 'yaml';
import { REPO_ROOT, toPosix } from './paths.mjs';

export function loadYamlFile(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
  if (!fs.existsSync(abs)) {
    throw new Error(`YAML file not found: ${toPosix(path.relative(REPO_ROOT, abs))}`);
  }
  const text = fs.readFileSync(abs, 'utf8');
  try {
    return parse(text);
  } catch (err) {
    throw new Error(`Invalid YAML in ${toPosix(path.relative(REPO_ROOT, abs))}: ${err.message}`);
  }
}

export function parseYaml(text, label = 'yaml') {
  try {
    return parse(text);
  } catch (err) {
    throw new Error(`Invalid YAML (${label}): ${err.message}`);
  }
}

export function dumpYaml(value) {
  return stringify(value, { lineWidth: 120, defaultStringType: 'QUOTE_DOUBLE', defaultKeyType: 'PLAIN' });
}

export function writeYamlFile(filePath, value) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(REPO_ROOT, filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, dumpYaml(value), 'utf8');
}
