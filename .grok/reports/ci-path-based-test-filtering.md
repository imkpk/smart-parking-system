# CI Path-Based Test Filtering — Report

**Date:** 2026-06-26  
**Branch:** `ci/path-based-test-filtering`  
**Role:** ① Orchestrator (CI-only)

## Problem (before)

The monorepo `CI` workflow (`/.github/workflows/ci.yml`) already used `dorny/paths-filter` to detect service changes, but:

1. **Every `push` to `develop` ran all service jobs** — the `if` condition included `github.event_name == 'push'`, bypassing path filters.
2. **PRs ran the full unit test suite** per service (`npm run test:run` / `vitest run`), not only specs affected by the branch diff.
3. **Docs / agent-run changes could still trigger heavy jobs** on push because of the blanket push trigger.
4. **Checkouts used shallow history** — not compatible with `--changedSince` / Vitest `--changed`.

## Solution (after)

Updated the existing **`ci.yml`** (no duplicate per-service workflow files) with:

| Layer | Behavior |
|-------|----------|
| Workflow `paths-ignore` | `**.md`, `docs/**`, `.grok/**`, `scripts/**`, `.github/**` — entire CI workflow skipped when only these change |
| `dorny/paths-filter` | `scripts/**` added to `docs` bucket; service jobs run only when `backend/**`, `frontend/**`, or `payment-service/**` change |
| PR tests | **Affected only** — see commands below |
| `develop` push | **Full suite** with coverage (backend/frontend) or `mvn package` (payment) when that service path changed |
| E2E smoke | `develop` push only, when backend or frontend changed |

## Commands

### Backend (Jest)

```bash
# PR — affected specs only
npm run test:affected
# → jest --changedSince=origin/develop --passWithNoTests --forceExit --coverage=false

# develop push — full suite + coverage
npm run test:cov
```

### Frontend (Vitest)

```bash
# PR — affected specs only
npm run test:affected
# → vitest run --changed origin/develop --passWithNoTests

# develop push — full suite + coverage
npm run coverage
```

### Payment service (Maven)

```bash
# PR — build without tests, then affected JUnit classes
mvn -B clean package -DskipTests
node ../scripts/ci-payment-affected-tests.mjs

# develop push — full build + all tests
mvn -B clean package
```

`scripts/ci-payment-affected-tests.mjs` maps changed `src/main` / `src/test` Java files to `*Test` classes and runs `mvn -B test -Dtest=...`. Exits 0 when no tests match (`passWithNoTests`).

## How `--changedSince` / `--changed` works

1. Checkout uses **`fetch-depth: 0`** so git has full history.
2. CI runs **`git fetch origin develop`** before affected test steps.
3. **Jest** `--changedSince=origin/develop` runs specs whose production or test files differ between the PR branch and `origin/develop`.
4. **Vitest** `--changed origin/develop` does the same for files under `src/test/**/*.test.{ts,tsx}`.
5. On **merge to `develop`**, the push event runs the **full** test commands as a regression safety net.

## Edge cases

| Case | Handling |
|------|----------|
| Branch touches backend but adds no new specs | `--passWithNoTests` → exit 0 |
| Docs-only PR | Workflow `paths-ignore` → **zero CI jobs** |
| `.grok/reports/` or `scripts/` only | Same — no CI |
| Payment source change with no test class | Script logs and exits 0 |
| Mixed PR (backend + docs) | CI runs; only backend job executes |
| Workflow file edit only | `paths-ignore` on `.github/**` → CI skipped on that PR |

## Files changed

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | Path ignores, affected tests, `fetch-depth: 0`, remove push bypass |
| `backend/package.json` | `test:affected` script |
| `frontend/package.json` | `test:affected` script |
| `scripts/ci-payment-affected-tests.mjs` | Maven affected-test runner |

**Not touched:** `backend/src/`, `frontend/src/`, `payment-service/src/`

## Role ⑤ verification

| Check | Status |
|-------|--------|
| Only workflows + scripts + package test scripts touched | ✅ |
| No application source changes | ✅ |
| `--passWithNoTests` on backend/frontend Jest/Vitest | ✅ |
| Payment script exits 0 when no tests | ✅ |
| `fetch-depth: 0` on service checkouts | ✅ |
| Full suite on `develop` push | ✅ |
| Report at `.grok/reports/ci-path-based-test-filtering.md` | ✅ |

**Verdict:** APPROVE

## Manual verification steps

1. Open a docs-only PR (e.g. edit `README.md`) → confirm **no** `CI` workflow run.
2. Open a backend PR that changes one `.spec.ts` → confirm only that spec runs in logs.
3. Merge to `develop` → confirm full `test:cov` / `coverage` / `mvn package` on push.
4. Push to `scripts/` only → confirm no `CI` workflow.