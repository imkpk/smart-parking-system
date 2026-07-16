/**
 * Deterministic run planner — path-based routing, no LLM.
 */
import { execFileSync } from 'node:child_process';
import { PLANNER_VERSION, REPO_ROOT, toPosix } from './paths.mjs';
import { loadAndValidateManifest, getAgent } from './manifest.mjs';
import { matchAnyGlob, matchGlob } from './glob-match.mjs';

const DEFAULT_SPLIT_THRESHOLD = 40;

const PERFORMANCE_HINTS = [
  /fan-?out/i,
  /paginat/i,
  /staleTime|gcTime|react-query|useQuery/i,
  /websocket|WebSocket/i,
  /N\+1|findMany|include:\s*\{/i,
  /cache|redis/i,
  /large.?data|bulk/i,
];

// Path-segment aware hints (avoid matching "ROLES.md" via bare "role")
const SECURITY_CONTENT_HINTS = [
  /(^|\/)(\.env|secrets?)(\/|$|\.)/i,
  /(^|\/).*?(auth|jwt|rbac|guard|permission)s?(\/|$|\.)/i,
  /password|api[_-]?key|private[_-]?key|bearer/i,
];

/**
 * @param {object} options
 * @param {string[]} [options.files] - explicit changed files (skips git)
 * @param {string} [options.base]
 * @param {string} [options.head]
 * @param {object} [options.manifest]
 * @param {string} [options.contentHints] - optional concatenated file content for heuristics
 */
export function planRun(options = {}) {
  const manifestResult = options.manifest
    ? { valid: true, errors: [], manifest: options.manifest }
    : loadAndValidateManifest();
  if (!manifestResult.valid) {
    throw new Error(`Invalid manifest:\n${manifestResult.errors.join('\n')}`);
  }
  const manifest = manifestResult.manifest;
  const files = (options.files ?? listChangedFiles(options.base ?? 'origin/develop', options.head ?? 'HEAD')).map(
    toPosix,
  );

  const activation = new Map(); // id -> { reasons: Set }
  const always = manifest.policy?.alwaysActive || ['orchestrator', 'quality'];
  for (const id of always) {
    mark(activation, id, 'policy.alwaysActive');
  }

  // Path-based activation from each agent's activation.paths
  for (const agent of manifest.agents) {
    const paths = agent.activation?.paths || [];
    const pathExclude = agent.activation?.pathExclude || [];
    for (const file of files) {
      if (pathExclude.length && matchAnyGlob(pathExclude, file)) continue;
      if (paths.length && matchAnyGlob(paths, file)) {
        mark(activation, agent.id, `path:${file}`);
      }
    }
    // content keyword activation (filename-based for deterministic tests)
    const keywords = agent.activation?.keywords || [];
    if (keywords.length) {
      for (const file of files) {
        const base = file.toLowerCase();
        if (keywords.some((k) => base.includes(String(k).toLowerCase()))) {
          mark(activation, agent.id, `keyword:${file}`);
        }
      }
    }
  }

  // Security content heuristics on paths
  for (const file of files) {
    if (SECURITY_CONTENT_HINTS.some((re) => re.test(file))) {
      mark(activation, 'security', `security-sensitive path:${file}`);
    }
  }

  // Performance: manual or heuristic
  const perf = getAgent(manifest, 'performance');
  if (perf?.activation?.mode === 'heuristic' || perf?.activation?.mode === 'manual-or-heuristic') {
    for (const file of files) {
      if (PERFORMANCE_HINTS.some((re) => re.test(file))) {
        mark(activation, 'performance', `performance-heuristic:${file}`);
      }
    }
    if (options.contentHints && PERFORMANCE_HINTS.some((re) => re.test(options.contentHints))) {
      mark(activation, 'performance', 'performance-heuristic:content');
    }
  }

  // Production behavior change → testing
  const productionChange = files.some((f) => isProductionPath(f));
  const testOnly = files.length > 0 && files.every((f) => isTestPath(f));
  if (productionChange || testOnly) {
    mark(activation, 'testing', productionChange ? 'production behavior changed' : 'test files changed');
  }

  // Docs-only: strip application writers if only docs/orchestration/meta
  const docsOnly = files.length > 0 && files.every((f) => isDocsPath(f));
  if (docsOnly) {
    for (const id of [...activation.keys()]) {
      if (['core-api', 'experience', 'payments', 'database', 'events-iot', 'performance'].includes(id)) {
        activation.delete(id);
      }
    }
    mark(activation, 'documentation', 'docs-only change set');
    // testing not needed for pure docs unless policy says
    if (manifest.policy?.testingOnDocsOnly === false) {
      activation.delete('testing');
    }
  }

  // CI / scripts only → devops, not app writers
  const infraOnly =
    files.length > 0 &&
    files.every(
      (f) =>
        f.startsWith('.github/') ||
        f.startsWith('scripts/') ||
        /^Dockerfile/i.test(f) ||
        f.includes('docker-compose') ||
        f.endsWith('.env.example'),
    );
  if (infraOnly) {
    mark(activation, 'devops', 'infra-only change set');
  }

  // Ensure orchestrator + quality
  mark(activation, 'orchestrator', 'always');
  mark(activation, 'quality', 'always — last');

  // Unknown paths: flag for adaptive investigation
  const knownPrefixes = collectKnownPrefixes(manifest);
  const unknownFiles = files.filter((f) => !isKnownPath(f, knownPrefixes, manifest));
  if (unknownFiles.length) {
    mark(activation, 'orchestrator', `unknown paths require investigation: ${unknownFiles.slice(0, 5).join(', ')}`);
  }

  const activatedIds = [...activation.keys()];
  const risk = classifyRisk(files, activatedIds, manifest);
  const pattern = selectPattern({ files, activatedIds, docsOnly, unknownFiles, risk, productionChange });
  const tasks = buildTasks({ activatedIds, files, activation, manifest, productionChange });
  const { parallelGroups, sequentialGroups, order } = buildOrdering(tasks, manifest);
  const overlappingWrites = detectOverlappingWrites(tasks, manifest);
  const splitRecommendation = recommendSplit(files, activatedIds, manifest);

  const plan = {
    plannerVersion: PLANNER_VERSION,
    base: options.base ?? null,
    head: options.head ?? null,
    changedFiles: files,
    activatedAgents: activatedIds.map((id) => {
      const a = getAgent(manifest, id);
      return {
        id,
        displayId: a?.displayId ?? id,
        name: a?.name ?? id,
        reasons: [...(activation.get(id)?.reasons || [])],
      };
    }),
    activationReasons: Object.fromEntries(
      [...activation.entries()].map(([id, v]) => [id, [...v.reasons]]),
    ),
    riskClassification: risk,
    orchestrationPattern: pattern,
    tasks,
    dependencies: Object.fromEntries(tasks.map((t) => [t.id, t.dependencies])),
    parallelGroups,
    sequentialGroups,
    executionOrder: order,
    permissions: buildPermissionsView(activatedIds, manifest),
    verificationRequirements: buildVerification(activatedIds, files, manifest),
    qualityGate: {
      agent: 'quality',
      position: 'last',
      required: true,
      checklist: 'docs/agents/QUALITY_REVIEW.md',
    },
    splitRecommendation,
    overlappingWriteOwnership: overlappingWrites,
    metrics: {
      fileCount: files.length,
      agentCount: activatedIds.length,
      taskCount: tasks.length,
    },
  };

  return plan;
}

function mark(map, id, reason) {
  if (!map.has(id)) map.set(id, { reasons: new Set() });
  map.get(id).reasons.add(reason);
}

export function listChangedFiles(base, head) {
  try {
    const out = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    return out
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (err) {
    // fallback without triple-dot
    try {
      const out = execFileSync('git', ['diff', '--name-only', base, head], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      });
      return out
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    } catch (err2) {
      throw new Error(`Failed to list changed files (${base}...${head}): ${err2.message}`);
    }
  }
}

function isProductionPath(f) {
  return (
    f.startsWith('backend/src/') ||
    f.startsWith('frontend/src/') ||
    f.startsWith('payment-service/src/') ||
    f.startsWith('iot-edge/') ||
    f.startsWith('backend/prisma/')
  ) && !isTestPath(f);
}

function isTestPath(f) {
  return (
    /\.(spec|test)\.(ts|tsx|js|jsx|mjs|java)$/i.test(f) ||
    f.includes('/__tests__/') ||
    f.includes('/test/') ||
    f.includes('cypress/') ||
    /jest\.config|vitest\.config/i.test(f)
  );
}

function isDocsPath(f) {
  return (
    f.startsWith('docs/') ||
    f.startsWith('.grok/') ||
    f === 'MASTER_PROMPT.md' ||
    f === 'Agents.md' ||
    f === 'README.md' ||
    f.endsWith('.md')
  );
}

function collectKnownPrefixes(manifest) {
  const prefixes = new Set();
  for (const agent of manifest.agents) {
    // Skip catch-all always-active agents (orchestrator **/*) when defining "known" product paths
    if (agent.id === 'orchestrator' || agent.activation?.mode === 'always') continue;
    for (const p of agent.activation?.paths || []) {
      if (p === '**/*' || p === '**') continue;
      prefixes.add(p);
    }
    for (const p of agent.writePaths || []) {
      if (p === '**/*' || p === '**') continue;
      prefixes.add(p);
    }
  }
  [
    'backend/',
    'frontend/',
    'payment-service/',
    'iot-edge/',
    'docs/',
    '.grok/',
    '.github/',
    'scripts/',
    'infra/',
    'docker-compose',
    'MASTER_PROMPT.md',
    'Agents.md',
    'README.md',
  ].forEach((p) => prefixes.add(p));
  return [...prefixes];
}

function isKnownPath(file, knownPrefixes, manifest) {
  if (isDocsPath(file) || isTestPath(file)) return true;
  for (const p of knownPrefixes) {
    if (p === '**/*' || p === '**') continue;
    if (matchGlob(p, file)) return true;
    const bare = p.replace(/\*\*.*$/, '').replace(/\*$/, '');
    if (bare && (file === bare || file.startsWith(bare.endsWith('/') ? bare : `${bare}/`) || file.startsWith(bare))) {
      return true;
    }
  }
  // specialist activation only (skip orchestrator catch-all)
  for (const agent of manifest.agents) {
    if (agent.id === 'orchestrator' || agent.activation?.mode === 'always') continue;
    const paths = (agent.activation?.paths || []).filter((p) => p !== '**/*' && p !== '**');
    if (paths.length && matchAnyGlob(paths, file)) return true;
  }
  return false;
}

function classifyRisk(files, activatedIds, manifest) {
  let level = 'low';
  const reasons = [];
  const docsOnly = files.length > 0 && files.every((f) => isDocsPath(f));
  const testOnly = files.length > 0 && files.every((f) => isTestPath(f));
  const infraOnly =
    files.length > 0 &&
    files.every(
      (f) =>
        f.startsWith('.github/') ||
        f.startsWith('scripts/') ||
        /^Dockerfile/i.test(f) ||
        f.includes('docker-compose') ||
        f.endsWith('.env.example'),
    );

  if (docsOnly) {
    return { level: 'low', reasons: ['docs-only change set'], services: [] };
  }
  if (testOnly) {
    return { level: 'low', reasons: ['test-only change set'], services: [] };
  }
  if (infraOnly || activatedIds.includes('devops')) {
    if (files.some((f) => f.startsWith('.github/workflows/') || f.startsWith('scripts/'))) {
      level = 'high';
      reasons.push('CI/workflow or automation scripts');
    } else {
      level = 'medium';
      reasons.push('infra change');
    }
  }
  if (activatedIds.includes('security')) {
    level = 'high';
    reasons.push('security agent activated');
  }
  if (activatedIds.includes('database') && files.some((f) => f.includes('migration') || f.endsWith('schema.prisma'))) {
    level = level === 'high' ? 'high' : 'medium';
    reasons.push('schema/migration change');
  }
  if (activatedIds.includes('payments')) {
    level = level === 'low' ? 'medium' : level;
    reasons.push('payment domain');
  }
  if (activatedIds.includes('events-iot')) {
    level = level === 'low' ? 'medium' : level;
    reasons.push('events/iot domain');
  }
  const services = new Set();
  if (files.some((f) => f.startsWith('backend/') && !isTestPath(f))) services.add('backend');
  if (files.some((f) => f.startsWith('frontend/') && !isTestPath(f))) services.add('frontend');
  if (files.some((f) => f.startsWith('payment-service/') && !isTestPath(f))) services.add('payment');
  if (files.some((f) => f.startsWith('iot-edge/') && !isTestPath(f))) services.add('iot');
  if (services.size >= 3) {
    level = 'high';
    reasons.push('cross-service change');
  } else if (services.size === 2) {
    if (level === 'low') level = 'medium';
    reasons.push('multi-service change');
  }
  const threshold = manifest.policy?.splitFileThreshold ?? DEFAULT_SPLIT_THRESHOLD;
  if (files.length >= threshold) {
    level = 'high';
    reasons.push(`file count ${files.length} >= ${threshold}`);
  }
  return { level, reasons, services: [...services] };
}

function selectPattern({ files, activatedIds, docsOnly, unknownFiles, risk, productionChange }) {
  // Unknown paths with no specialist writers → investigate before coding
  const specialists = activatedIds.filter(
    (id) => !['orchestrator', 'quality', 'documentation', 'testing'].includes(id),
  );
  if (unknownFiles.length > 0 && specialists.length === 0) {
    return 'adaptive-investigation';
  }
  if (
    unknownFiles.length > 0 &&
    specialists.length <= 1 &&
    files.every((f) => unknownFiles.includes(f) || isDocsPath(f))
  ) {
    return 'adaptive-investigation';
  }
  if (docsOnly) return 'deterministic-routing';
  const writers = activatedIds.filter((id) =>
    ['core-api', 'experience', 'payments', 'database', 'devops', 'security', 'events-iot', 'documentation', 'performance'].includes(
      id,
    ),
  );
  if (writers.length <= 1 && !unknownFiles.length) return 'deterministic-routing';
  if (risk.level === 'high' && writers.length >= 3) return 'hybrid';
  // concurrent-read-analysis when only reviewers / no overlapping writes expected
  if (writers.length >= 2 && !productionChange) return 'concurrent-read-analysis';
  if (writers.length >= 2) return 'hybrid';
  if (activatedIds.includes('testing') && activatedIds.includes('quality')) return 'evaluator-optimizer';
  return 'sequential';
}

function buildTasks({ activatedIds, files, activation, manifest, productionChange }) {
  const tasks = [];
  // orchestrator plan task
  tasks.push({
    id: 'task-orchestrator-plan',
    agent: 'orchestrator',
    type: 'plan',
    dependencies: [],
    writeMode: 'control-plane',
  });

  const orderHints = {
    database: 10,
    security: 20,
    'core-api': 30,
    experience: 30,
    payments: 30,
    devops: 30,
    'events-iot': 30,
    documentation: 30,
    performance: 35,
    testing: 80,
    quality: 90,
  };

  const writers = activatedIds.filter((id) => !['orchestrator', 'testing', 'quality'].includes(id));
  for (const id of writers.sort((a, b) => (orderHints[a] ?? 50) - (orderHints[b] ?? 50))) {
    const deps = ['task-orchestrator-plan'];
    if (id === 'core-api' && writers.includes('database')) deps.push('task-database-implement');
    if ((id === 'core-api' || id === 'experience') && writers.includes('security')) {
      // soft ordering: security review can parallel but prefer before if auth files
      if (files.some((f) => /auth|guard|permission|rbac|jwt/i.test(f))) {
        deps.push('task-security-implement');
      }
    }
    tasks.push({
      id: `task-${id}-implement`,
      agent: id,
      type: 'implement',
      dependencies: deps,
      writeMode: 'write',
      reasons: [...(activation.get(id)?.reasons || [])],
    });
  }

  if (activatedIds.includes('testing')) {
    const implDeps = tasks.filter((t) => t.type === 'implement').map((t) => t.id);
    tasks.push({
      id: 'task-testing-verify',
      agent: 'testing',
      type: 'test',
      dependencies: implDeps.length ? implDeps : ['task-orchestrator-plan'],
      writeMode: 'test',
    });
  }

  if (activatedIds.includes('quality')) {
    const prev = tasks.filter((t) => t.agent !== 'quality').map((t) => t.id);
    tasks.push({
      id: 'task-quality-gate',
      agent: 'quality',
      type: 'review',
      dependencies: prev.filter((id) => id === 'task-testing-verify' || !activatedIds.includes('testing') || id !== 'skip'),
      writeMode: 'review',
    });
    // quality depends on testing if present, else all implement
    const q = tasks.find((t) => t.id === 'task-quality-gate');
    if (activatedIds.includes('testing')) {
      q.dependencies = ['task-testing-verify'];
    } else {
      q.dependencies = tasks.filter((t) => t.id !== 'task-quality-gate').map((t) => t.id);
    }
  }

  // Enrich with paths from manifest
  for (const t of tasks) {
    const agent = getAgent(manifest, t.agent);
    t.allowedPaths = agent?.writePaths || [];
    t.deniedPaths = agent?.deniedPaths || [];
    t.readPaths = agent?.readPaths || [];
    t.maximumAttempts = agent?.maximumAttempts ?? 2;
    t.timeout = agent?.timeout ?? 3600;
    t.changedFilesInScope = files.filter(
      (f) => matchAnyGlob(agent?.writePaths || [], f) || matchAnyGlob(agent?.activation?.paths || [], f),
    );
  }

  return tasks;
}

function buildOrdering(tasks, manifest) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  // topological levels for parallel groups
  const indeg = new Map(tasks.map((t) => [t.id, 0]));
  for (const t of tasks) {
    for (const d of t.dependencies) {
      if (byId.has(d)) {
        // count edges d -> t
      }
    }
  }
  for (const t of tasks) {
    indeg.set(
      t.id,
      t.dependencies.filter((d) => byId.has(d)).length,
    );
  }

  const levels = [];
  const remaining = new Set(tasks.map((t) => t.id));
  const done = new Set();
  while (remaining.size) {
    const ready = [...remaining].filter((id) => {
      const t = byId.get(id);
      return t.dependencies.every((d) => done.has(d) || !byId.has(d));
    });
    if (ready.length === 0) {
      // cycle fallback
      levels.push([...remaining]);
      break;
    }
    // split ready into parallel-safe by write scopes
    const group = partitionParallelSafe(
      ready.map((id) => byId.get(id)),
      manifest,
    );
    for (const g of group) {
      levels.push(g.map((t) => t.id));
      for (const t of g) {
        remaining.delete(t.id);
        done.add(t.id);
      }
    }
  }

  const order = levels.flat();
  const sequentialGroups = levels.filter((g) => g.length === 1);
  const parallelGroups = levels.filter((g) => g.length > 1);
  return { parallelGroups, sequentialGroups, order, levels };
}

