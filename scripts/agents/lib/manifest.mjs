/**
 * Canonical agent manifest loader and semantic validator.
 */
import fs from 'node:fs';
import path from 'node:path';
import { MANIFEST_PATH, ORCHESTRATION_DIR, toPosix } from './paths.mjs';
import { loadYamlFile } from './yaml-load.mjs';
import { validateWithSchemaFile } from './schema-validate.mjs';

export const REQUIRED_AGENT_IDS = [
  'orchestrator',
  'core-api',
  'experience',
  'payments',
  'quality',
  'database',
  'devops',
  'security',
  'testing',
  'documentation',
  'performance',
  'events-iot',
];

export function loadManifest(manifestPath = MANIFEST_PATH) {
  return loadYamlFile(manifestPath);
}

/**
 * Semantic validation beyond JSON Schema.
 * @returns {{ valid: boolean, errors: string[], warnings: string[], manifest: object|null }}
 */
export function validateManifest(manifest, options = {}) {
  const errors = [];
  const warnings = [];

  if (!manifest || typeof manifest !== 'object') {
    return { valid: false, errors: ['manifest is not an object'], warnings, manifest: null };
  }

  // Schema validation when schema file exists
  const schemaPath = path.join(ORCHESTRATION_DIR, 'schemas', 'manifest.schema.json');
  if (fs.existsSync(schemaPath) && options.schema !== false) {
    const schemaResult = validateWithSchemaFile(manifest, 'manifest.schema.json');
    if (!schemaResult.valid) {
      errors.push(...schemaResult.errors.map((e) => `schema: ${e}`));
    }
  }

  if (!manifest.version) errors.push('missing version');
  if (!Array.isArray(manifest.agents) || manifest.agents.length === 0) {
    errors.push('agents must be a non-empty array');
    return { valid: false, errors, warnings, manifest };
  }

  const byId = new Map();
  for (const agent of manifest.agents) {
    if (!agent?.id) {
      errors.push('agent missing id');
      continue;
    }
    if (byId.has(agent.id)) errors.push(`duplicate agent id: ${agent.id}`);
    byId.set(agent.id, agent);

    if (!agent.timeout || agent.timeout <= 0) {
      errors.push(`agent ${agent.id}: missing or invalid timeout`);
    }
    if (agent.maximumAttempts == null || agent.maximumAttempts < 1) {
      errors.push(`agent ${agent.id}: maximumAttempts must be >= 1 (unbounded retries forbidden)`);
    }
    if (agent.maximumAttempts > 10) {
      warnings.push(`agent ${agent.id}: maximumAttempts ${agent.maximumAttempts} is high`);
    }
    if (!agent.toolProfile) errors.push(`agent ${agent.id}: missing toolProfile`);
    if (!agent.escalationTarget) errors.push(`agent ${agent.id}: missing escalationTarget`);
    if (!agent.writePaths || !Array.isArray(agent.writePaths)) {
      errors.push(`agent ${agent.id}: writePaths required (may be empty array)`);
    }
    if (!agent.readPaths || !Array.isArray(agent.readPaths)) {
      errors.push(`agent ${agent.id}: readPaths required`);
    }
    if (!agent.deniedPaths || !Array.isArray(agent.deniedPaths)) {
      errors.push(`agent ${agent.id}: deniedPaths required`);
    }
    if (!agent.qualityRequirements) {
      errors.push(`agent ${agent.id}: missing qualityRequirements`);
    }
    if (!agent.memoryAccess) {
      errors.push(`agent ${agent.id}: missing memoryAccess`);
    }
    if (!agent.riskTier) {
      errors.push(`agent ${agent.id}: missing riskTier`);
    }
  }

  for (const id of REQUIRED_AGENT_IDS) {
    if (!byId.has(id)) errors.push(`missing required agent: ${id}`);
  }

  for (const agent of byId.values()) {
    if (agent.escalationTarget && !byId.has(agent.escalationTarget) && agent.escalationTarget !== 'human') {
      errors.push(`agent ${agent.id}: invalid escalationTarget "${agent.escalationTarget}"`);
    }
    for (const dep of agent.dependencies || []) {
      if (!byId.has(dep)) errors.push(`agent ${agent.id}: unknown dependency "${dep}"`);
    }
  }

  // Detect dependency cycles among agent dependency graph
  const cycle = findCycle(byId);
  if (cycle) errors.push(`circular agent dependencies: ${cycle.join(' -> ')}`);

  return { valid: errors.length === 0, errors, warnings, manifest };
}

function findCycle(byId) {
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function dfs(id) {
    if (visiting.has(id)) {
      const idx = stack.indexOf(id);
      return [...stack.slice(idx), id];
    }
    if (visited.has(id)) return null;
    visiting.add(id);
    stack.push(id);
    const agent = byId.get(id);
    for (const dep of agent?.dependencies || []) {
      const c = dfs(dep);
      if (c) return c;
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
    return null;
  }

  for (const id of byId.keys()) {
    const c = dfs(id);
    if (c) return c;
  }
  return null;
}

export function getAgent(manifest, id) {
  return manifest.agents.find((a) => a.id === id) || null;
}

export function agentByDisplayId(manifest, displayId) {
  return manifest.agents.find((a) => a.displayId === displayId) || null;
}

export function loadAndValidateManifest(manifestPath = MANIFEST_PATH) {
  const manifest = loadManifest(manifestPath);
  return validateManifest(manifest);
}
