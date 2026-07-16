/**
 * Path helpers for the orchestration control plane.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** scripts/agents */
export const AGENTS_DIR = path.resolve(__dirname, '..');

/** repository root */
export const REPO_ROOT = path.resolve(AGENTS_DIR, '../..');

export const ORCHESTRATION_DIR = path.join(REPO_ROOT, '.grok', 'orchestration');
export const MANIFEST_PATH = path.join(ORCHESTRATION_DIR, 'manifest.yaml');
export const SCHEMAS_DIR = path.join(ORCHESTRATION_DIR, 'schemas');
export const EVALS_DIR = path.join(ORCHESTRATION_DIR, 'evals');
export const MEMORY_DIR = path.join(REPO_ROOT, '.grok', 'memory');
export const AGENT_RUNS_DIR = path.join(REPO_ROOT, '.grok', 'agent-runs');
export const WORKTREES_DIR = path.join(REPO_ROOT, '.worktrees');

export const PLANNER_VERSION = '1.0.0';

export function toPosix(p) {
  return String(p).replace(/\\/g, '/');
}

export function relToRepo(absPath) {
  return toPosix(path.relative(REPO_ROOT, absPath));
}