function partitionParallelSafe(readyTasks, manifest) {
  // Never parallelize tasks with overlapping write ownership
  const groups = [];
  const placed = new Set();
  for (const t of readyTasks) {
    if (placed.has(t.id)) continue;
    const group = [t];
    placed.add(t.id);
    for (const other of readyTasks) {
      if (placed.has(other.id)) continue;
      const overlap = writesOverlap(t, other, manifest);
      if (!overlap && !group.some((g) => writesOverlap(g, other, manifest))) {
        // also: review/test can join reads
        group.push(other);
        placed.add(other.id);
      }
    }
    groups.push(group);
  }
  return groups;
}

function writesOverlap(a, b, manifest) {
  if (a.writeMode === 'review' || b.writeMode === 'review') return false;
  if (a.writeMode === 'control-plane' || b.writeMode === 'control-plane') return false;
  if (a.writeMode === 'test' && b.writeMode === 'test') {
    // tests can conflict on same test files — treat same agent only
    return a.agent === b.agent;
  }
  const aPaths = a.allowedPaths || [];
  const bPaths = b.allowedPaths || [];
  for (const ap of aPaths) {
    for (const bp of bPaths) {
      if (scopesOverlap(ap, bp)) return true;
    }
  }
  return false;
}

function scopesOverlap(a, b) {
  const ap = toPosix(a).replace(/\*\*.*$/, '').replace(/\*$/, '').replace(/\/$/, '');
  const bp = toPosix(b).replace(/\*\*.*$/, '').replace(/\*$/, '').replace(/\/$/, '');
  if (!ap || !bp) return false;
  return ap === bp || ap.startsWith(`${bp}/`) || bp.startsWith(`${ap}/`);
}

