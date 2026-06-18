# E2E 03 — Core Parking Smoke

You are the implementation agent. Work autonomously.

## Branch

`feature/cypress-core-parking-smoke`

## PR title

`test(e2e): cover core parking lifecycle smoke`

## Base

Fresh `develop` (must include E2E 02 Cypress foundation).

## Files to read first

```text
MASTER_PROMPT.md
.grok/AGENTS.md
.grok/e2e/journey-registry.md
frontend/cypress/
frontend/src/pages/bookings/
frontend/src/pages/parking-events/
frontend/src/pages/payments/
frontend/src/api/bookingsApi.ts
frontend/src/api/parkingEventsApi.ts
backend/prisma/seed.ts
```

## Files to create

```text
frontend/cypress/e2e/smoke/booking-lifecycle.cy.ts    # J4
frontend/cypress/e2e/smoke/security-checkin.cy.ts      # J5
frontend/cypress/e2e/smoke/security-checkout.cy.ts    # J6
frontend/cypress/e2e/smoke/payment-initiation.cy.ts     # J8 (stub Razorpay)
frontend/cypress/e2e/smoke/api-fanout-regression.cy.ts
.grok/reports/cypress-core-parking-smoke.md
```

## Files to update

```text
frontend/cypress/support/commands.ts   — booking/check-in helpers if needed
.grok/e2e/journey-registry.md         — J4, J5, J6, J8 smoke status
MASTER_PROMPT.md
.grok/reports/README.md
```

## Scope restrictions

```text
- Cypress smoke tests and minimal testability hooks only
- No backend business logic changes unless required for deterministic setup
- Stub Razorpay — never call real Razorpay in smoke
- Happy-path only; edge cases stay in Vitest/backend
```

## Journeys to cover

| ID | Spec | Flow |
|----|------|------|
| J4 | booking-lifecycle.cy.ts | USER books available slot → booking visible in list |
| J5 | security-checkin.cy.ts | SECURITY/ADMIN checks in booking → ACTIVE event |
| J6 | security-checkout.cy.ts | SECURITY/ADMIN checks out → COMPLETED event |
| J8 | payment-initiation.cy.ts | Payment initiation UI loads; Razorpay stubbed |

Chain J4→J5→J6 in one spec or separate specs with shared `before` setup — prefer deterministic seeded data or API helpers in `commands.ts`.

## API fan-out regression (mandatory)

Create `api-fanout-regression.cy.ts`:

```text
Intercept: GET **/parking-lots/*/slots**
```

Assert this pattern is **NOT** called during initial load of:

- Bookings page (USER or ADMIN)
- Parking Events page (SECURITY or ADMIN)

This guards against the slots fan-out regression fixed in Phase 1b.

## Razorpay stub (J8)

```typescript
cy.intercept('POST', '**/payments/**', { fixture: 'payment-initiated.json' }).as('paymentInit');
// Or stub window.Razorpay constructor — never open real checkout in CI
```

## Validation

```bash
cd frontend
npm run build
npm run test:run
npm run e2e:smoke
```

Requires full local stack:

```bash
cd backend && npm run start:dev
cd frontend && npm run e2e:smoke
```

## Commit message

```bash
git add frontend/cypress .grok/
git commit -m "test(e2e): cover core parking lifecycle smoke"
git push -u origin feature/cypress-core-parking-smoke
```

## Merge rules

- All smoke specs must pass locally with backend running
- Open PR to `develop`
- Merge when CI green (build + vitest; E2E CI may not exist yet)
- Pull latest `develop` before E2E 04