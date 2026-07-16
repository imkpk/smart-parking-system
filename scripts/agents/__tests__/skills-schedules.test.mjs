import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { AGENTS_DIR } from '../lib/paths.mjs';

function run(script) {
  return execFileSync(process.execPath, [path.join(AGENTS_DIR, script)], {
    encoding: 'utf8',
    cwd: path.join(AGENTS_DIR, '../..'),
  });
}

describe('skills and schedules validation', () => {
  it('validates skills registry', () => {
    const out = run('validate-skills.mjs');
    assert.ok(out.includes('OK'));
  });

  it('validates schedules', () => {
    const out = run('validate-schedules.mjs');
    assert.ok(out.includes('OK'));
  });
});
