import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadAndValidateManifest, validateManifest, REQUIRED_AGENT_IDS } from '../lib/manifest.mjs';
import { loadYamlFile } from '../lib/yaml-load.mjs';
import { MANIFEST_PATH } from '../lib/paths.mjs';
import { validateWithSchemaFile } from '../lib/schema-validate.mjs';

describe('manifest validation', () => {
  it('loads and validates canonical manifest', () => {
    const result = loadAndValidateManifest();
    assert.equal(result.valid, true, result.errors.join('\n'));
    assert.equal(result.manifest.agents.length, 12);
  });

  it('includes all required agent ids', () => {
    const { manifest } = loadAndValidateManifest();
    const ids = new Set(manifest.agents.map((a) => a.id));
    for (const id of REQUIRED_AGENT_IDS) assert.ok(ids.has(id), `missing ${id}`);
  });

  it('passes JSON schema', () => {
    const manifest = loadYamlFile(MANIFEST_PATH);
    const r = validateWithSchemaFile(manifest, 'manifest.schema.json');
    assert.equal(r.valid, true, r.errors.join('\n'));
  });

  it('detects missing required agent', () => {
    const { manifest } = loadAndValidateManifest();
    const broken = {
      ...manifest,
      agents: manifest.agents.filter((a) => a.id !== 'testing'),
    };
    const r = validateManifest(broken, { schema: false });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => e.includes('testing')));
  });

  it('detects invalid escalation target', () => {
    const { manifest } = loadAndValidateManifest();
    const agents = manifest.agents.map((a) =>
      a.id === 'core-api' ? { ...a, escalationTarget: 'not-an-agent' } : a,
    );
    const r = validateManifest({ ...manifest, agents }, { schema: false });
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => e.includes('escalationTarget')));
  });

  it('detects unbounded retries', () => {
    const { manifest } = loadAndValidateManifest();
    const agents = manifest.agents.map((a) =>
      a.id === 'core-api' ? { ...a, maximumAttempts: 0 } : a,
    );
    const r = validateManifest({ ...manifest, agents }, { schema: false });
    assert.equal(r.valid, false);
  });

  it('detects missing timeout', () => {
    const { manifest } = loadAndValidateManifest();
    const agents = manifest.agents.map((a) => (a.id === 'core-api' ? { ...a, timeout: 0 } : a));
    const r = validateManifest({ ...manifest, agents }, { schema: false });
    assert.equal(r.valid, false);
  });
});
