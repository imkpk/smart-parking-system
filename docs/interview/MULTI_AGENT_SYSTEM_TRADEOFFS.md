# Tradeoffs — Multi-Agent Orchestration

| Dimension | Option A | Option B | Our choice | Why |
|-----------|----------|----------|------------|-----|
| Agent count | Single generalist | Multi-agent specialists | Multi-agent | Monorepo service boundaries |
| Orchestration | Central planner | Fully decentralized | Central deterministic planner | Auditability |
| Routing | Deterministic rules | LLM classification | Deterministic | Precision, cost, tests |
| Isolation | Shared checkout | Git worktrees | Worktrees available | Parallel writes |
| State | Markdown only | Structured JSON + generated MD | Structured + MD view | Machine + human |
| Scheduler | Separate service | GitHub Actions | GHA + validated YAML | No drift host |
| Memory | Shared writable | Promoted tiers | Governed promotion | Anti-poisoning |
| Providers | One vendor SDK | Neutral adapters | Neutral + stubs | Portability |
| Delivery | One mega-PR | Many micro-PRs | One cohesive platform PR (phases mapped) | Coupled control plane tests |
| Events | DB/OTEL required | JSONL in repo | JSONL | Zero infra |
| Skills | All prompts are skills | Few evaluated skills | Few skills | Governance cost |
| Testing ownership | Writers never test | Writers unit + Testing audits | Hybrid | Speed + independence |

## Rejected alternatives (detail)

1. **LLM path router** — fails closed tests, nondeterministic PR comments.  
2. **Auto-promote web scrapes to memory** — poisoning risk.  
3. **Quality implements fixes silently** — breaks separation of duties.  
4. **Unbounded retries** — infinite loops / cost.  
5. **Force-push cleanup of agent branches** — history & safety risk.  
6. **Embedding Claude managed-agent quotas as our limits** — wrong abstraction boundary.
