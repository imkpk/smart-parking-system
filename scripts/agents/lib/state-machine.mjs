/**
 * Task and run state machines.
 */
export const TASK_STATES = [
  'CREATED',
  'PLANNED',
  'READY',
  'RUNNING',
  'VERIFYING',
  'SUCCEEDED',
  'SIMULATED',
  'FAILED',
  'BLOCKED',
  'ESCALATED',
  'CANCELLED',
];

/** Valid transitions: from -> set of to */
export const TASK_TRANSITIONS = {
  CREATED: new Set(['PLANNED', 'CANCELLED']),
  PLANNED: new Set(['READY', 'CANCELLED', 'BLOCKED']),
  READY: new Set(['RUNNING', 'CANCELLED', 'BLOCKED']),
  RUNNING: new Set([
    'VERIFYING',
    'SUCCEEDED',
    'SIMULATED',
    'FAILED',
    'BLOCKED',
    'ESCALATED',
    'CANCELLED',
  ]),
  VERIFYING: new Set(['SUCCEEDED', 'SIMULATED', 'FAILED', 'BLOCKED', 'ESCALATED']),
  SUCCEEDED: new Set([]),
  SIMULATED: new Set([]),
  FAILED: new Set(['READY', 'ESCALATED', 'CANCELLED']),
  BLOCKED: new Set(['READY', 'ESCALATED', 'CANCELLED']),
  ESCALATED: new Set(['READY', 'CANCELLED', 'FAILED']),
  CANCELLED: new Set([]),
};

/** Terminal states that are not production completion */
export const SIMULATED_TERMINAL = new Set(['SIMULATED']);

export const TERMINAL_TASK_STATES = new Set(['SUCCEEDED', 'SIMULATED', 'CANCELLED']);

/** Dependencies: real completion only, unless simulated graph mode */
export function dependencySatisfied(status, { simulatedGraph = false } = {}) {
  if (status === 'SUCCEEDED') return true;
  if (simulatedGraph && status === 'SIMULATED') return true;
  return false;
}

export function canTransition(from, to) {
  const allowed = TASK_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.has(to);
}

/**
 * @returns {{ ok: boolean, error?: string }}
 */
export function assertTransition(from, to, context = {}) {
  if (from === to) return { ok: true };
  if (!TASK_STATES.includes(to)) {
    return { ok: false, error: `unknown target state: ${to}` };
  }
  if (!canTransition(from, to)) {
    return {
      ok: false,
      error: `invalid transition ${from} -> ${to}${context.taskId ? ` (task ${context.taskId})` : ''}`,
    };
  }
  if (from === 'FAILED' && to === 'READY') {
    const attempt = context.attempt ?? 0;
    const max = context.maximumAttempts ?? 1;
    if (attempt >= max) {
      return {
        ok: false,
        error: `retry forbidden: attempt ${attempt} >= maximumAttempts ${max}`,
      };
    }
  }
  return { ok: true };
}

export function isTerminal(status) {
  return TERMINAL_TASK_STATES.has(status);
}

export function isProductionSuccess(status) {
  return status === 'SUCCEEDED';
}
