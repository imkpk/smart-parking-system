import { normalizeResult } from './provider.mjs';

/**
 * Codex adapter stub — blocks cleanly without credentials.
 * Does not claim execution without a real integration.
 */
export default {
  name: 'codex',
  async invoke(inv) {
    if (!process.env.CODEX_API_KEY && !process.env.OPENAI_API_KEY) {
      return normalizeResult(
        {
          status: 'blocked',
          error: 'Codex provider blocked: missing CODEX_API_KEY / OPENAI_API_KEY',
          dryRun: true,
        },
        'codex',
      );
    }
    return normalizeResult(
      {
        status: 'blocked',
        error:
          'Codex provider credentials present but live invocation is not enabled in this repository control plane',
        dryRun: true,
      },
      'codex',
    );
  },
};
