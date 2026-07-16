/**
 * Typed run ledger under .grok/agent-runs/<run-id>/
 */
import fs from 'node:fs';
import path from 'node:path';
import { AGENT_RUNS_DIR, PLANNER_VERSION } from './paths.mjs';
import { appendEvent, readEvents, summarizeEvents } from './events.mjs';
import { assertTransition, dependencySatisfied } from './state-machine.mjs';
import { validateWithSchemaFile } from './schema-validate.mjs';
import { formatPlanText } from './planner.mjs';

export function runDirFor(runId) {
  return path.join(AGENT_RUNS_DIR, runId);
}

export function generateRunId(prefix = 'run') {
  const d = new Date();
  const date = d.toISOString().slice(0, 10);
  const slug = `${prefix}-${d.toISOString().slice(11, 19).replace(/:/g, '')}`;
  return `${date}-${slug}`;
}

export function ensureRunLayout(runDir) {
  for (const sub of ['tasks', 'evidence', 'artifacts', 'logs', 'memory-proposals']) {
    fs.mkdirSync(path.join(runDir, sub), { recursive: true });
  }
}

/**
 * Create a structured run from a planner plan.
 */
export function createRunFromPlan(plan, options = {}) {
  const runId = options.runId || generateRunId(options.slug || 'orchestration');
  const runDir = runDirFor(runId);
  if (fs.existsSync(path.join(runDir, 'run.json')) && !options.force) {
    throw new Error(`Run already exists: ${runId}`);
  }
  ensureRunLayout(runDir);

  const now = new Date().toISOString();
  const dryRun = options.dryRun !== false;
  const tasks = (plan.tasks || []).map((t) => ({
    id: t.id,
    runId,
    agent: t.agent,
    type: t.type,
    status: 'PLANNED',
    dependencies: t.dependencies || [],
    allowedPaths: t.allowedPaths || [],
    deniedPaths: t.deniedPaths || [],
    attempt: 0,
    maximumAttempts: t.maximumAttempts ?? 2,
    timeout: t.timeout ?? 3600,
    acceptanceCriteria: t.acceptanceCriteria || [],
    verificationCommands: (t.verificationCommands || []).map(String),
    evidence: [],
    startedAt: null,
    completedAt: null,
    error: null,
    escalation: null,
    worktreePath: null,
    branch: null,
    writeMode: t.writeMode,
    changedFilesInScope: t.changedFilesInScope || [],
    simulated: false,
  }));

  for (const t of tasks) {
    if (!t.dependencies.length) t.status = 'READY';
  }

  const run = {
    id: runId,
    status: 'PLANNED',
    createdAt: now,
    updatedAt: now,
    baseBranch: plan.base || 'develop',
    headRef: plan.head || 'HEAD',
    plannerVersion: plan.plannerVersion || PLANNER_VERSION,
    orchestrationPattern: plan.orchestrationPattern,
    riskLevel: plan.riskClassification?.level,
    activatedAgents: (plan.activatedAgents || []).map((a) => a.id || a),
    taskIds: tasks.map((t) => t.id),
    provider: options.provider || 'local-prompt',
    dryRun,
    simulatedGraph: dryRun || options.simulatedGraph === true,
    qualityVerdict: null,
    metrics: {},
    error: null,
    changedFiles: plan.changedFiles || [],
    splitRecommendation: plan.splitRecommendation,
  };

  const runSchema = validateWithSchemaFile(run, 'run.schema.json');
  if (!runSchema.valid) {
    throw new Error(`run.json schema invalid:\n${runSchema.errors.join('\n')}`);
  }

  fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(run, null, 2), 'utf8');
  fs.writeFileSync(path.join(runDir, 'plan.md'), formatPlanText(plan), 'utf8');
  fs.writeFileSync(path.join(runDir, 'plan.json'), JSON.stringify(plan, null, 2), 'utf8');

  for (const t of tasks) {
    const taskSchema = validateWithSchemaFile(t, 'task.schema.json');
    if (!taskSchema.valid) {
      throw new Error(`task ${t.id} schema invalid:\n${taskSchema.errors.join('\n')}`);
    }
    writeTask(runDir, t);
  }

  appendEvent(runDir, {
    type: 'run.created',
    runId,
    payload: { dryRun: run.dryRun, provider: run.provider, simulatedGraph: run.simulatedGraph },
  });
  appendEvent(runDir, {
    type: 'plan.generated',
    runId,
    payload: {
      pattern: plan.orchestrationPattern,
      agents: run.activatedAgents,
      taskCount: tasks.length,
    },
  });
  for (const t of tasks.filter((x) => x.status === 'READY')) {
    appendEvent(runDir, { type: 'task.ready', runId, taskId: t.id, agent: t.agent });
  }

  renderStatusMarkdown(runDir);
  return { run, tasks, runDir };
}

