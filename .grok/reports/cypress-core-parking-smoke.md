# Cypress Core Parking Smoke — LOOP 03 Report

**Date:** 2026-06-18  
**Branch:** `feature/cypress-core-parking-smoke`  
**PR:** `test(e2e): cover core parking lifecycle smoke`

## Delivered

### Smoke specs

| Journey | Spec | Flow |
|---------|------|------|
| J4 | `booking-lifecycle.cy.ts` | API booking create → USER sees booking in grid |
| J5 | `security-checkin.cy.ts` | SECURITY checks in booking → ACTIVE event |
| J6 | `security-checkout.cy.ts` | SECURITY checks out → COMPLETED event |
| J8 | `payment-initiation.cy.ts` | USER sees payment row after checkout (no real Razorpay) |
| Fan-out | `api-fanout-regression.cy.ts` | No `GET **/parking-lots/*/slots**` on Bookings/Parking Events initial load |

### Support commands (`frontend/cypress/support/commands.ts`)

- `RegisteredUser` extended with `token`, `userId`
- `loginWithUser()` — UI login with pre-registered user (no session cache)
- `setupParkingSmokeData()` — ADMIN creates lot/floor/slot; USER vehicle; SECURITY user
- `createBookingViaApi()` — POST booking for smoke chain
- `checkInBookingViaApi()` — POST check-in for downstream specs
- Types: `ParkingSmokeData`, `BookingSmokeData`, `ActiveEventSmokeData`

### Testability fix

- `frontend/vite.config.ts`: `host: '127.0.0.1'`, `strictPort: true` — fixes Cypress `ECONNREFUSED` when Vite bound IPv6-only `[::1]:5173`

## J4 design note

Full UI booking form was flaky in headless Cypress (MUI Select portal/overflow clipping). **J4 uses API booking create + UI list verification** — booking row shows vehicle plate, lot name, and booking code. This matches the hybrid smoke strategy: deterministic API setup, UI assertion on sellable outcome.

## Razorpay (J8)

No real Razorpay in smoke. J8 asserts payment row visible with vehicle plate and `PAY-` / `INR` labels after checkout chain. Payment-service must be reachable for checkout fee calculation.

## Local full-stack commands

```bash
# Terminal 1 — backend (MySQL + NestJS :3000)
cd backend && npm run start:dev

# Terminal 2 — payment-service (:8081) for checkout/payment smokes
cd payment-service && ./mvnw spring-boot:run

# Terminal 3 — smoke (auto-starts Vite)
cd frontend && npm run e2e:ci
```

Validation (this PR):

```bash
cd frontend
npm run build
npm run test:run
npm run e2e:smoke   # requires backend; payment-service for J6/J8
```

## Journey status after LOOP 03

| ID | Spec | Status |
|----|------|--------|
| J4 | booking-lifecycle.cy.ts | implemented |
| J5 | security-checkin.cy.ts | implemented |
| J6 | security-checkout.cy.ts | implemented |
| J8 | payment-initiation.cy.ts | implemented |
| Fan-out | api-fanout-regression.cy.ts | implemented |

## CI note

E2E CI stage added in LOOP 04 (`ci/cypress-smoke-stage`). This PR: build + Vitest gate only.