import { normalizeResult } from './provider.mjs';

/**
 * Grok / xAI adapter stub — blocks without credentials.
 */
export default {
  name: 'grok',
  async invoke(inv) {
    if (!process.env.XAI_API_KEY) {
      return normalizeResult(
        {
          status: 'blocked',
          error: 'Grok provider blocked: missing XAI_API_KEY',
          dryRun: true,
        },
        'grok',
      );
    }
    return normalizeResult(
      {
        status: 'blocked',
        error:
          'Grok provider credentials present but live invocation is not enabled in this repository control plane',
        dryRun: true,
      },
      'grok',
    );
  },
};
