# Single-Tenant Branch Preservation

**Branch created:** `single-tenant`  
**Source:** `main` at `2e0f287` (Merge pull request #39)  
**Date:** 2026-06-18  
**CI/docs PR:** `fix/add-single-tenant-branch-to-ci`

## Why `single-tenant` exists

The repository is evolving from the original single-tenant Smart Parking product into a multi-tenant SaaS platform on `develop`. The `single-tenant` branch preserves the **original stable single-tenant codebase** from `main` so it remains:

- Available for deployments that still run the legacy product
- Testable via the same CI pipeline
- Protected from accidental SaaS refactors

## Branch policy

```text
single-tenant = preserved original single-tenant codebase
develop       = active SaaS / multi-tenant development
main          = future stable release branch
```

### Critical rule

**Never merge `develop` into `single-tenant`.**

`develop` contains multi-tenant schema, tenant scoping, and SaaS features that must not pollute the preserved single-tenant line.

## Hotfix policy

```text
Only create hotfix branches from single-tenant.
Open PR back into single-tenant.
Do not merge develop into single-tenant.
Do not cherry-pick SaaS/multi-tenant changes into single-tenant unless explicitly required.
```

Example flow:

```text
single-tenant
  └── hotfix/single-tenant-<issue>
        └── PR → single-tenant
```

## CI trigger update

`.github/workflows/ci.yml` now includes `single-tenant` in `pull_request` and `push` triggers alongside `main` and `develop`.

| Event | Behavior |
|-------|----------|
| PR → `main` | CI runs (path-based on PR; see `ci-path-based-jobs.md`) |
| PR → `develop` | CI runs (path-based on PR) |
| PR → `single-tenant` | CI runs (path-based on PR) |
| Push → `main` | Full CI |
| Push → `develop` | Full CI |
| Push → `single-tenant` | Full CI (protected archival branch) |

Path-based filtering from PR #52 is preserved. Push events to `single-tenant` always run all service jobs.

## GitHub ruleset / branch protection checklist

Apply manually in **GitHub → Settings → Rules → Rulesets** (or branch protection rules).

**Target branch:** `single-tenant`

Enable:

- [ ] Require pull request before merge
- [ ] Require status checks to pass
- [ ] Block force pushes
- [ ] Block branch deletion
- [ ] Restrict direct pushes (if available)
- [ ] Require branch to be up to date before merge (if available)

**Recommended required status check:** `CI Summary`

If `CI Summary` is not yet available in the repository, temporarily require:

- `NestJS Backend`
- `React Frontend`
- `Spring Boot Payment Service`

Switch to `CI Summary` once path-based CI is fully deployed on all active branches.

## Validation

| Check | Result |
|-------|--------|
| `single-tenant` created from `main` | ✅ Pushed to `origin/single-tenant` |
| No file changes on `single-tenant` | ✅ Branch is a snapshot of `main` |
| CI workflow includes `single-tenant` | ✅ Pending merge of `fix/add-single-tenant-branch-to-ci` |
| `develop` not merged into `single-tenant` | ✅ |

```bash
git ls-remote --heads origin single-tenant
```

## Not included

- No backend, frontend, or payment-service code changes
- No Phase 1c work
- No merge from `develop` into `single-tenant`