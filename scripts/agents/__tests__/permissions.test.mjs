import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadAndValidateManifest } from '../lib/manifest.mjs';
import {
  assertWriteAllowed,
  assertCommandAllowed,
  requiresHumanPermission,
  sanitizePathTraversal,
} from '../lib/permissions.mjs';

describe('permissions', () => {
  const { manifest } = loadAndValidateManifest();

  it('allows core-api backend write', () => {
    const r = assertWriteAllowed(manifest, 'core-api', 'backend/src/bookings/bookings.service.ts');
    assert.equal(r.ok, true, r.error);
  });

  it('denies core-api frontend write', () => {
    const r = assertWriteAllowed(manifest, 'core-api', 'frontend/src/App.tsx');
    assert.equal(r.ok, false);
  });

  it('denies quality feature implementation', () => {
    const r = assertWriteAllowed(manifest, 'quality', 'backend/src/bookings/bookings.service.ts');
    assert.equal(r.ok, false);
  });

  it('blocks dangerous commands', () => {
    const r = assertCommandAllowed('database', 'npx prisma migrate reset');
    assert.equal(r.ok, false);
    const r2 = assertCommandAllowed('devops', 'git push --force origin develop');
    assert.equal(r2.ok, false);
  });

  it('requires human for protected actions', () => {
    assert.equal(requiresHumanPermission('force-push'), true);
    assert.equal(requiresHumanPermission('production-deploy'), true);
  });

  it('rejects path traversal', () => {
    assert.throws(() => sanitizePathTraversal('../outside'));
    assert.throws(() => sanitizePathTraversal('backend/../../etc/passwd'));
  });

  it('rejects shell metacharacters in strict mode', () => {
    const r = assertCommandAllowed('core-api', 'echo hi; rm -rf /', { strictShell: true });
    assert.equal(r.ok, false);
  });
});