function detectOverlappingWrites(tasks, manifest) {
  const writers = tasks.filter((t) => t.writeMode === 'write');
  const overlaps = [];
  for (let i = 0; i < writers.length; i++) {
    for (let j = i + 1; j < writers.length; j++) {
      if (writesOverlap(writers[i], writers[j], manifest)) {
        overlaps.push({
          a: writers[i].id,
          b: writers[j].id,
          agents: [writers[i].agent, writers[j].agent],
        });
      }
    }
  }
  return overlaps;
}

function recommendSplit(files, activatedIds, manifest) {
  const threshold = manifest.policy?.splitFileThreshold ?? DEFAULT_SPLIT_THRESHOLD;
  const services = [];
  if (files.some((f) => f.startsWith('backend/prisma/'))) services.push('database');
  if (files.some((f) => f.startsWith('backend/') && !f.startsWith('backend/prisma/'))) services.push('backend');
  if (files.some((f) => f.startsWith('frontend/'))) services.push('frontend');
  if (files.some((f) => f.startsWith('payment-service/'))) services.push('payments');
  if (files.some((f) => f.startsWith('iot-edge/') || f.includes('mqtt'))) services.push('iot');

  const recommend = files.length >= threshold || services.length >= 3;
  return {
    recommend,
    reason: recommend
      ? files.length >= threshold
        ? `changed file count ${files.length} exceeds threshold ${threshold}`
        : `cross-service scope: ${services.join(', ')}`
      : 'within single-PR budget',
    suggestedSlices: recommend
      ? services.map((s) => ({ name: s, agents: sliceAgents(s) }))
      : [],
  };
}

