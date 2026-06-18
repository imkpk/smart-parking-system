# E2E 04 — Cypress CI Stage

You are the implementation agent. Work autonomously.

## Branch

`ci/cypress-smoke-stage`

## PR title

`ci(e2e): add Cypress smoke stage`

## Base

Fresh `develop` (must include E2E 02 + E2E 03).

## Files to read first

```text
MASTER_PROMPT.md
.grok/AGENTS.md
.github/workflows/ci.yml
frontend/package.json
frontend/cypress.config.ts
.grok/reports/cypress-e2e-foundation.md
.grok/reports/cypress-core-parking-smoke.md
```

## Files to create

```text
.grok/reports/cypress-ci-smoke-stage.md
```

## Files to update

```text
.github/workflows/ci.yml
MASTER_PROMPT.md
.grok/reports/README.md
```

## Scope restrictions

```text
- CI workflow changes only (+ report)
- No new smoke specs unless fixing CI flakiness
- No backend business logic changes
- If full-stack E2E is unstable in CI, make job advisory — do not create flaky required check
```

## e2e-smoke job requirements

Add `e2e-smoke` job to `.github/workflows/ci.yml`:

### Run when

> **Updated 2026-06-18:** Cypress smoke runs on **push only** (develop integration trunk). PRs use fast gates without Cypress. See `.grok/reports/ci-fast-pr-gates-and-agent-flow.md`.

```text
- push to main/develop/single-tenant (not on pull_request)
- frontend or backend changes (path filter)
- PR with backend changes
- PR with workflow changes
```

### Do NOT run when

```text
- docs-only changes (*.md, docs/**)
- .grok reports/prompts-only (no frontend/backend)
- payment-service-only (unless payment UI contract affected)
```

Use existing `changes` job outputs. Example condition:

```yaml
if: >
  github.event_name == 'push' ||
  needs.changes.outputs.frontend == 'true' ||
  needs.changes.outputs.backend == 'true' ||
  needs.changes.outputs.workflow == 'true'
```

### Job steps (minimum)

```text
1. Checkout
2. Setup Node 22
3. Start MySQL service (or use existing backend test DB pattern)
4. Backend: npm ci, prisma migrate, seed, start:dev in background
5. Frontend: npm ci, npm run e2e:ci (or start-server-and-test)
6. Upload Cypress screenshots on failure
```

### Advisory vs required

If MySQL/service startup is flaky in GitHub Actions:

- Set `continue-on-error: true` on first rollout
- Document blocker in `.grok/reports/cypress-ci-smoke-stage.md`
- Do NOT block `ci-summary` on failing E2E until stable

When stable, wire `e2e-smoke` into `ci-summary` `needs` and remove `continue-on-error`.

## Validation

```bash
# Validate workflow syntax locally if actionlint available
# Otherwise rely on CI run on PR
yamllint .github/workflows/ci.yml  # optional
```

Push and verify CI runs the new job on this PR (frontend + workflow changed).

## Commit message

```bash
git add .github/workflows/ci.yml .grok/reports/cypress-ci-smoke-stage.md MASTER_PROMPT.md .grok/reports/README.md
git commit -m "ci(e2e): add Cypress smoke stage"
git push -u origin ci/cypress-smoke-stage
```

## Merge rules

- Open PR to `develop`
- `ci-summary` must pass
- If `e2e-smoke` is advisory and fails, document why — still merge if required checks green
- Merge when green
- Pull latest `develop` before E2E 05