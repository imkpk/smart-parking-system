# CI Fast PR Gates and Agent Flow — Report

**Date:** 2026-06-18  
**Branch:** `ci/fast-pr-gates-and-agent-flow`  
**PR:** `ci: speed up PR gates and update agent flow`

## Problem

Phase 1–2 delivery lost time to serial merge-wait cycles (~5–10 min per PR). Agents and humans idled while Cypress and coverage ran on every pull request, even though full integration validation only needs to run on `develop` after merge.

## Solution

Split CI into **fast PR gates** and **full integration trunk validation on push**.

## PR gate behavior (pull_request)

| Job | When it runs | Commands |
|-----|----------------|----------|
| Detect changes | Always | Path filter (`dorny/paths-filter`) |
| NestJS Backend | `backend/**` or workflow changed | `npm run build`, `npm run test:run` |
| React Frontend | `frontend/**` or workflow changed | `npm run build`, `npm run test:run` |
| Spring Boot Payment | `payment-service/**` or workflow changed | `mvn -B clean package` |
| Cypress E2E Smoke | **Skipped on PR** | — |
| CI Summary | Always | Required jobs must pass; skipped jobs OK |

**Docs-only PRs:** backend/frontend/payment jobs skip when only `.md`, `docs/**`, or `.grok/**` change (unless workflow also changed).

**Target PR duration:** ~3–5 minutes for a single-service change (vs ~8–12 minutes with coverage + Cypress).

## Develop-push full validation (push to develop/main/single-tenant)

| Job | When it runs | Commands |
|-----|----------------|----------|
| NestJS Backend | Path filter or any push (unchanged trigger) | `npm run build`, `npm run test:cov` |
| React Frontend | Path filter or any push | `npm run build`, `npm run coverage` + summary script |
| Spring Boot Payment | Path filter or any push | `mvn -B clean package` |
| Cypress E2E Smoke | Push only, when frontend/backend/workflow changed | Full stack + `npm run e2e:ci` (advisory) |
| CI Summary | Always | Required service jobs pass; E2E advisory |

Full validation still runs after every merge to `develop`. Nothing was deleted — slow checks moved off the PR critical path.

## Backend script added

```json
"test:run": "jest"
```

Existing `test:cov` unchanged. CI PR gate uses `test:run`; push uses `test:cov`.

## Agent delivery flow (updated in `.grok/prompts/`)

```text
1. Sync develop before each new branch.
2. Open PR early after push.
3. Enable auto-merge when branch protection allows (`--merge` only — never `--squash`).
4. Start the next branch while CI runs — do not idle-wait.
5. Fetch latest develop before opening a dependent PR.
6. Never leave stale PRs open across phase boundaries.
7. If auto-merge is blocked, report PR link + reason; continue only when safe.
8. Merge stacked PRs in dependency order (base before dependent).
9. Fix failing PR CI in parallel when possible; max 3 fix attempts per issue.
```

## Recommended Phase 3 PR breakdown (await human approval)

Use **3 stacked PRs** instead of 6 micro-loops to halve merge-wait overhead:

| Order | Branch | Scope | Est. lines |
|-------|--------|-------|------------|
| 3A | `feature/phase-3a-operator-dashboard-api` | Backend metrics API (occupancy, sessions, revenue), DTOs, contract report, tests | ≤400 |
| 3B | `feature/phase-3b-operator-dashboard-ui` | Frontend dashboard pages, charts/cards, role-specific views, Vitest | ≤400 |
| 3C | `test/phase-3-operator-dashboard-acceptance` | Acceptance tests (backend + frontend), final report, MASTER_PROMPT update | ≤400 |

**Merge order:** 3A → 3B → 3C. Open 3B PR stacked on 3A branch; enable auto-merge on each; start coding 3B while 3A CI runs.

**Do not start Phase 3 until human approves.**

## Files changed

```text
.github/workflows/ci.yml
backend/package.json
.grok/prompts/loop-engineering-prompt.md
.grok/prompts/phase-2-whitelabel-branding-loop.md
.grok/prompts/e2e-00-agent-playbook.md
.grok/reports/ci-fast-pr-gates-and-agent-flow.md
.grok/reports/README.md
MASTER_PROMPT.md
docs/project-plan/09-branch-strategy.md
```

## Validation

```bash
# YAML — workflow file edited manually; validated structurally
cd backend && npm run test:run
cd frontend && npm run build && npm run test:run
```