export function writeTask(runDir, task) {
  const file = path.join(runDir, 'tasks', `${task.id}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(task, null, 2), 'utf8');
}

export function readTask(runDir, taskId) {
  const file = path.join(runDir, 'tasks', `${taskId}.json`);
  if (!fs.existsSync(file)) throw new Error(`Task not found: ${taskId}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function listTasks(runDir) {
  const dir = path.join(runDir, 'tasks');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

export function readRun(runDir) {
  const file = path.join(runDir, 'run.json');
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeRun(runDir, run) {
  fs.writeFileSync(path.join(runDir, 'run.json'), JSON.stringify(run, null, 2), 'utf8');
}

export function loadRun(runId) {
  const runDir = runDirFor(runId);
  if (!fs.existsSync(runDir)) throw new Error(`Run directory not found: ${runId}`);
  const run = readRun(runDir);
  const tasks = listTasks(runDir);
  const events = readEvents(runDir);
  const historical = !run;
  return { runId, runDir, run, tasks, events, historical };
}

/**
 * Update task state with transition validation.
 */
export function updateTaskState(runId, taskId, nextStatus, patch = {}) {
  const runDir = runDirFor(runId);
  const task = readTask(runDir, taskId);
  const check = assertTransition(task.status, nextStatus, {
    taskId,
    attempt: task.attempt,
    maximumAttempts: task.maximumAttempts,
  });
  if (!check.ok) throw new Error(check.error);

  const prev = task.status;
  task.status = nextStatus;
  task.updatedAt = new Date().toISOString();

  if (nextStatus === 'RUNNING') {
    task.attempt = (task.attempt || 0) + 1;
    task.startedAt = task.startedAt || new Date().toISOString();
    appendEvent(runDir, {
      type: 'task.started',
      runId,
      taskId,
      agent: task.agent,
      payload: { attempt: task.attempt },
    });
  }
  if (nextStatus === 'SUCCEEDED') {
    task.completedAt = new Date().toISOString();
    task.simulated = false;
    appendEvent(runDir, { type: 'task.completed', runId, taskId, agent: task.agent });
  }
  if (nextStatus === 'SIMULATED') {
    task.completedAt = new Date().toISOString();
    task.simulated = true;
    appendEvent(runDir, {
      type: 'task.simulated',
      runId,
      taskId,
      agent: task.agent,
      payload: { provider: patch.provider, note: 'not production completion' },
    });
    if (patch.prompt) {
      appendEvent(runDir, {
        type: 'prompt.generated',
        runId,
        taskId,
        agent: task.agent,
        payload: { bytes: String(patch.prompt).length },
      });
    }
  }
  if (nextStatus === 'FAILED') {
    task.error = patch.error || task.error || 'failed';
    task.completedAt = new Date().toISOString();
    appendEvent(runDir, {
      type: 'task.failed',
      runId,
      taskId,
      agent: task.agent,
      payload: { error: task.error, attempt: task.attempt },
    });
  }
  if (prev === 'FAILED' && nextStatus === 'READY') {
    appendEvent(runDir, {
      type: 'task.retried',
      runId,
      taskId,
      agent: task.agent,
      payload: { attempt: task.attempt },
    });
  }
  if (nextStatus === 'BLOCKED') {
    task.error = patch.error || patch.reason || task.error;
    appendEvent(runDir, {
      type: 'task.blocked',
      runId,
      taskId,
      agent: task.agent,
      payload: {
        reason: patch.error || patch.reason,
        denials: patch.denials || null,
      },
    });
  }
  if (nextStatus === 'ESCALATED') {
    task.escalation = patch.escalation || { to: 'quality', reason: patch.reason || 'escalated' };
    appendEvent(runDir, {
      type: 'task.escalated',
      runId,
      taskId,
      agent: task.agent,
      payload: task.escalation,
    });
  }
  if (patch.evidence) {
    task.evidence = [...(task.evidence || []), ...patch.evidence];
    appendEvent(runDir, {
      type: 'evidence.recorded',
      runId,
      taskId,
      agent: task.agent,
      payload: { evidence: patch.evidence },
    });
  }
  if (patch.error && nextStatus !== 'FAILED' && nextStatus !== 'BLOCKED') {
    task.error = patch.error;
  }
  if (patch.qualityVerdict) task.qualityVerdict = patch.qualityVerdict;
  if (patch.denials) task.denials = patch.denials;

  const assignable = Object.fromEntries(
    Object.entries(patch).filter(
      ([k]) =>
        !['evidence', 'error', 'reason', 'escalation', 'denials', 'prompt', 'provider'].includes(k) ||
        k === 'worktreePath' ||
        k === 'branch' ||
        k === 'qualityVerdict',
    ),
  );
  Object.assign(task, assignable);

  writeTask(runDir, task);
  promoteReadyTasks(runDir, runId);
  updateRunRollup(runDir, runId);
  renderStatusMarkdown(runDir);
  return task;
}

function promoteReadyTasks(runDir, runId) {
  const run = readRun(runDir);
  const simulatedGraph = Boolean(run?.simulatedGraph || run?.dryRun);
  const tasks = listTasks(runDir);
  const byId = new Map(tasks.map((t) => [t.id, t]));
  for (const t of tasks) {
    if (!['CREATED', 'PLANNED'].includes(t.status)) continue;
    const depsMet = (t.dependencies || []).every((d) =>
      dependencySatisfied(byId.get(d)?.status, { simulatedGraph }),
    );
    if (depsMet) {
      t.status = 'READY';
      writeTask(runDir, t);
      appendEvent(runDir, { type: 'task.ready', runId, taskId: t.id, agent: t.agent });
    }
  }
}

function updateRunRollup(runDir, runId) {
  const run = readRun(runDir);
  if (!run) return;
  const tasks = listTasks(runDir);
  run.updatedAt = new Date().toISOString();

  const allTerminal = tasks.every((t) =>
    ['SUCCEEDED', 'SIMULATED', 'FAILED', 'BLOCKED', 'ESCALATED', 'CANCELLED'].includes(t.status),
  );
  const anySimulated = tasks.some((t) => t.status === 'SIMULATED');
  const anySucceeded = tasks.some((t) => t.status === 'SUCCEEDED');
  const anyFailed = tasks.some((t) => t.status === 'FAILED');
  const anyBlocked = tasks.some((t) => t.status === 'BLOCKED');
  const anyEscalated = tasks.some((t) => t.status === 'ESCALATED');
  const anyRunning = tasks.some((t) => ['RUNNING', 'VERIFYING'].includes(t.status));

  if (anyRunning) run.status = 'RUNNING';
  else if (anyEscalated) run.status = 'ESCALATED';
  else if (anyBlocked) run.status = 'BLOCKED';
  else if (anyFailed) run.status = 'FAILED';
  else if (allTerminal && anySimulated && !anySucceeded) {
    run.status = 'SIMULATED';
    appendEventOnce(runDir, {
      type: 'run.simulated',
      runId,
      payload: { note: 'run completed in simulation only — not production' },
    });
  } else if (allTerminal && anySucceeded && anySimulated) {
    // mixed: still simulated graph if dry-run
    run.status = run.dryRun || run.simulatedGraph ? 'SIMULATED' : 'SUCCEEDED';
  } else if (tasks.every((t) => t.status === 'SUCCEEDED')) {
    run.status = 'SUCCEEDED';
  } else if (allTerminal && anySimulated) {
    run.status = 'SIMULATED';
  }

  // Never promote qualityVerdict from simulated tasks
  const q = tasks.find((t) => t.agent === 'quality');
  if (q?.status === 'SUCCEEDED' && q.qualityVerdict && !q.simulated) {
    run.qualityVerdict = q.qualityVerdict;
  } else if (q?.status === 'SIMULATED') {
    run.qualityVerdict = null;
  }

  writeRun(runDir, run);
}

function appendEventOnce(runDir, event) {
  const events = readEvents(runDir);
  if (events.some((e) => e.type === event.type && e.runId === event.runId)) return;
  appendEvent(runDir, event);
}

export function renderStatusMarkdown(runDir) {
  const run = readRun(runDir);
  const tasks = listTasks(runDir);
  const events = readEvents(runDir);
  const summary = summarizeEvents(events);

  if (!run) return;

  const statusNote =
    run.status === 'SIMULATED' || run.dryRun
      ? ' **(SIMULATED / dry-run — not production completion)**'
      : '';

  const lines = [
    `# Run status — \`${run.id}\``,
    '',
    `> Generated from \`run.json\` + task state. Do not edit by hand.`,
    '',
    `| Field | Value |`,
    `|-------|-------|`,
    `| Status | **${run.status}**${statusNote} |`,
    `| Pattern | ${run.orchestrationPattern} |`,
    `| Risk | ${run.riskLevel} |`,
    `| Dry-run | ${run.dryRun} |`,
    `| Simulated graph | ${run.simulatedGraph ?? run.dryRun} |`,
    `| Provider | ${run.provider} |`,
    `| Planner | ${run.plannerVersion} |`,
    `| Quality | ${run.qualityVerdict ?? '— (none / simulated)'} |`,
    `| Updated | ${run.updatedAt} |`,
    '',
    '## Tasks',
    '',
    '| ID | Agent | Type | Status | Attempt | Deps |',
    '|----|-------|------|--------|---------|------|',
  ];
  for (const t of tasks) {
    const sim = t.status === 'SIMULATED' ? ' 🧪' : '';
    lines.push(
      `| \`${t.id}\` | ${t.agent} | ${t.type} | ${t.status}${sim} | ${t.attempt}/${t.maximumAttempts} | ${(t.dependencies || []).join(', ') || '—'} |`,
    );
  }
  lines.push('', '## Event summary', '');
  lines.push(`Total events: ${summary.eventCount}`);
  for (const [k, v] of Object.entries(summary.counts)) {
    lines.push(`- \`${k}\`: ${v}`);
  }
  if (summary.counts['quality.approved']) {
    lines.push('', '> Real quality.approved events are present.');
  } else {
    lines.push('', '> No real `quality.approved` event (simulated/dry-run cannot approve).');
  }
  lines.push('');
  fs.writeFileSync(path.join(runDir, 'status.md'), lines.join('\n'), 'utf8');
}

export function computeMetrics(runDir) {
  const run = readRun(runDir);
  const tasks = listTasks(runDir);
  const events = readEvents(runDir);
  const summary = summarizeEvents(events);

  const durations = [];
  for (const t of tasks) {
    if (t.startedAt && t.completedAt) {
      durations.push(new Date(t.completedAt) - new Date(t.startedAt));
    }
  }
  const runDuration =
    run?.createdAt && run?.updatedAt ? new Date(run.updatedAt) - new Date(run.createdAt) : null;

  return {
    runDurationMs: runDuration,
    taskDurationMs: durations,
    avgTaskDurationMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    attemptCount: tasks.reduce((s, t) => s + (t.attempt || 0), 0),
    failureCount: summary.taskFailed,
    retryCount: summary.retries,
    simulatedCount: tasks.filter((t) => t.status === 'SIMULATED').length,
    routingDecisions: events.filter((e) => e.type === 'plan.generated').length,
    parallelism: tasks.filter((t) => t.status === 'RUNNING').length,
    qualityVerdict: run?.qualityVerdict ?? null,
    evidenceCompleteness: tasks.length
      ? tasks.filter((t) => (t.evidence || []).length > 0).length / tasks.length
      : 0,
    eventSummary: summary,
  };
}

export function isHistoricalMarkdownOnly(runDir) {
  return !fs.existsSync(path.join(runDir, 'run.json')) && fs.existsSync(path.join(runDir, 'status.md'));
}
