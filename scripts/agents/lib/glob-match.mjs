/**
 * Minimal gitignore-style glob matcher for path activation rules.
 * Supports: **, *, ?, path prefixes, and brace-less patterns only.
 */
import { toPosix } from './paths.mjs';

function escapeRegex(s) {
  return s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a simple glob to RegExp.
 * - ** matches across path segments
 * - * matches within a segment
 * - ? matches one char within a segment
 */
export function globToRegExp(glob) {
  const g = toPosix(glob);
  let re = '^';
  let i = 0;
  while (i < g.length) {
    const c = g[i];
    if (c === '*' && g[i + 1] === '*') {
      // ** or **/
      if (g[i + 2] === '/') {
        re += '(?:.*/)?';
        i += 3;
      } else {
        re += '.*';
        i += 2;
      }
    } else if (c === '*') {
      re += '[^/]*';
      i += 1;
    } else if (c === '?') {
      re += '[^/]';
      i += 1;
    } else {
      re += escapeRegex(c);
      i += 1;
    }
  }
  re += '$';
  return new RegExp(re, 'i');
}

export function matchGlob(pattern, filePath) {
  const file = toPosix(filePath);
  const pat = toPosix(pattern);
  // Directory prefix rule: trailing slash or bare directory means "under this path"
  if (pat.endsWith('/')) {
    return file === pat.slice(0, -1) || file.startsWith(pat);
  }
  if (!pat.includes('*') && !pat.includes('?')) {
    // exact or prefix directory match
    if (file === pat) return true;
    if (file.startsWith(pat.endsWith('/') ? pat : `${pat}/`)) return true;
    // also match basename-style suffixes like schema.prisma
    if (!pat.includes('/') && file.endsWith(`/${pat}`)) return true;
    return false;
  }
  return globToRegExp(pat).test(file);
}

export function matchAnyGlob(patterns, filePath) {
  if (!patterns || patterns.length === 0) return false;
  return patterns.some((p) => matchGlob(p, filePath));
}

/**
 * True if path is within any of the write/read scopes.
 */
export function pathInScopes(filePath, scopes) {
  return matchAnyGlob(scopes || [], filePath);
}
