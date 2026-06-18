# E2E Strategy — Hybrid Model

**Date:** 2026-06-18  
**Branch:** `docs/e2e-strategy-and-journey-registry`  
**PR:** `docs(e2e): add Cypress journey strategy and registry`

## Summary

Smart Parking uses a **hybrid E2E model**: thin Cypress smokes in the monorepo for PR gates, with an optional future protected repo for deep release regression. Component logic stays in Vitest/RTL; sellable user journeys get Cypress coverage.

## Monorepo smoke first

```text
frontend/cypress/e2e/smoke/
```

| Layer | Tool | Scope |
|-------|------|-------|
| Component logic | Vitest + RTL | Forms, hooks, grids, formatters |
| Sellable journeys | Cypress smoke | Happy-path J1–J14 (prioritized P0 first) |
| API contracts | Backend Jest | Auth, slot lifecycle, payments |
| Payment integration | payment-service tests | Razorpay verify, webhooks |

PR-gate smokes target **P0 journeys** first (J1, J3, J4, J5, J6, J8, J14) per journey registry.

## Future separate repo: `smart-parking-e2e`

```text
smart-parking-e2e   (protected, manual/release regression)
```

**Do not create** until the human explicitly requests it.

When created:
- Pin application by **commit SHA**, not floating branch tip
- Run against dockerized or staged full stack
- Cover P1/P2 journeys and multi-step release scenarios
- Monorepo smoke remains the fast PR gate

## Pin app by SHA

Release and manual regression must checkout a specific commit:

```bash
git fetch origin
git checkout <release-sha>
cd frontend && npm ci && npm run e2e:smoke
```

Record `<release-sha>` in release notes. Never sign off release against an unpinned `develop` tip.

## Same-PR Cypress update rule

| Change type | Cypress action |
|-------------|----------------|
| New sellable journey | Add smoke in same PR |
| Changed sellable journey | Update smoke in same PR |
| Visible UI regression in real flow | Add regression smoke |
| Style-only / internal refactor | Document exemption in PR checklist |

Enforced via PR template checklist (E2E 05).

## Vitest vs Cypress split

```text
Vitest     → StatusChip colors, formatters, AuthProvider, DataGrid columns, search filters
Cypress    → Login redirect, book → check-in → check-out → payment initiate (stubbed)
Backend    → Slot state machine, tenant scoping, Razorpay signature verification
```

Edge cases (invalid login, duplicate email, payment webhook retries) **do not** belong in Cypress smoke.

## No real Razorpay in PR CI

- Stub `window.Razorpay` and/or intercept payment API in smoke specs
- Real Razorpay tested in payment-service integration tests and manual release runs
- Mock payment admin actions (J12) may be dev-only — exclude from CI if gated

## CI rollout phases

| Phase | E2E in CI | Gate |
|-------|-----------|------|
| E2E 02–03 | Local only | Frontend build + Vitest in CI |
| E2E 04 | `e2e-smoke` job added | Advisory if stack unstable |
| Stable | `e2e-smoke` in `ci-summary` | Required check |

## Flake policy

- Flaky smoke = P0 quality issue
- Quarantine max 48 hours with tracked ticket
- Never merge required E2E CI red
- Never silently delete failing specs

## single-tenant branch

Hotfixes on `single-tenant` use minimal smoke subset: **J1, J14**, plus J3/J4–J8 only if lifecycle touched.

**Never merge `develop` into `single-tenant`.**

## Artifacts

| Artifact | Path |
|----------|------|
| Journey registry | `.grok/e2e/journey-registry.md` |
| Prompt pack | `.grok/prompts/e2e-*.md` |
| Playbook | `.grok/reports/e2e-agent-playbook.md` |

## Next step

Execute **E2E 02** — Cypress foundation on branch `feature/cypress-e2e-foundation`.