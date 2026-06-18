# E2E 01 — Strategy and Journey Registry

You are the implementation agent. Work autonomously. Do not ask the human for routine approvals.

## Branch

`docs/e2e-strategy-and-journey-registry`

## PR title

`docs(e2e): add Cypress journey strategy and registry`

## Base

Fresh `develop` (sync before branching).

## Files to read first

```text
MASTER_PROMPT.md
.grok/AGENTS.md
.grok/prompts/e2e-00-agent-playbook.md
.grok/reports/e2e-agent-playbook.md
docs/project-plan/03-roadmap.md
frontend/src/routes/
frontend/src/pages/
```

## Files to create

```text
.grok/e2e/journey-registry.md
.grok/reports/e2e-strategy-hybrid-model.md
```

## Files to update

```text
MASTER_PROMPT.md          — changelog row, reference journey registry in E2E section
.grok/reports/README.md   — add report row
```

## Scope restrictions

```text
Docs only. No Cypress install. No test code. No backend/frontend product changes.
```

## Journey registry requirements

Create `.grok/e2e/journey-registry.md` with J1–J14:

| ID | Journey | Smoke priority | Cypress spec (future) | Roles |
|----|---------|----------------|----------------------|-------|
| J1 | Login → role home redirect | P0 | `auth-login.cy.ts` | ALL |
| J2 | Register → correct dashboard | P1 | `auth-register.cy.ts` | USER |
| J3 | Register vehicle → appears in list | P0 | `vehicles.cy.ts` | USER |
| J4 | Book slot → booking visible | P0 | `booking-lifecycle.cy.ts` | USER |
| J5 | Security/Admin check-in → active event | P0 | `security-checkin.cy.ts` | SECURITY, ADMIN |
| J6 | Security/Admin check-out → completed event | P0 | `security-checkout.cy.ts` | SECURITY, ADMIN |
| J7 | User views parking/payment history | P1 | `user-history.cy.ts` | USER |
| J8 | Payment initiation / Razorpay stub | P0 | `payment-initiation.cy.ts` | USER |
| J9 | Admin creates parking lot | P2 | `admin-lot.cy.ts` | ADMIN |
| J10 | Admin manages floors/slots | P2 | `admin-floors-slots.cy.ts` | ADMIN |
| J11 | Admin views bookings/payments grids | P1 | `admin-grids.cy.ts` | ADMIN |
| J12 | Admin mock payment success/fail | P2 | `admin-mock-payment.cy.ts` | ADMIN |
| J13 | Admin dashboard summary loads | P1 | `admin-dashboard.cy.ts` | ADMIN |
| J14 | Unauthorized route blocked / logout | P0 | `auth-guard.cy.ts` | ALL |

Each journey entry must include:

- User story (one sentence)
- Preconditions (seed users, roles)
- Happy-path steps
- Assertions (visible UI outcomes, not raw IDs)
- Deferred/edge cases → Vitest or backend tests
- Smoke vs full regression classification

## Strategy report requirements

`.grok/reports/e2e-strategy-hybrid-model.md` must document:

- Monorepo smoke first (`frontend/cypress/e2e/smoke/`)
- Future protected repo `smart-parking-e2e` (do not create until human asks)
- Pin app by **commit SHA**, not floating branch tip
- Same-PR Cypress update rule for sellable journeys
- Vitest for component logic; Cypress for sellable flows
- No real Razorpay in PR CI

## Validation

```bash
# Docs-only PR — no build required, but verify markdown links resolve
git diff --stat develop
```

## Commit message

```bash
git add .grok/e2e .grok/reports/e2e-strategy-hybrid-model.md MASTER_PROMPT.md .grok/reports/README.md
git commit -m "docs(e2e): add Cypress journey strategy and registry"
git push -u origin docs/e2e-strategy-and-journey-registry
```

## Merge rules

- Open PR to `develop`
- Wait for CI (docs-only may skip heavy jobs; `ci-summary` must pass)
- Merge when green and mergeable
- Pull latest `develop` before E2E 02