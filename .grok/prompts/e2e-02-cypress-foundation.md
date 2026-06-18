# E2E 02 — Cypress Foundation

You are the implementation agent. Work autonomously.

## Branch

`feature/cypress-e2e-foundation`

## PR title

`test(e2e): add Cypress smoke foundation`

## Base

Fresh `develop`.

## Files to read first

```text
MASTER_PROMPT.md
.grok/AGENTS.md
.grok/e2e/journey-registry.md
.grok/reports/e2e-strategy-hybrid-model.md
frontend/package.json
frontend/vite.config.ts
frontend/src/pages/auth/
frontend/src/pages/vehicles/
frontend/src/routes/
backend/prisma/seed.ts
```

## Files to create

```text
frontend/cypress.config.ts
frontend/cypress/support/e2e.ts
frontend/cypress/support/commands.ts
frontend/cypress/fixtures/.gitkeep
frontend/cypress/e2e/smoke/auth-login.cy.ts          # J1
frontend/cypress/e2e/smoke/auth-guard.cy.ts          # J14
frontend/cypress/e2e/smoke/vehicles.cy.ts            # J3 (if stable)
.grok/reports/cypress-e2e-foundation.md
```

## Files to update

```text
frontend/package.json     — Cypress deps + scripts
frontend/package-lock.json
.grok/e2e/journey-registry.md  — mark J1, J3, J14 smoke status
MASTER_PROMPT.md
.grok/reports/README.md
```

## Scope restrictions

```text
- Add Cypress foundation and first smokes only
- No backend business logic changes
- Frontend changes only for testability (data-testid where MUI is painful)
- Do not implement J4–J8 yet (E2E 03)
- Do not add CI job yet (E2E 04)
```

## Package scripts (required)

```json
{
  "e2e:open": "cypress open",
  "e2e:smoke": "cypress run --spec \"cypress/e2e/smoke/**/*.cy.ts\"",
  "e2e:ci": "start-server-and-test dev http://localhost:5173 e2e:smoke"
}
```

Add devDependencies:

```text
cypress
start-server-and-test
```

## Cypress config requirements

- `baseUrl`: `http://localhost:5173`
- `specPattern`: `cypress/e2e/**/*.cy.ts`
- `supportFile`: `cypress/support/e2e.ts`
- `video`: false in CI-friendly defaults
- `defaultCommandTimeout`: 10000

## Support commands (minimum)

```text
cy.loginAs(role)     — logs in via UI or cy.session with seed credentials
cy.logout()          — clears session, returns to login
cy.uniquePlate()     — timestamp-based vehicle plate for J3
```

Use seed users from `backend/prisma/seed.ts`. Document credentials in the foundation report (not secrets — use known dev seed values).

## Smoke specs

### J1 — auth-login.cy.ts

- Visit `/login`
- Enter valid USER credentials
- Submit
- Assert redirect to USER home/dashboard route
- Assert authenticated nav visible

### J14 — auth-guard.cy.ts

- Visit protected route without auth → redirect to login
- Login as USER, visit ADMIN-only route → blocked or redirect
- Logout → session cleared

### J3 — vehicles.cy.ts (if stable)

- Login as USER
- Navigate to vehicles
- Create vehicle with `cy.uniquePlate()`
- Assert vehicle appears in list/grid

Skip J3 with documented blocker if backend/DB not available locally — do not fake passing tests.

## Validation

```bash
cd frontend
npm run build
npm run test:run
```

Full E2E (requires backend + MySQL running):

```bash
# Terminal 1 — backend
cd backend && npm run start:dev

# Terminal 2 — frontend smoke
cd frontend && npm run e2e:smoke
```

Or combined:

```bash
cd frontend && npm run e2e:ci
```

If `e2e:smoke` cannot run because stack is down, start backend/frontend/DB and retry. Document exact commands in `.grok/reports/cypress-e2e-foundation.md`. Do not fake passing E2E.

## Commit message

```bash
git add frontend/cypress frontend/cypress.config.ts frontend/package.json frontend/package-lock.json .grok/
git commit -m "test(e2e): add Cypress smoke foundation"
git push -u origin feature/cypress-e2e-foundation
```

## Merge rules

- Open PR to `develop`
- CI must pass (frontend build + vitest)
- E2E smoke should pass locally before merge; CI E2E comes in E2E 04
- Merge when green
- Pull latest `develop` before E2E 03