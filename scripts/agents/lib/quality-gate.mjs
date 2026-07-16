/**
 * Rules for emitting real Quality approval events.
 *
 * Simulated / dry-run / mock-default results must NEVER produce quality.approved.
 */

const REAL_SUCCESS = new Set(['succeeded']);
const APPROVE_VERDICTS = new Set(['APPROVE', 'APPROVE_WITH_NOTES']);

/**
 * @param {object} args
 * @param {object} args.task - task record
 * @param {object} args.result - normalized provider result
 * @param {object} args.run - run record
 * @returns {{ approve: boolean, block: boolean, reason?: string, verdict?: string|null }}
 */
export function evaluateQualityResult({ task, result, run }) {
  if (!task || task.agent !== 'quality') {
    return { approve: false, block: false, reason: 'not a quality task' };
  }

  if (run?.dryRun) {
    return { approve: false, block: false, reason: 'dry-run cannot produce quality approval' };
  }

  if (result?.dryRun) {
    return { approve: false, block: false, reason: 'provider dryRun cannot produce quality approval' };
  }

  if (result?.status === 'simulated') {
    return { approve: false, block: false, reason: 'simulated result cannot produce quality approval' };
  }

  if (result?.status === 'blocked' || result?.status === 'failed') {
    return {
      approve: false,
      block: result?.qualityVerdict === 'BLOCK' || result?.status === 'failed',
      reason: result?.error || result?.status,
      verdict: result?.qualityVerdict || (result?.status === 'failed' ? 'BLOCK' : null),
    };
  }

  if (!REAL_SUCCESS.has(result?.status)) {
    return { approve: false, block: false, reason: `status ${result?.status} is not real success` };
  }

  // Simulated providers by name default — only allow when explicitly marked realExecution
  if (isSimulatedProvider(result) && !result.realExecution) {
    return {
      approve: false,
      block: false,
      reason: 'provider is simulated unless realExecution=true with full evidence',
    };
  }

  const verdict = result.qualityVerdict || null;
  if (!verdict) {
    return { approve: false, block: false, reason: 'missing qualityVerdict' };
  }
  if (verdict === 'BLOCK') {
    return { approve: false, block: true, reason: 'quality BLOCK', verdict };
  }
  if (!APPROVE_VERDICTS.has(verdict)) {
    return { approve: false, block: false, reason: `unsupported verdict ${verdict}`, verdict };
  }

  const evidence = result.evidence || result.artifacts?.evidence || [];
  if (!Array.isArray(evidence) || evidence.length === 0) {
    return { approve: false, block: false, reason: 'missing evidence for quality approval', verdict };
  }

  return { approve: true, block: false, verdict, reason: 'approved' };
}

function isSimulatedProvider(result) {
  const p = result?.provider;
  return p === 'mock' || p === 'local-prompt' || result?.status === 'simulated';
}

/**
 * Apply provider result to task terminal status.
 * @returns {'SUCCEEDED'|'SIMULATED'|'FAILED'|'BLOCKED'}
 */
export function terminalStatusForResult(result, { dryRun = false } = {}) {
  if (!result) return 'FAILED';
  if (result.status === 'blocked') return 'BLOCKED';
  if (result.status === 'failed') return 'FAILED';
  if (result.status === 'simulated' || dryRun || result.dryRun) return 'SIMULATED';
  if (result.status === 'succeeded' && result.realExecution) return 'SUCCEEDED';
  // succeeded without realExecution (default mock) → simulated
  if (result.status === 'succeeded' && !result.realExecution) {
    // mock may opt into realExecution for tests only
    if (result.provider === 'mock' || result.provider === 'local-prompt') return 'SIMULATED';
    return 'SUCCEEDED';
  }
  return 'SIMULATED';
}
