# Dynamic Agent Scaling — Report

**Date:** 2026-06-26  
**Branch:** `docs/dynamic-agent-scaling`  
**Status:** merged (pending PR)  
**Role:** ① Orchestrator (docs + CI infrastructure)

## Summary

Replaced the fixed 5-role mental model with a **dynamic agent registry** (①–⑫). Role ① now runs `git diff origin/develop --name-only` at Phase 0, maps paths to specialist agents, and documents the result in every `plan.md`. Role ⑤ always gates last; Role ⑨ owns all test authoring after writers finish.

## Before

- Exactly five roles assumed for every PR (①②③④⑤)
- Writers often wrote their own tests inline
- No formal activation table or path-to-agent mapping
- Large PRs had no documented split strategy

## After

| Layer | Change |
|-------|--------|
| Core | ① Orchestrator + ⑤ Quality — always active |
| Specialists | ②–④⑥–⑫ activated on demand from diff |
| Testing | ⑨ writes specs **after** writers; writers never touch tests |
| Gate | QUALITY_REVIEW §13 — agent coverage check |
| CI visibility | `agent-activation-summary.yml` posts activated agents on develop PRs |

## Activation algorithm

```text
git fetch origin develop
git diff origin/develop --name-only
  → map paths to registry (ROLES.md §2)
  → fill plan.md activation table
  → set parallel vs sequential order
  → execute → ⑨ → ⑤ → CI → merge
```

## Parallel execution model

1. **⑥** Database and **⑧** Security run before dependent writers when triggered.
2. **②③④⑦⑩⑫** run in parallel when folders do not overlap.
3. **⑨** Testing runs after all implementation.
4. **⑤** Quality runs last — always.

## CI comment workflow

`.github/workflows/agent-activation-summary.yml` runs on every PR to `develop`, diffs against `origin/develop`, and posts a comment listing activated specialist agents. Use it to verify ①'s activation table matches the PR diff.

## Files changed

| File | Purpose |
|------|---------|
| `docs/agents/ROLES.md` | Full registry, execution diagram, agent cards ⑥–⑫ |
| `docs/agents/QUALITY_REVIEW.md` | §13 agent coverage |
| `.grok/agent-runs/TEMPLATE/plan.md` | Activation table format |
| `.grok/agent-runs/TEMPLATE/tasks/quality-release.md` | §13 checklist |
| `.grok/prompts/TEMPLATE.md` | Agent activation section |
| `.github/workflows/agent-activation-summary.yml` | PR comment automation |
| `MASTER_PROMPT.md` | v1.16.0, Phase 0.5 step |
| `Agents.md` | Pointer to dynamic registry |

**Not touched:** `backend/src/`, `frontend/src/`, `payment-service/src/`

## Role ⑤ verdict

**APPROVE** — docs-only; all acceptance criteria met.

## Manual verification

1. Open a develop PR that touches `backend/src/` → comment lists ② (and ⑥ if Prisma).
2. Open a docs-only PR → comment lists ⑩; no writer agents.
3. Start a new agent run → `plan.md` activation table filled at Phase 0.
4. Role ⑤ runs §13 against activation table vs diff.

## Follow-ups

- Refine ⑪ Performance Agent auto-suggest heuristics (still manual-only).
- Update `agent-activation-summary` to upsert one comment instead of posting on every push (optional).
- Add ⑨ starter prompts to `ROLES.md` §3 (mirror ②③④).