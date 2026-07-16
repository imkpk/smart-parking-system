/**
 * Git worktree isolation helpers.
 *
 * Production defaults use the Smart Parking repository.
 * Tests may inject repoRoot / worktreesDir against a temporary git repo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO_ROOT, WORKTREES_DIR, toPosix } from './paths.mjs';

/**
 * @typedef {{ repoRoot: string, worktreesDir: string }} WorktreeContext
 */

/** @returns {WorktreeContext} */
export function createWorktreeContext({
  repoRoot = REPO_ROOT,
  worktreesDir = null,
} = {}) {
  return {
    repoRoot,
    worktreesDir: worktreesDir || path.join(repoRoot, '.worktrees'),
  };
}

const DEFAULT_CTX = createWorktreeContext();

function resolveCtx(opts = {}) {
  if (opts.repoRoot || opts.worktreesDir) {
    return createWorktreeContext({
      repoRoot: opts.repoRoot || REPO_ROOT,
      worktreesDir: opts.worktreesDir || null,
    });
  }
  return DEFAULT_CTX;
}

function git(args, { cwd, repoRoot } = {}) {
  return execFileSync('git', args, {
    cwd: cwd || repoRoot || REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function safeSegment(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function worktreePathFor(runId, taskId, opts = {}) {
  const ctx = resolveCtx(opts);
  return path.join(ctx.worktreesDir, safeSegment(runId), safeSegment(taskId));
}

export function branchFor(runId, taskId) {
  return `agent/${runId}/${taskId}`.replace(/[^a-zA-Z0-9._\-\/]/g, '-');
}

function currentBranch(repoRoot) {
  return git(['rev-parse', '--abbrev-ref', 'HEAD'], { repoRoot });
}

function branchExists(repoRoot, branch) {
  try {
    git(['rev-parse', '--verify', branch], { repoRoot });
    return true;
  } catch {
    return false;
  }
}

function isWorktreeDirty(cwd) {
  try {
    const status = git(['status', '--porcelain'], { cwd });
    return status.length > 0;
  } catch {
    return true;
  }
}

function hasActiveMerge(repoRoot) {
  const gitDir = path.join(repoRoot, '.git');
  // worktree or normal repo
  const mergeHead = path.join(gitDir, 'MERGE_HEAD');
  if (fs.existsSync(mergeHead)) return true;
  // linked worktree: .git is a file
  try {
    const merge = git(['rev-parse', '-q', '--verify', 'MERGE_HEAD'], { repoRoot });
    return Boolean(merge);
  } catch {
    return false;
  }
}

/**
 * Create a task worktree on a dedicated branch.
 */
export function createTaskWorktree({
  runId,
  taskId,
  baseRef = 'HEAD',
  repoRoot,
  worktreesDir,
} = {}) {
  const ctx = resolveCtx({ repoRoot, worktreesDir });
  const wt = worktreePathFor(runId, taskId, ctx);
  const branch = branchFor(runId, taskId);
  fs.mkdirSync(path.dirname(wt), { recursive: true });

  if (fs.existsSync(wt)) {
    throw new Error(
      `Worktree already exists: ${toPosix(path.relative(ctx.repoRoot, wt))}`,
    );
  }

  try {
    git(['rev-parse', '--verify', baseRef], { repoRoot: ctx.repoRoot });
  } catch {
    throw new Error(`Invalid baseRef: ${baseRef}`);
  }

  if (!branchExists(ctx.repoRoot, branch)) {
    git(['branch', branch, baseRef], { repoRoot: ctx.repoRoot });
  }

  git(['worktree', 'add', wt, branch], { repoRoot: ctx.repoRoot });
  return {
    worktreePath: toPosix(path.relative(ctx.repoRoot, wt)),
    absolutePath: wt,
    branch,
    runId,
    taskId,
    repoRoot: ctx.repoRoot,
  };
}

/**
 * Safe cleanup — refuses if uncommitted work unless force+allowDirty.
 */
export function cleanupTaskWorktree({
  runId,
  taskId,
  force = false,
  allowDirty = false,
  repoRoot,
  worktreesDir,
} = {}) {
  const ctx = resolveCtx({ repoRoot, worktreesDir });
  const wt = worktreePathFor(runId, taskId, ctx);
  if (!fs.existsSync(wt)) {
    return {
      cleaned: false,
      reason: 'worktree missing',
      worktreePath: toPosix(path.relative(ctx.repoRoot, wt)),
    };
  }

  const dirty = isWorktreeDirty(wt);

  if (dirty && !(force && allowDirty)) {
    return {
      cleaned: false,
      reason: 'uncommitted work present — refusing cleanup without --force --allow-dirty',
      dirty: true,
      worktreePath: toPosix(path.relative(ctx.repoRoot, wt)),
    };
  }

  git(['worktree', 'remove', ...(force ? ['--force'] : []), wt], {
    repoRoot: ctx.repoRoot,
  });
  return {
    cleaned: true,
    worktreePath: toPosix(path.relative(ctx.repoRoot, wt)),
    dirty,
  };
}

/**
 * Integrate task branch into the currently checked-out target branch.
 *
 * When targetBranch is supplied, the current branch MUST equal targetBranch.
 * Does not silently checkout another branch.
 */
export function integrateTaskResult({
  runId,
  taskId,
  targetBranch = null,
  message = null,
  repoRoot,
  worktreesDir,
} = {}) {
  const ctx = resolveCtx({ repoRoot, worktreesDir });
  const branch = branchFor(runId, taskId);
  const wt = worktreePathFor(runId, taskId, ctx);

  const actual = currentBranch(ctx.repoRoot);

  if (targetBranch && actual !== targetBranch) {
    return {
      ok: false,
      error: `current branch ${actual} does not match target branch ${targetBranch}`,
      recovery: 'checkout the target integration branch and retry',
      repositorySafe: true,
      currentBranch: actual,
      targetBranch,
    };
  }

  const integrationBranch = targetBranch || actual;

  if (!branchExists(ctx.repoRoot, integrationBranch)) {
    return {
      ok: false,
      error: `target branch does not exist: ${integrationBranch}`,
      recovery: 'create or fetch the target branch, checkout it, and retry',
      repositorySafe: true,
    };
  }

  if (!branchExists(ctx.repoRoot, branch)) {
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
      error: `worktree missing: ${toPosix(path.relative(ctx.repoRoot, wt))}`,
      recovery: 'create-task-worktree then re-run task',
      repositorySafe: true,
    };
  }

  if (isWorktreeDirty(ctx.repoRoot)) {
    return {
      ok: false,
      error: 'main worktree dirty — refuse integrate',
      repositorySafe: true,
      recovery: 'commit or stash main worktree changes',
    };
  }

  // Task branch must contain commits not already on integration branch
  let ahead = '';
  try {
    ahead = git(['rev-list', '--count', `${integrationBranch}..${branch}`], {
      repoRoot: ctx.repoRoot,
    });
  } catch {
    ahead = '0';
  }
  if (String(ahead).trim() === '0') {
    return {
      ok: false,
      error: `task branch ${branch} has no commits to integrate into ${integrationBranch}`,
      recovery: 'ensure the agent committed work on the task branch',
      repositorySafe: true,
      alreadyIntegrated: true,
    };
  }

  const msg =
    message ||
    `integrate(${runId}/${taskId}): merge agent branch\n\nRun-Id: ${runId}\nTask-Id: ${taskId}`;

  try {
    git(['merge', '--no-ff', '--no-commit', branch], { repoRoot: ctx.repoRoot });
    git(['commit', '-m', msg], { repoRoot: ctx.repoRoot });
    return {
      ok: true,
      branch,
      integrationBranch: actual,
      targetBranch: integrationBranch,
      currentBranch: actual,
      message: msg,
      repositorySafe: true,
    };
  } catch (err) {
    try {
      git(['merge', '--abort'], { repoRoot: ctx.repoRoot });
    } catch {
      /* ignore abort failures */
    }
    const mergeStillActive = hasActiveMerge(ctx.repoRoot);
    return {
      ok: false,
      error: `merge conflict or failure: ${err.message}`,
      recovery: 'Resolve conflict in orchestrator-owned integration or re-run task',
      repositorySafe: !mergeStillActive,
      conflict: true,
      mergeStateActive: mergeStillActive,
      currentBranch: actual,
      targetBranch: integrationBranch,
    };
  }
}

/**
 * Reject path traversal inside a worktree (does not require repo root).
 */
export function assertPathInsideWorktree(worktreeAbs, relPath) {
  const posix = toPosix(relPath);
  if (posix.includes('\0')) throw new Error('null byte in path');
  if (posix.split('/').includes('..')) {
    throw new Error(`path traversal rejected: ${posix}`);
  }
  if (path.isAbsolute(relPath) || /^[a-zA-Z]:[\\/]/.test(relPath)) {
    throw new Error(`absolute paths not allowed inside worktree: ${relPath}`);
  }
  const abs = path.resolve(worktreeAbs, posix);
  const rel = path.relative(worktreeAbs, abs);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`path escapes worktree: ${relPath}`);
  }
  return abs;
}
