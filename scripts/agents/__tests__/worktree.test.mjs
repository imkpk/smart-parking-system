import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import {
  createTaskWorktree,
  cleanupTaskWorktree,
  integrateTaskResult,
  assertPathInsideWorktree,
  branchFor,
  worktreePathFor,
} from '../lib/worktree.mjs';

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/**
 * Production worktree helpers exercised against a temporary Git repository.
 */
describe('production worktree helper (temp git repo)', () => {
  let tmp;
  let worktreesDir;
  let ctx;

  before(() => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-wt-prod-'));
    // Keep worktrees outside the git worktree so they never dirty status
    tmp = path.join(root, 'repo');
    worktreesDir = path.join(root, 'worktrees');
    fs.mkdirSync(tmp, { recursive: true });
    git(tmp, ['init']);
    git(tmp, ['config', 'user.email', 'test@example.com']);
    git(tmp, ['config', 'user.name', 'Test']);
    try {
      git(tmp, ['checkout', '-b', 'develop']);
    } catch {
      /* already on a branch */
    }
    fs.writeFileSync(path.join(tmp, 'README.md'), '# tmp\n');
    fs.writeFileSync(path.join(tmp, '.gitignore'), 'node_modules/\n');
    git(tmp, ['add', '.']);
    git(tmp, ['commit', '-m', 'init']);
    ctx = { repoRoot: tmp, worktreesDir };
  });

  after(() => {
    try {
      // prune worktrees
      try {
        git(tmp, ['worktree', 'prune']);
      } catch {
        /* ignore */
      }
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    try {
      git(tmp, ['merge', '--abort']);
    } catch {
      /* none */
    }
    // remove all registered worktrees under temp repo
    try {
      const list = git(tmp, ['worktree', 'list', '--porcelain']);
      const paths = list
        .split(/\r?\n/)
        .filter((l) => l.startsWith('worktree '))
        .map((l) => l.slice('worktree '.length))
        .filter((p) => p !== tmp && p.includes('.worktrees'));
      for (const p of paths) {
        try {
          git(tmp, ['worktree', 'remove', '--force', p]);
        } catch {
          try {
            fs.rmSync(p, { recursive: true, force: true });
          } catch {
            /* ignore */
          }
        }
      }
      git(tmp, ['worktree', 'prune']);
    } catch {
      /* ignore */
    }
    try {
      if (fs.existsSync(worktreesDir)) {
        fs.rmSync(worktreesDir, { recursive: true, force: true });
      }
    } catch {
      /* ignore */
    }
    try {
      git(tmp, ['checkout', 'develop']);
      git(tmp, ['reset', '--hard', 'HEAD']);
      git(tmp, ['clean', '-fd']);
    } catch {
      /* ignore */
    }
  });

  it('creates an isolated worktree and task branch', () => {
    const r = createTaskWorktree({
      runId: 'run1',
      taskId: 'task-a',
      baseRef: 'HEAD',
      ...ctx,
    });
    assert.ok(fs.existsSync(r.absolutePath));
    const head = git(r.absolutePath, ['rev-parse', '--abbrev-ref', 'HEAD']);
    assert.equal(head, branchFor('run1', 'task-a'));
  });

  it('refuses duplicate worktree creation', () => {
    createTaskWorktree({ runId: 'run-dup', taskId: 'task-a', ...ctx });
    assert.throws(() =>
      createTaskWorktree({ runId: 'run-dup', taskId: 'task-a', ...ctx }),
    );
  });

  it('refuses invalid base ref', () => {
    assert.throws(
      () =>
        createTaskWorktree({
          runId: 'run1',
          taskId: 'task-b',
          baseRef: 'no-such-ref-xyz',
          ...ctx,
        }),
      /Invalid baseRef/,
    );
  });

  it('refuses cleanup when uncommitted work exists', () => {
    const r = createTaskWorktree({ runId: 'run-dirty', taskId: 'task-a', ...ctx });
    fs.writeFileSync(path.join(r.absolutePath, 'dirty.txt'), 'x');
    const cleaned = cleanupTaskWorktree({
      runId: 'run-dirty',
      taskId: 'task-a',
      ...ctx,
    });
    assert.equal(cleaned.cleaned, false);
    assert.equal(cleaned.dirty, true);
  });

  it('allows explicit dirty cleanup only with both safety flags', () => {
    const r = createTaskWorktree({ runId: 'run-dirty', taskId: 'task-b', ...ctx });
    fs.writeFileSync(path.join(r.absolutePath, 'dirty.txt'), 'x');
    const denied = cleanupTaskWorktree({
      runId: 'run-dirty',
      taskId: 'task-b',
      force: true,
      allowDirty: false,
      ...ctx,
    });
    assert.equal(denied.cleaned, false);
    const ok = cleanupTaskWorktree({
      runId: 'run-dirty',
      taskId: 'task-b',
      force: true,
      allowDirty: true,
      ...ctx,
    });
    assert.equal(ok.cleaned, true);
  });

  it('refuses integration when current branch differs from targetBranch', () => {
    const r = createTaskWorktree({ runId: 'run-int', taskId: 'task-a', ...ctx });
    fs.writeFileSync(path.join(r.absolutePath, 'feat.txt'), 'a');
    git(r.absolutePath, ['add', '.']);
    git(r.absolutePath, ['commit', '-m', 'feat']);
    // stay on develop but request target feature/other
    git(tmp, ['branch', 'feature/other']);
    const res = integrateTaskResult({
      runId: 'run-int',
      taskId: 'task-a',
      targetBranch: 'feature/other',
      ...ctx,
    });
    assert.equal(res.ok, false);
    assert.match(res.error, /does not match target branch/);
    assert.equal(res.repositorySafe, true);
  });

  it('successfully integrates into the actual target branch', () => {
    git(tmp, ['checkout', 'develop']);
    git(tmp, ['reset', '--hard', 'HEAD']);
    git(tmp, ['clean', '-fd']);
    const r = createTaskWorktree({ runId: 'run-int', taskId: 'task-b', ...ctx });
    fs.writeFileSync(path.join(r.absolutePath, 'feat2.txt'), 'b');
    git(r.absolutePath, ['add', 'feat2.txt']);
    git(r.absolutePath, ['commit', '-m', 'feat2']);

    git(tmp, ['checkout', 'develop']);
    // ensure main tree clean before integrate
    const dirty = git(tmp, ['status', '--porcelain']);
    assert.equal(dirty, '', `expected clean tree, got: ${dirty}`);
    const res = integrateTaskResult({
      runId: 'run-int',
      taskId: 'task-b',
      targetBranch: 'develop',
      ...ctx,
    });
    assert.equal(res.ok, true, res.error);
    assert.equal(res.integrationBranch, 'develop');
    assert.equal(res.currentBranch, 'develop');
    assert.ok(fs.existsSync(path.join(tmp, 'feat2.txt')));
  });

  it('refuses integration when main worktree is dirty', () => {
    const r = createTaskWorktree({ runId: 'run-int', taskId: 'task-c', ...ctx });
    fs.writeFileSync(path.join(r.absolutePath, 'feat3.txt'), 'c');
    git(r.absolutePath, ['add', '.']);
    git(r.absolutePath, ['commit', '-m', 'feat3']);
    git(tmp, ['checkout', 'develop']);
    fs.writeFileSync(path.join(tmp, 'main-dirty.txt'), 'dirty');
    const res = integrateTaskResult({
      runId: 'run-int',
      taskId: 'task-c',
      targetBranch: 'develop',
      ...ctx,
    });
    assert.equal(res.ok, false);
    assert.match(res.error, /dirty/i);
    fs.unlinkSync(path.join(tmp, 'main-dirty.txt'));
  });

  it('refuses missing task branch', () => {
    // create worktree then delete branch ref is hard; simulate missing by wrong ids
    const res = integrateTaskResult({
      runId: 'run-missing',
      taskId: 'no-task',
      targetBranch: 'develop',
      ...ctx,
    });
    assert.equal(res.ok, false);
    assert.match(res.error, /branch missing|worktree missing/);
  });

  it('refuses missing worktree', () => {
    // create branch without worktree
    const branch = branchFor('run2', 'task-a');
    git(tmp, ['branch', branch, 'HEAD']);
    const res = integrateTaskResult({
      runId: 'run2',
      taskId: 'task-a',
      targetBranch: 'develop',
      ...ctx,
    });
    assert.equal(res.ok, false);
    assert.match(res.error, /worktree missing/);
  });

  it('rolls back merge conflicts and leaves no merge state', () => {
    // base file
    fs.writeFileSync(path.join(tmp, 'conflict.txt'), 'base\n');
    git(tmp, ['add', '.']);
    git(tmp, ['commit', '-m', 'conflict base']);

    const r = createTaskWorktree({
      runId: 'run-conflict',
      taskId: 'task-a',
      baseRef: 'HEAD',
      ...ctx,
    });
    fs.writeFileSync(path.join(r.absolutePath, 'conflict.txt'), 'agent\n');
    git(r.absolutePath, ['add', '.']);
    git(r.absolutePath, ['commit', '-m', 'agent conflict']);

    // diverge develop
    git(tmp, ['checkout', 'develop']);
    fs.writeFileSync(path.join(tmp, 'conflict.txt'), 'main\n');
    git(tmp, ['add', '.']);
    git(tmp, ['commit', '-m', 'main conflict']);

    const res = integrateTaskResult({
      runId: 'run-conflict',
      taskId: 'task-a',
      targetBranch: 'develop',
      ...ctx,
    });
    assert.equal(res.ok, false);
    assert.equal(res.conflict, true);
    // no MERGE_HEAD
    let mergeActive = false;
    try {
      git(tmp, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']);
      mergeActive = true;
    } catch {
      mergeActive = false;
    }
    assert.equal(mergeActive, false);
    assert.equal(res.repositorySafe, true);
  });

  it('rejects path traversal inside worktrees', () => {
    const r = createTaskWorktree({ runId: 'run1', taskId: 'task-c', ...ctx });
    assert.throws(() => assertPathInsideWorktree(r.absolutePath, '../outside'));
    assert.throws(() => assertPathInsideWorktree(r.absolutePath, 'foo/../../etc/passwd'));
    const ok = assertPathInsideWorktree(r.absolutePath, 'src/file.ts');
    assert.ok(ok.includes('src'));
  });

  it('exports worktreePathFor with injected context', () => {
    const p = worktreePathFor('runX', 'taskY', ctx);
    assert.ok(p.startsWith(worktreesDir));
  });
});
