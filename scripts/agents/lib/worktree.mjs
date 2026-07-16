/**
 * Git worktree isolation helpers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT, WORKTREES_DIR, toPosix } from './paths.mjs';
import { sanitizePathTraversal } from './permissions.mjs';

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: opts.cwd || REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

export function worktreePathFor(runId, taskId) {
  const safeRun = String(runId).replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeTask = String(taskId).replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(WORKTREES_DIR, safeRun, safeTask);
}

export function branchFor(runId, taskId) {
  return `agent/${runId}/${taskId}`.replace(/[^a-zA-Z0-9._\-\/]/g, '-');
}

/**
 * Create a task worktree on a dedicated branch.
 */
export function createTaskWorktree({ runId, taskId, baseRef = 'HEAD' }) {
  const wt = worktreePathFor(runId, taskId);
  const branch = branchFor(runId, taskId);
  fs.mkdirSync(path.dirname(wt), { recursive: true });

  if (fs.existsSync(wt)) {
    throw new Error(`Worktree already exists: ${toPosix(path.relative(REPO_ROOT, wt))}`);
  }

  // Ensure base exists
  try {
    git(['rev-parse', '--verify', baseRef]);
  } catch {
    throw new Error(`Invalid baseRef: ${baseRef}`);
  }

  // Create branch if needed
  try {
    git(['show-ref', '--verify', `--quiet`, `refs/heads/${branch}`]);
  } catch {
    git(['branch', branch, baseRef]);
  }

  git(['worktree', 'add', wt, branch]);
  return {
    worktreePath: toPosix(path.relative(REPO_ROOT, wt)),
    absolutePath: wt,
    branch,
    runId,
    taskId,
  };
}

/**
 * Safe cleanup — refuses if uncommitted work unless force+allowDirty.
 */
export function cleanupTaskWorktree({ runId, taskId, force = false, allowDirty = false }) {
  const wt = worktreePathFor(runId, taskId);
  if (!fs.existsSync(wt)) {
    return { cleaned: false, reason: 'worktree missing', worktreePath: wt };
  }

  let dirty = false;
  try {
    const status = git(['status', '--porcelain'], { cwd: wt });
    dirty = status.length > 0;
  } catch {
    dirty = true;
  }

  if (dirty && !(force && allowDirty)) {
    return {
      cleaned: false,
      reason: 'uncommitted work present — refusing cleanup without --force --allow-dirty',
      dirty: true,
      worktreePath: toPosix(path.relative(REPO_ROOT, wt)),
    };
  }

  git(['worktree', 'remove', ...(force ? ['--force'] : []), wt]);
  // optionally delete branch left to integrate step
  return {
    cleaned: true,
    worktreePath: toPosix(path.relative(REPO_ROOT, wt)),
    dirty,
  };
}

/**
 * Integrate task branch into integration branch with conflict detection.
 */
export function integrateTaskResult({
  runId,
  taskId,
  targetBranch = null,
  message = null,
}) {
  const branch = branchFor(runId, taskId);
  const wt = worktreePathFor(runId, taskId);

  // verify branch exists
  try {
    git(['rev-parse', '--verify', branch]);
  } catch {
    return {
      ok: false,
      error: `branch missing: ${branch}`,
      recovery: 'Recreate worktree or mark task failed',
      repositorySafe: true,
    };
  }

  if (!fs.existsSync(wt)) {
    return {
      ok: false,
      error: `worktree missing: ${toPosix(path.relative(REPO_ROOT, wt))}`,
      recovery: 'create-task-worktree then re-run task',
      repositorySafe: true,
    };
  }

  const integrationBranch =
    targetBranch || git(['rev-parse', '--abbrev-ref', 'HEAD']);

  try {
    // Attempt merge without committing first for conflict detect when possible
    const treeStatus = git(['status', '--porcelain']);
    if (treeStatus) {
      return {
        ok: false,
        error: 'main worktree dirty — refuse integrate',
        repositorySafe: true,
        recovery: 'commit or stash main worktree changes',
      };
    }
    git(['merge', '--no-ff', '--no-commit', branch]);
    // If we got here, merge applied cleanly to index; abort to leave decision to caller?
    // For automation, complete merge with message including run/task ids
    const msg =
      message ||
      `integrate(${runId}/${taskId}): merge agent branch\n\nRun-Id: ${runId}\nTask-Id: ${taskId}`;
    git(['commit', '-m', msg]);
    return { ok: true, branch, integrationBranch, message: msg };
  } catch (err) {
    try {
      git(['merge', '--abort']);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      error: `merge conflict or failure: ${err.message}`,
      recovery: 'Resolve conflict in orchestrator-owned integration or re-run task',
      repositorySafe: true,
      conflict: true,
    };
  }
}

export function assertPathInsideWorktree(worktreeAbs, relPath) {
  const safe = sanitizePathTraversal(relPath);
  const abs = path.resolve(worktreeAbs, safe);
  const rel = path.relative(worktreeAbs, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`path escapes worktree: ${relPath}`);
  }
  return abs;
}
