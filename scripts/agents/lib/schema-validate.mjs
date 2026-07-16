/**
 * Lightweight JSON Schema (draft-07 subset) validator for orchestration artifacts.
 * Supports: type, properties, required, additionalProperties, items, enum,
 * const, pattern, min/maxLength, min/maxItems, minimum/maximum, oneOf, anyOf,
 * allOf, $ref (same-document #/definitions/...), definitions.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SCHEMAS_DIR, toPosix } from './paths.mjs';

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function resolveRef(schema, root) {
  if (!schema || !schema.$ref) return schema;
  const ref = schema.$ref;
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported $ref (local fragments only): ${ref}`);
  }
  const parts = ref.slice(2).split('/');
  let cur = root;
  for (const p of parts) {
    if (cur == null || !(p in cur)) throw new Error(`Unresolved $ref: ${ref}`);
    cur = cur[p];
  }
  return cur;
}

/**
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateAgainstSchema(data, schema, options = {}) {
  const errors = [];
  const root = options.root ?? schema;
  const pathPrefix = options.path ?? '$';

  function push(msg) {
    errors.push(`${pathPrefix}: ${msg}`);
  }

  function check(value, sch, p) {
    if (!sch || typeof sch !== 'object') return;
    const s = sch.$ref ? resolveRef(sch, root) : sch;
    const ctx = { ...options, root, path: p };

    if (s.const !== undefined && value !== s.const) {
      errors.push(`${p}: expected const ${JSON.stringify(s.const)}`);
      return;
    }
    if (s.enum && !s.enum.includes(value)) {
      errors.push(`${p}: value not in enum ${JSON.stringify(s.enum)}`);
      return;
    }
    if (s.type) {
      const types = Array.isArray(s.type) ? s.type : [s.type];
      const t = typeOf(value);
      const ok = types.some((want) => {
        if (want === 'integer') return t === 'number' && Number.isInteger(value);
        return t === want;
      });
      if (!ok) {
        errors.push(`${p}: expected type ${types.join('|')}, got ${t}`);
        return;
      }
    }
    if (typeof value === 'string') {
      if (s.minLength != null && value.length < s.minLength) {
        errors.push(`${p}: string shorter than minLength ${s.minLength}`);
      }
      if (s.maxLength != null && value.length > s.maxLength) {
        errors.push(`${p}: string longer than maxLength ${s.maxLength}`);
      }
      if (s.pattern) {
        const re = new RegExp(s.pattern);
        if (!re.test(value)) errors.push(`${p}: does not match pattern ${s.pattern}`);
      }
    }
    if (typeof value === 'number') {
      if (s.minimum != null && value < s.minimum) errors.push(`${p}: below minimum ${s.minimum}`);
      if (s.maximum != null && value > s.maximum) errors.push(`${p}: above maximum ${s.maximum}`);
    }
    if (Array.isArray(value)) {
      if (s.minItems != null && value.length < s.minItems) {
        errors.push(`${p}: fewer than minItems ${s.minItems}`);
      }
      if (s.maxItems != null && value.length > s.maxItems) {
        errors.push(`${p}: more than maxItems ${s.maxItems}`);
      }
      if (s.items) {
        value.forEach((item, i) => check(item, s.items, `${p}[${i}]`));
      }
    }
    if (isObject(value)) {
      if (Array.isArray(s.required)) {
        for (const key of s.required) {
          if (!(key in value)) errors.push(`${p}: missing required property "${key}"`);
        }
      }
      if (s.properties) {
        for (const [key, propSch] of Object.entries(s.properties)) {
          if (key in value) check(value[key], propSch, `${p}.${key}`);
        }
      }
      if (s.additionalProperties === false && s.properties) {
        for (const key of Object.keys(value)) {
          if (!(key in s.properties)) errors.push(`${p}: unexpected property "${key}"`);
        }
      } else if (isObject(s.additionalProperties)) {
        for (const key of Object.keys(value)) {
          if (!s.properties || !(key in s.properties)) {
            check(value[key], s.additionalProperties, `${p}.${key}`);
          }
        }
      }
    }
    if (s.oneOf) {
      const matches = s.oneOf.filter((sub) => validateAgainstSchema(value, sub, { root, path: p }).valid);
      if (matches.length !== 1) {
        errors.push(`${p}: expected exactly one of oneOf to match (got ${matches.length})`);
      }
    }
    if (s.anyOf) {
      const ok = s.anyOf.some((sub) => validateAgainstSchema(value, sub, { root, path: p }).valid);
      if (!ok) errors.push(`${p}: none of anyOf matched`);
    }
    if (s.allOf) {
      for (const sub of s.allOf) check(value, sub, p);
    }
  }

  check(data, schema, pathPrefix);
  return { valid: errors.length === 0, errors };
}

export function loadSchema(name) {
  const file = path.join(SCHEMAS_DIR, name.endsWith('.json') ? name : `${name}.schema.json`);
  if (!fs.existsSync(file)) {
    // also try exact name
    const alt = path.join(SCHEMAS_DIR, name);
    if (!fs.existsSync(alt)) {
      throw new Error(`Schema not found: ${toPosix(path.relative(process.cwd(), file))}`);
    }
    return JSON.parse(fs.readFileSync(alt, 'utf8'));
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function validateWithSchemaFile(data, schemaName) {
  const schema = loadSchema(schemaName);
  return validateAgainstSchema(data, schema);
}
