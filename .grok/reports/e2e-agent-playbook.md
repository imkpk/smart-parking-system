# E2E Agent Playbook — LOOP 00 Report

**Date:** 2026-06-18  
**Branch:** `docs/e2e-agent-playbook`  
**PR title:** `docs(e2e): add agent playbook and Cypress prompt pack`

## Purpose

Establish autonomous Cypress/E2E rollout for sellable user journeys. Agents execute prompts E2E 01–05 in sequence without human supervision for routine PR/CI steps.

## Files added

```text
.grok/prompts/e2e-00-agent-playbook.md
.grok/prompts/e2e-01-strategy-and-registry.md
.grok/prompts/e2e-02-cypress-foundation.md
.grok/prompts/e2e-03-core-parking-smoke.md
.grok/prompts/e2e-04-cypress-ci-stage.md
.grok/prompts/e2e-05-policy-and-release-pack-docs.md
.grok/reports/e2e-agent-playbook.md
```

## Files updated

```text
.grok/AGENTS.md
MASTER_PROMPT.md
.grok/reports/README.md
```

## Same-PR UI/E2E rule

Any PR that changes a sellable user journey must add or update Cypress smoke in the same PR, or document in the PR checklist why Cypress is not needed (style-only/internal).

## Journey registry requirement

Before implementing smoke tests, E2E 01 creates `.grok/e2e/journey-registry.md` with J1–J14. Every smoke spec maps to a journey ID. Registry must be updated when journeys change.

## Monorepo smoke first

PR-gate smoke tests live in:

```text
frontend/cypress/e2e/smoke/
```

Vitest/RTL covers component logic. Cypress covers sellable happy-path flows only.

## Separate regression repo later

Full manual/release regression may move to protected repo `smart-parking-e2e`. **Do not create** until the human explicitly asks.

## No flaky Cypress gate

- Prefer accessible selectors; `data-testid` only where MUI/DataGrid is painful
- No arbitrary `cy.wait(5000)`
- Seeded/API data with timestamp-based unique values
- Flaky smoke = P0; quarantine max 48 hours with ticket
- Never merge E2E PR with failing required CI
- Never silently delete failing smoke coverage

## No real Razorpay in PR CI

Stub Razorpay in smoke tests. Real payment integration is tested in payment-service unit/integration tests and manual release runs.

## Never merge develop into single-tenant

`single-tenant` is preserved from `main` for legacy hotfixes. SaaS E2E work targets `develop` only.

## Next execution order

```text
E2E 01 → Strategy and Journey Registry
E2E 02 → Cypress Foundation (J1, J3, J14)
E2E 03 → Core Parking Smoke (J4, J5, J6, J8 + fan-out regression)
E2E 04 → Cypress CI Stage
E2E 05 → Policy and Release Pack Docs
FINAL  → Rollout summary report
```

## Agent entry point

```text
.grok/prompts/loop-engineering-prompt.md   — full autonomous loop
.grok/prompts/e2e-00-agent-playbook.md     — playbook reference
.grok/prompts/e2e-01-strategy-and-registry.md  — start here after LOOP 00 merges
```