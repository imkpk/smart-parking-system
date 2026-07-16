import { normalizeResult } from './provider.mjs';

/**
 * Claude adapter stub — vendor-neutral domain model; blocks without credentials.
 * Claude-specific managed-agent limits do NOT apply to this repository runtime.
 */
export default {
  name: 'claude',
  async invoke(inv) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return normalizeResult(
        {
          status: 'blocked',
          error: 'Claude provider blocked: missing ANTHROPIC_API_KEY',
          dryRun: true,
        },
        'claude',
      );
    }
    return normalizeResult(
      {
        status: 'blocked',
        error:
          'Claude provider credentials present but live invocation is not enabled in this repository control plane',
        dryRun: true,
      },
      'claude',
    );
  },
};
