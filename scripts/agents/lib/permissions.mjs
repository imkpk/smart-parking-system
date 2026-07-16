/**
 * Permissions and tool profile enforcement.
 */
import path from 'node:path';
import { ORCHESTRATION_DIR, REPO_ROOT, toPosix } from './paths.mjs';
import { loadYamlFile } from './yaml-load.mjs';
import { matchAnyGlob, pathInScopes } from './glob-match.mjs';
import { getAgent } from './manifest.mjs';

export function loadPermissions() {
  return loadYamlFile(path.join(ORCHESTRATION_DIR, 'permissions.yaml'));
}

export function loadToolProfiles() {
  return loadYamlFile(path.join(ORCHESTRATION_DIR, 'tool-profiles.yaml'));
}

const BLOCKED_COMMAND_PATTERNS = [
  /prisma\s+migrate\s+reset/i,
  /DROP\s+DATABASE/i,
  /git\s+push\s+.*--force/i,
  /git\s+push\s+.*-f\b/i,
  /rm\s+-rf\s+[\/\\]/i,
  /printenv|env\s*\|\s*grep/i,
  /aws\s+secretsmanager/i,
];

const SECRET_PATH_PATTERNS = [
  /\.env$/i,
  /\.env\.[^.]/i,
  /id_rsa/,
  /\.pem$/i,
  /credentials\.json$/i,
  /secrets?\./i,
];

/**
 * Check whether a write to relPath is allowed for agent.
 */
export function assertWriteAllowed(manifest, agentId, relPath) {
  const agent = getAgent(manifest, agentId);
  if (!agent) return { ok: false, error: `unknown agent ${agentId}` };
  const file = toPosix(relPath);
  if (matchAnyGlob(agent.deniedPaths || [], file)) {
    return { ok: false, error: `path denied for ${agentId}: ${file}` };
  }
  // Quality cannot silently implement feature changes
  if (agentId === 'quality' && isFeaturePath(file)) {
    return { ok: false, error: `quality agent cannot write feature path: ${file}` };
  }
  if ((agent.writePaths || []).length === 0) {
    return { ok: false, error: `agent ${agentId} has no writePaths` };
  }
  if (!pathInScopes(file, agent.writePaths)) {
    return { ok: false, error: `write outside allowed scope for ${agentId}: ${file}` };
  }
  if (SECRET_PATH_PATTERNS.some((re) => re.test(file)) && !file.endsWith('.env.example')) {
    return { ok: false, error: `refusing write to secret-like path: ${file}` };
  }
  return { ok: true };
}

function isFeaturePath(file) {
  return (
    file.startsWith('backend/src/') ||
    file.startsWith('frontend/src/') ||
    file.startsWith('payment-service/src/') ||
    file.startsWith('iot-edge/')
  );
}

/**
 * Check shell command against blocked patterns and tool profile.
 */
export function assertCommandAllowed(agentId, command, options = {}) {
  const cmd = String(command);
  for (const re of BLOCKED_COMMAND_PATTERNS) {
    if (re.test(cmd)) {
      return { ok: false, error: `blocked dangerous command for ${agentId}: matches ${re}` };
    }
  }
  // shell metacharacter abuse when not explicitly allowed
  if (options.strictShell && /[;&|`$]/.test(cmd) && !options.allowShellMeta) {
    return { ok: false, error: `shell metacharacters not allowed: ${cmd}` };
  }

  let profiles;
  try {
    profiles = loadToolProfiles();
  } catch {
    return { ok: true, warning: 'tool-profiles.yaml missing — command allowed by default denylist only' };
  }
  const manifestAgentProfile = options.toolProfile;
  const profile = profiles.profiles?.[manifestAgentProfile];
  if (profile?.deniedCommands) {
    for (const pat of profile.deniedCommands) {
      if (cmd.includes(pat) || new RegExp(pat, 'i').test(cmd)) {
        return { ok: false, error: `command denied by profile ${manifestAgentProfile}: ${pat}` };
      }
    }
  }
  if (profile?.requiresHumanApproval) {
    for (const pat of profile.requiresHumanApproval) {
      if (cmd.toLowerCase().includes(String(pat).toLowerCase())) {
        return {
          ok: false,
          error: `command requires human approval (${pat})`,
          requiresHuman: true,
        };
      }
    }
  }
  return { ok: true };
}

/**
 * Actions that always need human permission.
 */
export function requiresHumanPermission(action) {
  const perms = (() => {
    try {
      return loadPermissions();
    } catch {
      return null;
    }
  })();
  const list = perms?.alwaysRequireHuman || [
    'merge-protected-branch',
    'production-deploy',
    'change-production-secrets',
    'destructive-database',
    'force-push',
    'branch-protection-change',
    'repository-deletion',
    'environment-deletion',
    'credential-rotation',
  ];
  return list.includes(action);
}

export function sanitizePathTraversal(inputPath) {
  const posix = toPosix(inputPath);
  if (posix.includes('\0')) throw new Error('null byte in path');
  if (posix.split('/').includes('..')) throw new Error(`path traversal rejected: ${posix}`);
  const abs = path.resolve(REPO_ROOT, posix);
  const rel = toPosix(path.relative(REPO_ROOT, abs));
  if (rel.startsWith('..')) throw new Error(`path escapes repository: ${posix}`);
  return rel;
}