function sliceAgents(service) {
  const map = {
    database: ['database', 'testing', 'quality'],
    backend: ['core-api', 'testing', 'quality'],
    frontend: ['experience', 'testing', 'quality'],
    payments: ['payments', 'testing', 'quality'],
    iot: ['events-iot', 'core-api', 'testing', 'quality'],
  };
  return map[service] || ['orchestrator', 'quality'];
}

function buildPermissionsView(activatedIds, manifest) {
  return activatedIds.map((id) => {
    const a = getAgent(manifest, id);
    return {
      agent: id,
      writePaths: a?.writePaths || [],
      deniedPaths: a?.deniedPaths || [],
      toolProfile: a?.toolProfile,
      riskTier: a?.riskTier,
    };
  });
}

function buildVerification(activatedIds, files, manifest) {
  const cmds = [];
  if (files.some((f) => f.startsWith('backend/'))) {
    cmds.push({ cwd: 'backend', command: 'npm run build && npm run test:run' });
  }
  if (files.some((f) => f.startsWith('frontend/'))) {
    cmds.push({ cwd: 'frontend', command: 'npm run build && npm run test:run' });
  }
  if (files.some((f) => f.startsWith('payment-service/'))) {
    cmds.push({ cwd: 'payment-service', command: 'mvn -B clean package' });
  }
  cmds.push({ cwd: 'scripts/agents', command: 'npm test' });
  return {
    commands: cmds,
    testingAgentRequired: activatedIds.includes('testing'),
    qualityGateRequired: true,
  };
}

