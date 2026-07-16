import { normalizeResult } from './provider.mjs';

/**
 * Default mock is dry-run / simulated.
 * Set inv.realExecution=true (tests only) to return a real normalized success.
 * Set inv.qualityVerdict + inv.evidence for quality approval tests.
 */
export default {
  name: 'mock',
  async invoke(inv) {
    if (inv.taskGoal && /FORCE_FAIL/i.test(inv.taskGoal)) {
      return normalizeResult(
        {
          status: 'failed',
          error: 'mock forced failure',
          dryRun: true,
          realExecution: false,
        },
        'mock',
      );
    }
    if (inv.taskGoal && /FORCE_BLOCK/i.test(inv.taskGoal)) {
      return normalizeResult(
        {
          status: 'blocked',
          error: 'mock blocked — missing credentials simulation',
          dryRun: true,
          realExecution: false,
          qualityVerdict: inv.qualityVerdict || undefined,
        },
        'mock',
      );
    }

    // Explicit real-execution mode for regression tests of quality approval path
    if (inv.realExecution === true) {
      return normalizeResult(
        {
          status: 'succeeded',
          summary: `mock realExecution ${inv.agent}/${inv.taskId}`,
          dryRun: false,
          realExecution: true,
          qualityVerdict: inv.qualityVerdict,
          evidence: inv.evidence || inv.acceptanceCriteria || [],
          artifacts: { mock: true, realExecution: true },
        },
        'mock',
      );
    }

    // Default: simulated success — orchestrator must map to SIMULATED, not SUCCEEDED
    return normalizeResult(
      {
        status: 'succeeded',
        summary: `mock simulated ${inv.agent}/${inv.taskId}`,
        artifacts: { mock: true },
        dryRun: true,
        realExecution: false,
      },
      'mock',
    );
  },
};
