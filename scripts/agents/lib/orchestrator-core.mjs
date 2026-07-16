/**
 * Shared orchestration execution logic (testable).
 */
import fs from 'node:fs';
import path from 'node:path';
import { getAgent } from './manifest.mjs';
import {
  updateTaskState,
  listTasks,
  readTask,
  readRun,
  writeRun,
  renderStatusMarkdown,
} from './run-store.mjs';
import { appendEvent, readEvents } from './events.mjs';
import { validateTaskInvocation } from './task-invocation.mjs';
import { evaluateQualityResult, terminalStatusForResult } from './quality-gate.mjs';

/**
 * Execute a single READY task: permissions → provider → state.
 * @returns {{ invoked: boolean, result?: object, task: object }}
 */
export async function executeTask({
  runId,
  runDir,
  taskId,
  manifest,
  provider,
  relevantFiles = [],
  dryRun = true,
}) {
  let task = readTask(runDir, taskId);
  const run = readRun(runDir);
  const agent = getAgent(manifest, task.agent);

  // Prefer task-scoped files; run-level files are candidates only for write-scope filtering
  const candidateFiles =
    task.changedFilesInScope?.length > 0
      ? task.changedFilesInScope
      : relevantFiles.length > 0
        ? relevantFiles
        : run?.changedFiles || [];

  // Permission gate — never invoke provider on denial
  const validation = validateTaskInvocation({
    manifest,
    task,
    agent,
    relevantFiles: candidateFiles,
    validateCommands: true,
  });

  if (!validation.ok) {
    if (task.status === 'READY') {
      // need RUNNING first? BLOCKED can come from READY
      // state machine: READY → BLOCKED is allowed
    } else if (task.status === 'RUNNING') {
      // already running
    }
    if (task.status === 'READY' || task.status === 'RUNNING') {
      // if READY, go BLOCKED; if somehow RUNNING, BLOCKED
      if (task.status === 'READY') {
        task = updateTaskState(runId, taskId, 'BLOCKED', {
          error: formatDenials(validation.errors),
          denials: validation.errors,
          evidence: [`permission-denied:${validation.errors.length}`],
        });
      } else {
        task = updateTaskState(runId, taskId, 'BLOCKED', {
          error: formatDenials(validation.errors),
          denials: validation.errors,
          evidence: [`permission-denied:${validation.errors.length}`],
        });
      }
    }
    return { invoked: false, task, denials: validation.errors };
  }

  if (task.status === 'READY') {
    task = updateTaskState(runId, taskId, 'RUNNING');
  }

  const inv = {
    taskGoal: `${task.type} task for ${task.agent}`,
    allowedPaths: task.allowedPaths || [],
    deniedPaths: task.deniedPaths || [],
    acceptanceCriteria: task.acceptanceCriteria || agent?.qualityRequirements?.evidence || [],
    verificationCommands: [
      ...(task.verificationCommands || []),
      ...(agent?.qualityRequirements?.verification || []),
    ],
    relevantFiles: validation.files.length ? validation.files : candidateFiles,
    skills: agent?.skills || [],
    referenceMemory: [],
    runId,
    taskId: task.id,
    agent: task.agent,
    outputSchema: { summary: 'string', evidence: ['string'] },
  };

  const result = await provider.invoke(inv);
  const logDir = path.join(runDir, 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  if (result.prompt) {
    fs.writeFileSync(path.join(logDir, `${task.id}.prompt.md`), result.prompt, 'utf8');
  }
  fs.writeFileSync(path.join(logDir, `${task.id}.result.json`), JSON.stringify(result, null, 2), 'utf8');

  appendEvent(runDir, {
    type: 'provider.invoked',
    runId,
    taskId: task.id,
    agent: task.agent,
    payload: { provider: result.provider, status: result.status, dryRun: result.dryRun },
  });

  const terminal = terminalStatusForResult(result, { dryRun: dryRun || run?.dryRun });
  const evidence = [
    `provider:${result.provider}:${result.status}`,
    ...(result.evidence || []),
  ];

  if (terminal === 'BLOCKED') {
    task = updateTaskState(runId, taskId, 'BLOCKED', {
      error: result.error,
      evidence,
      provider: result.provider,
    });
  } else if (terminal === 'FAILED') {
    task = updateTaskState(runId, taskId, 'FAILED', {
      error: result.error,
      evidence,
      provider: result.provider,
    });
  } else if (terminal === 'SIMULATED') {
    task = updateTaskState(runId, taskId, 'SIMULATED', {
      evidence: [...evidence, 'simulation-only'],
      provider: result.provider,
      prompt: result.prompt,
    });
  } else {
    task = updateTaskState(runId, taskId, 'SUCCEEDED', {
      evidence,
      provider: result.provider,
      qualityVerdict: result.qualityVerdict,
    });
  }

  // Quality events — only real approval
  if (task.agent === 'quality') {
    applyQualityEvents({ runId, runDir, task, result, run: readRun(runDir) });
  }

  renderStatusMarkdown(runDir);
  return { invoked: true, result, task };
}

function formatDenials(errors) {
  return errors.map((e) => `${e.type}:${e.value}:${e.reason}`).join('; ');
}

export function applyQualityEvents({ runId, runDir, task, result, run }) {
  const evalResult = evaluateQualityResult({ task, result, run });
  if (evalResult.approve) {
    appendEvent(runDir, {
      type: 'quality.approved',
      runId,
      taskId: task.id,
      agent: 'quality',
      payload: { verdict: evalResult.verdict, evidence: result.evidence },
    });
    const r = readRun(runDir);
    r.qualityVerdict = evalResult.verdict;
    writeRun(runDir, r);
  } else if (evalResult.block || result?.qualityVerdict === 'BLOCK') {
    appendEvent(runDir, {
      type: 'quality.blocked',
      runId,
      taskId: task.id,
      agent: 'quality',
      payload: { reason: evalResult.reason, verdict: evalResult.verdict || 'BLOCK' },
    });
  }
  // simulated quality: no quality.approved
}

/**
 * Drain READY tasks until none remain (dependency-aware).
 */
export async function runReadyLoop({
  runId,
  runDir,
  manifest,
  provider,
  dryRun = true,
  maxPasses = 50,
}) {
  const results = [];
  let guard = 0;
  while (guard++ < maxPasses) {
    const ready = listTasks(runDir).filter((t) => t.status === 'READY');
    if (!ready.length) break;
    for (const t of ready) {
      const run = readRun(runDir);
      const r = await executeTask({
        runId,
        runDir,
        taskId: t.id,
        manifest,
        provider,
        relevantFiles: run?.changedFiles || [],
        dryRun,
      });
      results.push(r);
    }
  }
  return results;
}

export function countEvents(runDir, type) {
  return readEvents(runDir).filter((e) => e.type === type).length;
}
