# E2E 00 — Agent Playbook and Prompt Pack

> **Status:** Reference document created by LOOP 00. Agents execute E2E 01–05 in order.

## Purpose

Establish the Cypress/E2E rollout playbook: agent rules, executable prompt pack, and reporting structure. No Cypress install in this loop.

## Prerequisites

Read before starting any E2E loop:

```text
MASTER_PROMPT.md
.grok/AGENTS.md
.grok/prompts/loop-engineering-prompt.md
docs/project-plan/09-branch-strategy.md
```

## Execution order

```text
E2E 01 → Strategy and Journey Registry
E2E 02 → Cypress Foundation
E2E 03 → Core Parking Smoke
E2E 04 → Cypress CI Stage
E2E 05 → Policy and Release Pack Docs
```

## Autonomous loop protocol

```text
1. Sync develop.
2. Create branch for current prompt.
3. Make only scoped changes.
4. Run required local validation.
5. Commit and push.
6. Open PR to develop.
7. Wait for CI.
8. If CI fails, inspect logs, fix, push again (max 3 attempts per issue).
9. Merge PR when CI is green and mergeable.
10. Pull latest develop.
11. Continue to next prompt.
```

Do not continue to the next prompt until the current PR is merged.

## Stop conditions

Stop and report only if:

- GitHub permissions prevent branch creation, PR creation, or merge
- CI fails after 3 fix attempts on the same issue
- A test requires backend/product behavior changes outside scope
- Cypress cannot be made deterministic without a backend test-data endpoint
- Merge conflict cannot be resolved safely
- Human review is explicitly required by branch protection

## Repository rules (all E2E loops)

```text
- Base branch: develop (never merge develop into single-tenant)
- Do not start Phase 1c during E2E rollout
- No backend business logic changes unless required for deterministic E2E
- No payment-service business logic changes
- Frontend product behavior changes only for Cypress/testability
- One concern per PR
- Merge only when CI green, PR mergeable, no blocking review comments
```

## Key artifacts

| Artifact | Path |
|----------|------|
| Journey registry | `.grok/e2e/journey-registry.md` (E2E 01) |
| Prompt pack | `.grok/prompts/e2e-*.md` |
| Smoke specs | `frontend/cypress/e2e/smoke/` (E2E 02+) |
| Playbook report | `.grok/reports/e2e-agent-playbook.md` |
| CI stage | `.github/workflows/ci.yml` `e2e-smoke` job (E2E 04) |
| Release policy | `.grok/reports/e2e-policy-and-release-pack.md` (E2E 05) |

## Definition of done (user-facing UI)

```text
1. Vitest/RTL covers changed UI logic.
2. Cypress smoke exists or is updated for changed sellable journey.
3. Journey registry is updated.
4. Smoke passes locally or in CI depending on rollout phase.
```