# E2E Policy and Release Pack — LOOP 05 Report

**Date:** 2026-06-18  
**Branch:** `docs/e2e-policy-and-release-pack`  
**PR:** `docs(e2e): add release regression policy`

## Same-PR Cypress update rule

```text
New sellable user journey      → add/update Cypress smoke in same PR
Changed sellable user journey  → update Cypress smoke in same PR
Visible UI regression          → add regression smoke if real flow affected
Style-only/internal change     → Cypress not required (document in PR checklist)
```

Enforced via `.github/pull_request_template.md` UI/E2E impact section.

## Release regression policy

Before any release sign-off:

1. Check out the **exact release SHA** (tag or commit), not floating `develop` tip
2. Start full local stack (backend + payment-service + frontend)
3. Run `cd frontend && npm run e2e:smoke`
4. Record SHA and smoke result in release notes

```bash
git checkout <release-sha>
cd backend && npm run start:dev          # terminal 1
cd payment-service && mvn spring-boot:run # terminal 2
cd frontend && npm run e2e:smoke         # terminal 3
```

Vitest (`npm run test:run`) remains the PR gate for unit/UI logic; Cypress smoke is the sellable-journey gate.

## Future `smart-parking-e2e` separate repo

- **Purpose:** protected manual/release deep regression (J9–J12, long chains, multi-tenant scenarios)
- **Do not create** until human explicitly requests
- **Monorepo smoke** (`frontend/cypress/e2e/smoke/`) remains the PR gate for P0 journeys
- Separate repo runs against pinned app SHA; never blocks PR CI until human promotes it

## App SHA requirement

All manual and release E2E runs must document:

```text
App SHA: <git rev-parse HEAD>
Branch/tag: <name>
Smoke command: cd frontend && npm run e2e:smoke
Result: pass/fail + date
```

Agents must not claim release-ready E2E without a pinned SHA.

## single-tenant minimal smoke subset

For `single-tenant` hotfixes, run at minimum:

| Journey | Spec | When |
|---------|------|------|
| J1 | `auth-login.cy.ts` | Always |
| J14 | `auth-guard.cy.ts` | Always |
| J3 | `vehicles.cy.ts` | If vehicle UI/API touched |

Add J4–J8 only when parking lifecycle (bookings, events, payments) is in the hotfix scope.

## Flake policy

```text
- Flaky smoke = P0 quality issue
- Quarantine max 48 hours with ticket
- Never merge E2E PR with failing required CI
- Never silently delete failing smoke coverage
```

Current CI: `e2e-smoke` is **advisory** (`continue-on-error: true`) until stable. See `.grok/reports/cypress-ci-smoke-stage.md`.

## Agent quick reference

| Path | Purpose |
|------|---------|
| `.grok/e2e/journey-registry.md` | J1–J14 status |
| `.grok/prompts/e2e-*.md` | Executable rollout prompts |
| `.grok/prompts/loop-engineering-prompt.md` | Full autonomous loop |
| `frontend/cypress/e2e/smoke/` | PR-gate specs |
| `.grok/AGENTS.md` | Cypress agent rules |