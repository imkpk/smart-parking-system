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
  RUNNING: new Set(['VERIFYING', 'SUCCEEDED', 'FAILED', 'BLOCKED', 'ESCALATED', 'CANCELLED']),
  VERIFYING: new Set(['SUCCEEDED', 'FAILED', 'BLOCKED', 'ESCALATED']),
  SUCCEEDED: new Set([]),
  FAILED: new Set(['READY', 'ESCALATED', 'CANCELLED']), // retry -> READY
  BLOCKED: new Set(['READY', 'ESCALATED', 'CANCELLED']),
  ESCALATED: new Set(['READY', 'CANCELLED', 'FAILED']),
  CANCELLED: new Set([]),
};

export const TERMINAL_TASK_STATES = new Set(['SUCCEEDED', 'CANCELLED']);

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
  // Retry path: FAILED -> READY must respect maximumAttempts
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
