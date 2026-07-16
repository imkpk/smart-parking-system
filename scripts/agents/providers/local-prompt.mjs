import { normalizeResult } from './provider.mjs';

/**
 * Produces a human-readable prompt without invoking any external model.
 */
export default {
  name: 'local-prompt',
  async invoke(inv) {
    const prompt = [
      `# Agent task prompt`,
      ``,
      `Run: ${inv.runId}`,
      `Task: ${inv.taskId}`,
      `Agent: ${inv.agent}`,
      ``,
      `## Goal`,
      inv.taskGoal || '(none)',
      ``,
      `## Allowed paths`,
      ...(inv.allowedPaths || []).map((p) => `- ${p}`),
      ``,
      `## Denied paths`,
      ...(inv.deniedPaths || []).map((p) => `- ${p}`),
      ``,
      `## Acceptance criteria`,
      ...(inv.acceptanceCriteria || []).map((c) => `- ${c}`),
      ``,
      `## Verification`,
      ...(inv.verificationCommands || []).map((c) => `- \`${c}\``),
      ``,
      `## Relevant files`,
      ...(inv.relevantFiles || []).map((f) => `- ${f}`),
      ``,
      `## Skills`,
      ...(inv.skills || []).map((s) => `- ${s}`),
      ``,
      `## Reference memory (read-only)`,
      ...(inv.referenceMemory || []).map((m) => `- ${m}`),
      ``,
      `## Output schema`,
      '```json',
      JSON.stringify(inv.outputSchema || { summary: 'string', evidence: ['string'] }, null, 2),
      '```',
      ``,
      `> Provider: local-prompt — no external model was invoked.`,
    ].join('\n');

    return normalizeResult(
      {
        status: 'simulated',
        summary: 'local-prompt generated (no external invocation)',
        prompt,
        dryRun: true,
        realExecution: false,
        artifacts: { promptPathHint: `logs/${inv.taskId}.prompt.md` },
      },
      'local-prompt',
    );
  },
};
