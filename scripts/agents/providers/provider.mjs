/**
 * Provider-neutral interface for agent execution.
 *
 * Implementations must not leak vendor-specific limits into the domain model.
 */

/**
 * @typedef {object} ProviderInvocation
 * @property {string} taskGoal
 * @property {string[]} allowedPaths
 * @property {string[]} deniedPaths
 * @property {string[]} acceptanceCriteria
 * @property {string[]} verificationCommands
 * @property {string[]} relevantFiles
 * @property {string[]} skills
 * @property {string[]} referenceMemory
 * @property {string} runId
 * @property {string} taskId
 * @property {string} agent
 * @property {object} [outputSchema]
 */

/**
 * @typedef {object} ProviderResult
 * @property {'succeeded'|'failed'|'blocked'|'simulated'} status
 * @property {string} [summary]
 * @property {string} [prompt] - for local-prompt adapter
 * @property {object} [artifacts]
 * @property {string} [error]
 * @property {boolean} dryRun
 * @property {string} provider
 */

/**
 * @param {string} name
 * @returns {Promise<{ name: string, invoke: (inv: ProviderInvocation) => Promise<ProviderResult> }>}
 */
export async function getProvider(name = 'mock') {
  switch (name) {
    case 'mock':
      return (await import('./mock.mjs')).default;
    case 'local-prompt':
      return (await import('./local-prompt.mjs')).default;
    case 'codex':
      return (await import('./codex.mjs')).default;
    case 'claude':
      return (await import('./claude.mjs')).default;
    case 'grok':
      return (await import('./grok.mjs')).default;
    default:
      throw new Error(`Unknown provider: ${name}`);
  }
}

export function normalizeResult(partial, provider) {
  return {
    status: partial.status || 'failed',
    summary: partial.summary || '',
    prompt: partial.prompt,
    artifacts: partial.artifacts || {},
    error: partial.error || null,
    dryRun: partial.dryRun !== false,
    realExecution: partial.realExecution === true,
    qualityVerdict: partial.qualityVerdict ?? null,
    evidence: partial.evidence || partial.artifacts?.evidence || [],
    provider,
  };
}
