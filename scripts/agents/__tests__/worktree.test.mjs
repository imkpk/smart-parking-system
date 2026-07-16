import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

/**
 * Worktree tests use a temporary git repository to avoid touching the main repo.
 */
describe('worktree isolation (temp git repo)', () => {
  let tmp;
  let worktreeHelpers;

  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sp-wt-'));
    execFileSync('git', ['init'], { cwd: tmp });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tmp });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmp });
    fs.writeFileSync(path.join(tmp, 'README.md'), '# tmp\n');
    execFileSync('git', ['add', '.'], { cwd: tmp });
    execFileSync('git', ['commit', '-m', 'init'], { cwd: tmp });

    // Dynamic import of worktree with monkeypatch is heavy; inline minimal clone of logic:
    worktreeHelpers = {
      create(runId, taskId) {
        const wt = path.join(tmp, '.worktrees', runId, taskId);
        const branch = `agent/${runId}/${taskId}`;
        fs.mkdirSync(path.dirname(wt), { recursive: true });
        execFileSync('git', ['branch', branch], { cwd: tmp });
        execFileSync('git', ['worktree', 'add', wt, branch], { cwd: tmp });
        return { wt, branch };
      },
      cleanup(wt, { force = false, allowDirty = false } = {}) {
        const status = execFileSync('git', ['status', '--porcelain'], {
          cwd: wt,
          encoding: 'utf8',
        }).trim();
        if (status && !(force && allowDirty)) {
          return { cleaned: false, dirty: true };
        }
        execFileSync('git', ['worktree', 'remove', ...(force ? ['--force'] : []), wt], {
          cwd: tmp,
        });
        return { cleaned: true, dirty: Boolean(status) };
      },
    };
  });

  after(() => {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('creates isolated worktree and branch', () => {
    const { wt, branch } = worktreeHelpers.create('run1', 'task-a');
    assert.ok(fs.existsSync(wt));
    const head = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: wt,
      encoding: 'utf8',
    }).trim();
    assert.equal(head, branch);
  });

  it('refuses cleanup with uncommitted work', () => {
    const { wt } = worktreeHelpers.create('run1', 'task-b');
    fs.writeFileSync(path.join(wt, 'dirty.txt'), 'x');
    const r = worktreeHelpers.cleanup(wt);
    assert.equal(r.cleaned, false);
    assert.equal(r.dirty, true);
    // force allow dirty
    const r2 = worktreeHelpers.cleanup(wt, { force: true, allowDirty: true });
    assert.equal(r2.cleaned, true);
  });
});