/**
 * Format plan as human-readable markdown.
 */
export function formatPlanText(plan) {
  const lines = [];
  lines.push(`# Orchestration Plan (planner ${plan.plannerVersion})`);
  lines.push('');
  lines.push(`**Risk:** ${plan.riskClassification.level}`);
  lines.push(`**Pattern:** ${plan.orchestrationPattern}`);
  lines.push(`**Files:** ${plan.changedFiles.length}`);
  lines.push('');
  lines.push('## Activated agents');
  for (const a of plan.activatedAgents) {
    lines.push(`- ${a.displayId} ${a.name} (\`${a.id}\`) — ${a.reasons.join('; ')}`);
  }
  lines.push('');
  lines.push('## Execution order');
  lines.push(plan.executionOrder.join(' → '));
  lines.push('');
  if (plan.parallelGroups.length) {
    lines.push('## Parallel-safe groups');
    for (const g of plan.parallelGroups) lines.push(`- ${g.join(', ')}`);
    lines.push('');
  }
  lines.push('## Split recommendation');
  lines.push(
    plan.splitRecommendation.recommend
      ? `YES — ${plan.splitRecommendation.reason}`
      : `NO — ${plan.splitRecommendation.reason}`,
  );
  lines.push('');
  lines.push('## Changed files');
  for (const f of plan.changedFiles) lines.push(`- \`${f}\``);
  return lines.join('\n');
}

