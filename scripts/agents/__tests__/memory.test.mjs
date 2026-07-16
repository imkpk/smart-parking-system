import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { MEMORY_DIR, AGENTS_DIR } from '../lib/paths.mjs';

function runNode(script, args) {
  return execFileSync(process.execPath, [path.join(AGENTS_DIR, script), ...args], {
    encoding: 'utf8',
    cwd: path.join(AGENTS_DIR, '../..'),
  });
}

describe('memory governance', () => {
  const id = `test-mem-${Date.now()}`;

  it('proposes and promotes with evidence', () => {
    const out = runNode('propose-memory.mjs', [
      '--id',
      id,
      '--title',
      'Prefer AccessPolicyService for tenant checks',
      '--body',
      'Use AccessPolicyService rather than ad-hoc org filters.',
      '--run',
      'synthetic-run',
      '--task',
      'task-1',
      '--evidence',
      'backend/src/common/access-policy.service.ts',
      '--scope',
      'backend',
      '--confidence',
      'high',
    ]);
    assert.ok(out.includes(id));
    const propPath = path.join(MEMORY_DIR, 'proposals', `${id}.json`);
    assert.ok(fs.existsSync(propPath));

    const promo = runNode('promote-memory.mjs', [
      '--id',
      id,
      '--reviewer',
      'quality',
      '--expiry',
      new Date(Date.now() + 86400000).toISOString(),
    ]);
    assert.ok(promo.includes(id));
    assert.ok(fs.existsSync(path.join(MEMORY_DIR, 'promoted', `${id}.json`)));
  });

  it('rejects secret-like proposals', () => {
    assert.throws(() =>
      runNode('propose-memory.mjs', [
        '--title',
        'creds',
        '--body',
        'api_key=supersecretvalue',
        '--run',
        'r',
        '--task',
        't',
        '--evidence',
        'x',
      ]),
    );
  });
});
