import { normalizeResult } from './provider.mjs';

export default {
  name: 'mock',
  async invoke(inv) {
    if (inv.taskGoal && /FORCE_FAIL/i.test(inv.taskGoal)) {
      return normalizeResult(
        {
          status: 'failed',
          error: 'mock forced failure',
          dryRun: true,
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
        },
        'mock',
      );
    }
    return normalizeResult(
      {
        status: 'succeeded',
        summary: `mock completed ${inv.agent}/${inv.taskId}`,
        artifacts: { mock: true },
        dryRun: true,
      },
      'mock',
    );
  },
};
