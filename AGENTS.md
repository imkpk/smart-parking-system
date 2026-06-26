# Agent Instructions

**Any AI tool (Codex, Claude, Cursor, Grok, Copilot, …):** paste [`.grok/prompts/ai-tool-bootstrap.md`](./.grok/prompts/ai-tool-bootstrap.md) at session start — see [`docs/agents/AI-TOOL-BOOTSTRAP.md`](./docs/agents/AI-TOOL-BOOTSTRAP.md).

**Read [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) first — it is the centralized prompt for this project.**

That file overrides generic tool suggestions and contains:

- Mission and non-negotiable rules
- What is done, in progress, and next up
- Architecture, business flow, roles
- Shared components and anti-patterns
- Verification checklist and changelog update protocol

Detailed coding standards: [`.grok/AGENTS.md`](./.grok/AGENTS.md)  
Multi-agent roles: [`docs/agents/ROLES.md`](./docs/agents/ROLES.md) — dynamic registry ①–⑫; ① activates specialists from `git diff`; ⑨ writes tests; ⑤ always last  
Quality gate (Role ⑤): [`docs/agents/QUALITY_REVIEW.md`](./docs/agents/QUALITY_REVIEW.md) — §1–13 including agent coverage
Project plan: [`docs/project-plan/`](./docs/project-plan/)  
Branch strategy: [`docs/project-plan/09-branch-strategy.md`](./docs/project-plan/09-branch-strategy.md)