# CI Path-Based Jobs

**Branch:** `fix/ci-path-based-jobs`  
**Date:** 2026-06-18  
**Scope:** `.github/workflows/ci.yml` only

## Problem

The CI workflow ran all three service jobs on every pull request:

- NestJS Backend
- React Frontend
- Spring Boot Payment Service

Docs-only, frontend-only, backend-only, and payment-only PRs still paid the full cost of three builds and test suites. That wasted runner time and slowed feedback on focused changes.

## Implementation

Added a `changes` job using [`dorny/paths-filter@v3`](https://github.com/dorny/paths-filter) with `fetch-depth: 0` so PR diffs compare correctly against the base branch.

Each service job now:

1. Declares `needs: changes`
2. Runs on **push** to `main` or `develop` (full CI)
3. Runs on **pull_request** only when its service paths or workflow files changed

Added a `ci-summary` job that runs `if: always()` and fails only when a service job that actually ran ends in `failure` or `cancelled`. Skipped jobs are treated as success.

## Path rules

| Filter | Paths | Effect on PR |
|--------|-------|----------------|
| `backend` | `backend/**` | Runs NestJS Backend job |
| `frontend` | `frontend/**` | Runs React Frontend job |
| `payment` | `payment-service/**` | Runs Spring Boot Payment Service job |
| `workflow` | `.github/workflows/**` | Runs **all** service jobs |
| `docs` | `**/*.md`, `docs/**`, `.grok/**` | Informational only; does not trigger service jobs |

## Expected behavior

| Change type | Jobs that run |
|-------------|----------------|
| Frontend-only PR | `changes`, `frontend`, `ci-summary` |
| Backend-only PR | `changes`, `backend`, `ci-summary` |
| Payment-only PR | `changes`, `payment-service`, `ci-summary` |
| Docs-only PR | `changes`, `ci-summary` |
| Workflow/config PR | `changes`, all service jobs, `ci-summary` |
| Push to `develop` / `main` | All jobs (full CI) |

## Branch protection note

If branch protection requires individual checks named `NestJS Backend`, `React Frontend`, or `Spring Boot Payment Service`, skipped jobs may not satisfy those required checks on docs-only PRs.

Options:

1. Require only **CI Summary** after this change lands
2. Keep per-service required checks and accept that docs-only PRs need an admin override or a trivial no-op path touch
3. Use rulesets that allow skipped checks when paths do not match

Document the chosen policy in repository settings when merging this PR.

## Validation

| Check | Result |
|-------|--------|
| Workflow YAML reviewed | ✅ Path filters, conditionals, and summary logic inspected |
| `git diff -- .github/workflows/ci.yml` | ✅ Adds `changes`, `if:` guards, and `ci-summary` |
| Local service builds | N/A — workflow-only change |
| GitHub Actions on this PR | Pending — workflow files changed, so **all service jobs should run** |

### Post-merge verification checklist

1. Open a docs-only PR → only `Detect changes` + `CI Summary` should run
2. Open a frontend-only PR → frontend job only (+ summary)
3. Open a backend-only PR → backend job only (+ summary)
4. Push to `develop` → all jobs run

## Not included

- No backend, frontend, or payment-service code changes
- No Phase 1c work
- No product behavior changes