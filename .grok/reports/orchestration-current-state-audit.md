# Phase 0 — Orchestration current-state audit

**Date:** 2026-07-16  
**Branch base:** `develop` @ `fdb6d34`  
**Auditor:** Orchestrator (①) — multi-agent orchestration platform program

## Existing capabilities

| Capability | Location | Machine-enforceable? |
|------------|----------|----------------------|
| Dynamic roles ①–⑫ | `docs/agents/ROLES.md` | No (human/doc) |
| Path activation guidance | ROLES.md §2 | No (duplicated in CI shell) |
| Quality gate checklist | `docs/agents/QUALITY_REVIEW.md` | No |
| Agent-run Markdown templates | `.grok/agent-runs/TEMPLATE/` | Partial |
| Historical agent runs | `.grok/agent-runs/20*` | Markdown only |
| PR activation summary | `.github/workflows/agent-activation-summary.yml` | Yes (shell grep) |
| Post-merge index sync | `scripts/agent-run-post-merge.mjs` | Yes |
| Prompt library | `.grok/prompts/` | No |
| Reports archive | `.grok/reports/` | No |

## Current source of truth

- **Documented:** `MASTER_PROMPT.md` + `docs/agents/ROLES.md` (human process)
- **Automated activation:** inline `grep` rules in `agent-activation-summary.yml` (diverges from docs)
- **No** `.grok/orchestration/` control plane existed before this program

## Duplicated rules

1. Path→agent mapping in ROLES.md §2 **and** workflow shell greps
2. “Quality always last” / “Testing after writers” repeated in bootstrap, ROLES, templates
3. CI path filters in `ci.yml` overlap conceptually with agent activation (different purpose — keep both, but agent activation must not re-encode product ownership)

## Missing runtime behavior (pre-platform)

- Canonical machine-readable manifest
- Schema validation
- Deterministic planner CLI
- Typed run/task state machine
- Append-only event ledger
- Dry-run orchestrator / resume
- Worktree isolation helpers
- Permissions / tool profiles enforcement
- Provider adapters
- Memory & skills governance
- Safe schedules tied to workflows
- Routing evaluation suite

## Migration risks

| Risk | Mitigation |
|------|------------|
| Break historical Markdown runs | Keep Markdown-only runs readable; never rewrite |
| CI comment spam | Upsert single comment via marker |
| Dependency weight | Only `yaml` under `scripts/agents` |
| Accidental app refactors | Scope limited to orchestration paths |
| Schedule drift | schedules.yaml must reference real workflows |

## Compatibility constraints

- Preserve role numbers ①–⑫ and display semantics
- Target branch `develop`; merge-commit only
- Keep post-merge reconciliation script behavior
- Do not change backend/frontend/payment product code

## Proposed PR sequence (adapted)

Originally planned as PR A–E. Implementation delivered as **one cohesive PR** because:

- Planner, schemas, run ledger, and CI share one package (`scripts/agents`)
- Routing tests require full manifest + fixtures + state machine
- Stacked unmerged PRs would leave CI red on dependents until human merges

Phase mapping inside the PR:

| Phase | Deliverable |
|-------|-------------|
| 0 | This audit |
| 1–5 | Manifest, schemas, planner, evals, CI activation |
| 6–8 | Run ledger, events, dry-run orchestrator |
| 9–11 | Worktrees, permissions, providers |
| 12–14 | Testing policy docs, memory, skills |
| 15–20 | Schedules, recovery paths, docs, interview pack |

## Files expected to change

- `.grok/orchestration/**` (new)
- `scripts/agents/**` (new)
- `.github/workflows/agent-activation-summary.yml`
- `.github/workflows/agent-orchestration-*.yml` (new)
- `docs/agents/ORCHESTRATION.md`, ROLES.md (links), interview docs
- `.gitignore` (worktrees, agents node_modules)
- `.grok/memory/**` (structure)
- `.grok/reports/**` (audit + final)

## Explicitly out of scope

- NestJS / React / payment-service product features
- Production deploy / secrets
- Live Claude/Codex/Grok model invocation
- Separate hosted monitoring service
- Auto-merge without human policy
