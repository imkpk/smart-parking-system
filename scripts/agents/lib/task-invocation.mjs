/**
 * End-to-end pre-provider validation for a task invocation.
 */
import { getAgent } from './manifest.mjs';
import {
  assertWriteAllowed,
  assertCommandAllowed,
  sanitizePathTraversal,
} from './permissions.mjs';
import { pathInScopes, matchAnyGlob } from './glob-match.mjs';
import { toPosix } from './paths.mjs';

/**
 * Concrete files this task is responsible for writing.
 * Does NOT treat the entire run diff as write targets for every agent
 * (e.g. Testing must not be forced to "write" production sources).
 */
export function resolveTaskWriteFiles(task, relevantFiles = []) {
  const isWriteTask =
    task.writeMode === 'write' ||
    task.writeMode === 'test' ||
    task.type === 'implement' ||
    task.type === 'test';

  // Plan/review/control-plane tasks do not take write targets from the run diff
  if (!isWriteTask) return [];

  const scoped = (task.changedFilesInScope || []).map(toPosix).filter(Boolean);
  if (scoped.length) return [...new Set(scoped)];

  // Fall back: among relevant files, only those inside agent/task allowed write globs
  const allowed = task.allowedPaths || [];
  const candidates = (relevantFiles || []).map(toPosix).filter(Boolean);
  if (!allowed.length) return candidates;
  return candidates.filter((f) => pathInScopes(f, allowed));
}

/**
 * Validate permissions before any provider.invoke call.
 *
 * @returns {{ ok: boolean, errors: Array<{type:string,value:string,reason:string}>, files: string[] }}
 */
export function validateTaskInvocation({
  manifest,
  task,
  agent = null,
  relevantFiles = [],
  validateCommands = true,
} = {}) {
  const errors = [];
  const agentId = task.agent;
  const resolvedAgent = agent || getAgent(manifest, agentId);
  if (!resolvedAgent) {
    return {
      ok: false,
      errors: [{ type: 'agent', value: agentId, reason: `unknown agent ${agentId}` }],
      files: [],
    };
  }

  const writeFiles = resolveTaskWriteFiles(task, relevantFiles);
  const isWriteTask =
    task.writeMode === 'write' ||
    task.writeMode === 'test' ||
    task.type === 'implement' ||
    task.type === 'test';

  for (const file of writeFiles) {
    try {
      sanitizePathTraversal(file);
    } catch (err) {
      errors.push({ type: 'path', value: file, reason: err.message });
      continue;
    }

    if (matchAnyGlob(task.deniedPaths || [], file)) {
      errors.push({ type: 'path', value: file, reason: 'denied by task deniedPaths' });
      continue;
    }

    if (isWriteTask) {
      const check = assertWriteAllowed(manifest, agentId, file);
      if (!check.ok) {
        errors.push({
          type: 'path',
          value: file,
          reason: check.error || 'write not allowed',
        });
        continue;
      }
      if ((task.allowedPaths || []).length > 0 && !pathInScopes(file, task.allowedPaths)) {
        errors.push({
          type: 'path',
          value: file,
          reason: `outside task allowed paths for ${agentId}`,
        });
      }
    }
  }

  // Explicit feature write ban for quality even if misconfigured
  if (agentId === 'quality' && isWriteTask) {
    for (const file of writeFiles) {
      if (
        file.startsWith('backend/src/') ||
        file.startsWith('frontend/src/') ||
        file.startsWith('payment-service/src/') ||
        file.startsWith('iot-edge/')
      ) {
        if (!errors.some((e) => e.value === file)) {
          errors.push({
            type: 'path',
            value: file,
            reason: 'quality agent cannot write feature path',
          });
        }
      }
    }
  }

  // Also reject secret/traversal candidates passed as relevant even for non-write when agent would write
  if (isWriteTask) {
    for (const file of (relevantFiles || []).map(toPosix)) {
      try {
        sanitizePathTraversal(file);
      } catch (err) {
        // only count if this file is being considered as a write target
        if (writeFiles.includes(file) || pathInScopes(file, task.allowedPaths || [])) {
          errors.push({ type: 'path', value: file, reason: err.message });
        }
      }
    }
  }

  if (validateCommands) {
    // Manifest verification recipes are trusted enough to allow && chains,
    // but still subject to denylist / tool-profile blocks.
    for (const cmd of resolvedAgent.qualityRequirements?.verification || []) {
      const check = assertCommandAllowed(agentId, cmd, {
        toolProfile: resolvedAgent.toolProfile,
        strictShell: false,
      });
      if (!check.ok) {
        errors.push({
          type: 'command',
          value: cmd,
          reason: check.error || 'command denied',
        });
      }
    }
    // Task-injected verification commands are untrusted — strict shell + denylist
    for (const cmd of task.verificationCommands || []) {
      const check = assertCommandAllowed(agentId, cmd, {
        toolProfile: resolvedAgent.toolProfile,
        strictShell: true,
      });
      if (!check.ok) {
        errors.push({
          type: 'command',
          value: cmd,
          reason: check.error || 'command denied',
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    files: writeFiles,
  };
}