/**
 * Format PR comment body with stable marker.
 */
export function formatActivationComment(plan) {
  const marker = '<!-- smart-parking-agent-activation -->';
  const agents = plan.activatedAgents
    .map((a) => `${a.displayId} ${a.name}`)
    .join('\n');
  const reasons = plan.activatedAgents
    .map((a) => `- **${a.displayId} ${a.name}**: ${a.reasons.join('; ')}`)
    .join('\n');
  return [
    marker,
    '## Agent Activation Summary',
    '',
    `**Planner version:** \`${plan.plannerVersion}\``,
    `**Orchestration pattern:** \`${plan.orchestrationPattern}\``,
    `**Risk level:** \`${plan.riskClassification.level}\``,
    `**Split recommended:** ${plan.splitRecommendation.recommend ? 'YES' : 'NO'}${
      plan.splitRecommendation.recommend ? ` — ${plan.splitRecommendation.reason}` : ''
    }`,
    '',
    '### Activated agents',
    '```',
    agents,
    '```',
    '',
    '### Reasons',
    reasons,
    '',
    '### Dependency order',
    '```',
    plan.executionOrder.join(' → '),
    '```',
    '',
    '### Parallel-safe groups',
    plan.parallelGroups.length
      ? plan.parallelGroups.map((g) => `- ${g.join(', ')}`).join('\n')
      : '_None (fully sequential)_',
    '',
    '### Sequential anchors',
    plan.sequentialGroups.length
      ? plan.sequentialGroups.map((g) => `- ${g.join(', ')}`).join('\n')
      : '_n/a_',
    '',
    '> Generated by canonical planner (`scripts/agents/plan-run.mjs`). Source of truth: `.grok/orchestration/manifest.yaml`.',
  ].join('\n');
}

/**
 * Precision/recall for routing evaluation.
 */
export function scoreRouting(expectedAgents, actualAgents) {
  const exp = new Set(expectedAgents);
  const act = new Set(actualAgents);
  let tp = 0;
  for (const a of act) if (exp.has(a)) tp += 1;
  const fp = [...act].filter((a) => !exp.has(a)).length;
  const fn = [...exp].filter((a) => !act.has(a)).length;
  const precision = act.size === 0 ? (exp.size === 0 ? 1 : 0) : tp / act.size;
  const recall = exp.size === 0 ? (act.size === 0 ? 1 : 0) : tp / exp.size;
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { precision, recall, f1, tp, fp, fn };
}
