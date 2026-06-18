# Cypress CI Smoke Stage — LOOP 04 Report

**Date:** 2026-06-18  
**Branch:** `ci/cypress-smoke-stage`  
**PR:** `ci(e2e): add Cypress smoke stage`

## Delivered

Added `e2e-smoke` job to `.github/workflows/ci.yml`:

- MySQL 8 service container with `parking_lot_db`, `parking_lot_shadow_db`, `parking_payment_db`
- Backend: `prisma migrate deploy`, seed, `npm run start` on port 3000
- Payment service: Maven package + `java -jar` on port 8081 (MOCK provider default)
- Frontend: `npm run e2e:ci` (Vite + Cypress smoke suite)
- Failure artifacts: Cypress screenshots + backend/payment logs

## Trigger conditions

**Runs when:**

- `push` to `main` / `develop` / `single-tenant`
- PR changes `frontend/**`, `backend/**`, or `.github/workflows/**`

**Skips when:**

- Docs-only / `.grok`-only / `payment-service`-only PRs (no frontend/backend/workflow change)

## Advisory vs required

**Status: advisory** (`continue-on-error: true`)

Full-stack E2E in GitHub Actions is new; the job runs on every qualifying push/PR but does **not** block `ci-summary` until stable across multiple runs.

When stable:

1. Remove `continue-on-error: true` from `e2e-smoke`
2. Add `e2e-smoke` failure to `ci-summary` gate logic

## Local parity

```bash
cd backend && npm run start:dev
cd payment-service && mvn spring-boot:run   # or java -jar
cd frontend && npm run e2e:ci
```

## CI env (job-level)

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `mysql://root:password@127.0.0.1:3306/parking_lot_db` |
| `PAYMENT_SERVICE_URL` | `http://127.0.0.1:8081` |
| Cypress `apiBaseUrl` | `http://localhost:3000/api` (from cypress.config.mjs) |