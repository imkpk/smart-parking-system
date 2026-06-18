# Cypress E2E Foundation — LOOP 02 Report

**Date:** 2026-06-18  
**Branch:** `feature/cypress-e2e-foundation`  
**PR:** `test(e2e): add Cypress smoke foundation`

## Delivered

- Cypress 14 + `start-server-and-test` in `frontend/package.json`
- `frontend/cypress.config.mjs` — baseUrl `http://localhost:5173`
- Support commands: `cy.loginAs`, `cy.registerViaApi`, `cy.logout`, `cy.uniquePlate`, `cy.uniqueEmail`
- Smoke specs: J1 (`auth-login.cy.ts`), J14 (`auth-guard.cy.ts`), J3 (`vehicles.cy.ts`)

## Scripts

```bash
cd frontend
npm run e2e:open      # Cypress interactive
npm run e2e:smoke     # headless smoke suite
npm run e2e:ci        # start Vite + run smoke
```

## Local full-stack commands

E2E smokes require **backend API** at `http://localhost:3000/api` (MySQL + NestJS):

```bash
# Terminal 1 — database + backend
cd backend
npx prisma migrate deploy   # or db push for dev
npm run start:dev

# Terminal 2 — frontend smoke (Vite must be running or use e2e:ci)
cd frontend
npm run dev                 # if not using e2e:ci
npm run e2e:smoke
```

One-liner (frontend only auto-starts):

```bash
cd frontend && npm run e2e:ci
```

Backend must already be running on port 3000 for `e2e:ci`.

## Test data

- Users created per run via `POST /api/auth/register` with timestamp emails (`e2e-*@example.com`)
- Password: `password123` (dev only)
- Vehicles use `cy.uniquePlate()` plates

## Journey status

| ID | Spec | Status |
|----|------|--------|
| J1 | auth-login.cy.ts | implemented |
| J3 | vehicles.cy.ts | implemented |
| J14 | auth-guard.cy.ts | implemented |

## CI note

E2E is **local-only** in this PR. CI stage added in E2E 04 (`ci/cypress-smoke-stage`).