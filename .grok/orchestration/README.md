# Orchestration control plane

**Canonical agent registry:** [`manifest.yaml`](./manifest.yaml)

This directory is the **control plane** for Smart Parking multi-agent work. Runtime state lives under `.grok/agent-runs/` (execution plane).

## Layout

| Path | Role |
|------|------|
| `manifest.yaml` | Single source of truth for agents ①–⑫ |
| `schemas/` | JSON Schema for manifest, run, task, event, memory, skill, schedule |
| `evals/routing-cases.yaml` | Routing precision/recall fixtures |
| `permissions.yaml` | Global dangerous-action policy |
| `tool-profiles.yaml` | Tool capability profiles referenced by agents |
| `memory-policy.yaml` | Memory governance |
| `skills.yaml` | Governed reusable skills |
| `schedules.yaml` | Safe schedule registry (must map to GitHub Actions) |

## Commands

```bash
cd scripts/agents && npm ci
npm run validate          # manifest
npm test                  # full suite
npm run plan:json         # plan origin/develop...HEAD
npm run dry-run           # dry-run orchestrator
node validate-skills.mjs
node validate-schedules.mjs
```

## Design rules

1. **One source of truth** — do not duplicate path→agent tables in shell workflows.
2. **Deterministic before probabilistic** — routing never calls an LLM.
3. **Control plane vs execution plane** — config here; run state in agent-runs.
4. **Provider-neutral** — adapters under `scripts/agents/providers/`.

Human-readable guide: [`docs/agents/ORCHESTRATION.md`](../../docs/agents/ORCHESTRATION.md)
