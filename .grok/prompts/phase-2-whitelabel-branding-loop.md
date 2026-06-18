You are working in:

`https://github.com/imkpk/smart-parking-system`

You are the implementation agent. Work autonomously in a loop. Do not ask the human for routine approvals. Only stop on a real blocker.


Goal:
Complete Phase 2 — White-label branding.

Current project status:

* Phase 1 is complete.
* Phase 1A Organization schema verification is merged.
* Phase 1B Backend tenant scoping verification is merged.
* Phase 1C Tenant onboarding API is merged.
* Phase 1D Frontend tenant context is merged.
* Phase 1 tenant isolation acceptance is merged.
* `develop` is the active SaaS branch.
* `single-tenant` is preserved and must not be touched.

Phase 2 product goal:
Make the app feel like a tenant-branded SaaS product without starting dashboard, slot-map, security-gate, billing, or enterprise integration work.

Phase 2 must deliver:

* Tenant branding data model/API.
* Public tenant branding lookup for login/pre-auth pages.
* Authenticated current-tenant branding lookup.
* SUPER_ADMIN/TENANT_ADMIN branding update capability.
* Frontend branding context/provider.
* Tenant-aware MUI theme tokens.
* Branded login page.
* Branded app shell/sidebar/header.
* Tenant admin branding settings screen.
* Tests and smoke coverage proving Tenant A and Tenant B branding do not leak into each other.

Repository rules:

* Always start each loop from fresh `develop`.
* Read `MASTER_PROMPT.md` and `.grok/AGENTS.md` before every loop.
* Keep each loop as a separate branch and PR.
* Open PRs to `develop` early.
* Enable auto-merge when branch protection allows.
* Do not idle-wait for CI — start the next loop branch while checks run.
* Fix CI failures on open PRs (max 3 attempts per issue).
* Merge when CI is green, PR is mergeable, and there are no unresolved blocking comments.
* Fetch latest `develop` before opening dependent PRs; never leave stale PRs across phase boundaries.
* Pull latest `develop` after every merge before starting work that depends on it.
* Never merge `develop` into `single-tenant`.
* Never modify `single-tenant`.
* Do not change `payment-service`.
* Do not start Phase 3 dashboard work.
* Do not start visual slot map.
* Do not start mobile security gate.
* Do not start subscription billing.
* Do not start enterprise integrations.
* Keep changes focused and commercial-quality.

Technical rules:

* Reuse existing MUI 7 design system.
* Do not introduce a random UI template.
* Do not add heavy theme frameworks.
* Do not store uploaded binary logo files in the repo or database in this phase.
* Use logo URL/string configuration unless the existing app already has a safe asset-upload pattern.
* Validate color inputs.
* Always provide safe default branding.
* Public branding endpoint must expose only safe display fields.
* Tenant branding must never expose private organization/user/payment data.
* Tenant A branding must not appear for Tenant B.
* Existing default demo org must continue to work.
* Existing login for ADMIN, SECURITY, USER, TENANT_ADMIN, SUPER_ADMIN must continue to work.

Autonomous loop protocol:

1. Sync `develop` (`git fetch && git pull origin develop`).
2. Create the branch for the current loop.
3. Make only scoped changes.
4. Run fast local validation (`npm run build` + `npm run test:run` for touched services).
5. Commit and push.
6. Open PR to `develop` early.
7. Enable auto-merge when possible (`gh pr merge <n> --auto --squash` or `--merge`).
8. Start the next loop branch immediately — do not idle-wait for CI.
9. Before opening a dependent PR, fetch latest `develop` and merge/rebase if needed.
10. If CI fails on an open PR, inspect logs, fix, push again (max 3 attempts per issue).
11. Merge stacked PRs in dependency order (base slice before dependent slice).
12. Pull latest `develop` after a merge before starting work that depends on it.

PR CI = fast gates (build + unit tests). Full coverage + Cypress = `develop` push after merge. See `.grok/reports/ci-fast-pr-gates-and-agent-flow.md`.

Stop only if:

* GitHub permissions prevent branch/PR/merge.
* CI fails after 3 fix attempts on the same issue.
* Required product decision is genuinely ambiguous.
* Existing schema/API prevents safe tenant branding without a larger design decision.
* Tenant isolation cannot be preserved safely.
* Merge conflict cannot be resolved safely.

Stop report format:

Stopped at: LOOP __
Branch:
PR:
CI status:
Failure:
What I tried:
Recommended next action:

============================================================
LOOP 2A — White-label Branding Strategy and Contract
====================================================

Branch:

`docs/phase-2-whitelabel-branding-contract`

PR title:

`docs(phase-2): define white-label branding contract`

Scope:
Docs/spec only. No runtime code unless correcting broken documentation links.

Read:

* `MASTER_PROMPT.md`
* `.grok/AGENTS.md`
* `.grok/reports/phase-1-tenant-isolation-acceptance.md`
* `frontend/src/providers/AuthProvider.tsx`
* frontend theme/design-system files
* backend Organization schema/service/controller files
* existing route and role guard structure

Create:

`.grok/reports/phase-2-whitelabel-branding-contract.md`

Update:

* `.grok/reports/README.md`
* `MASTER_PROMPT.md`

Define Phase 2 branding contract:

Branding fields should support, at minimum:

* organization display name
* logo URL
* primary color
* secondary color
* accent color
* login heading/title
* optional support email or footer text if suitable
* safe fallback defaults

Define backend API plan:

* public safe branding lookup by organization slug
* authenticated current organization branding lookup
* SUPER_ADMIN/TENANT_ADMIN branding update endpoint
* validation rules
* tenant isolation rules

Define frontend plan:

* BrandProvider or TenantBrandingProvider
* useTenantBranding hook
* theme token application
* branded login page
* branded app shell/sidebar/header
* tenant admin branding settings screen
* fallback behavior when branding is missing

Define acceptance criteria:

* Tenant A login/app shell shows Tenant A branding.
* Tenant B login/app shell shows Tenant B branding.
* Unknown tenant slug falls back safely or shows controlled not-found state.
* Authenticated user does not see another tenant’s branding.
* SUPER_ADMIN/TENANT_ADMIN can update allowed branding fields.
* ADMIN/SECURITY/USER cannot update branding.
* Existing default demo works.

Validation:

* Docs-only PR can run lightweight validation if available.
* At minimum run repo lint/build only if docs tooling requires it.

Commit:

`docs(phase-2): define white-label branding contract`

Open PR, wait for CI, fix if needed, merge, pull latest `develop`.

============================================================
LOOP 2B — Backend Branding Model and API
========================================

Branch:

`feature/phase-2-backend-branding-api`

PR title:

`feat(backend): add tenant branding API`

Scope:
Backend + docs/reports only.

Do not change frontend product UI in this loop.
Do not touch payment-service.
Do not add file upload.
Do not start billing/dashboard/slot-map work.

Read:

* Phase 2 branding contract report
* `backend/prisma/schema.prisma`
* `backend/src/organizations`
* `backend/src/auth`
* `backend/src/common/access-policy.service.ts`
* existing DTO/validation/error patterns
* existing tests

Implement backend branding model.

Preferred approach:

* Add branding fields to `Organization` if this is the simplest, cleanest approach.
* Use a separate `OrganizationBranding` model only if it clearly fits the existing architecture better.
* Avoid over-engineering.

Suggested Organization fields:

* `logoUrl String?`
* `primaryColor String?`
* `secondaryColor String?`
* `accentColor String?`
* `loginTitle String?`
* `supportEmail String?`

Adjust exact field names to match project style.

Validation:

* Colors must be valid hex colors if provided.
* Logo URL must be a safe URL/string or empty.
* Text fields must have reasonable max lengths.
* Public endpoint returns only safe branding fields.
* No private organization metadata should leak.

Required APIs:

* Public safe branding lookup by slug, for example:

  * `GET /organizations/public-branding/:slug`
* Authenticated current organization branding lookup, for example:

  * `GET /organizations/current/branding`
* Branding update endpoint:

  * `PATCH /organizations/current/branding`
  * Allowed for SUPER_ADMIN and TENANT_ADMIN.
  * Forbidden for ADMIN, SECURITY, USER.
  * SUPER_ADMIN behavior must be tenant-safe and consistent with existing organization context rules.

Required tests:

* Public branding lookup returns safe fields only.
* Public branding lookup works by slug.
* Unknown slug returns controlled 404 or safe response.
* Authenticated current branding returns current user organization branding.
* TENANT_ADMIN can update own org branding.
* SUPER_ADMIN can update according to existing access rules.
* ADMIN cannot update branding.
* SECURITY cannot update branding.
* USER cannot update branding.
* Tenant A cannot update Tenant B branding.
* Invalid colors rejected.
* passwordHash/private user fields never appear.
* Existing auth tests still pass.

Update/create:

`.grok/reports/phase-2-backend-branding-api.md`

Update:

* `.grok/reports/README.md`
* `MASTER_PROMPT.md`

Validation:

```bash
cd backend
npx prisma validate
npm run build
npm run test:cov
```

Commit:

`feat(backend): add tenant branding API`

Open PR, wait for CI, fix if needed, merge, pull latest `develop`.

============================================================
LOOP 2C — Frontend Branding Provider and Theme Foundation
=========================================================

Branch:

`feature/phase-2-frontend-branding-provider`

PR title:

`feat(frontend): add tenant branding provider`

Scope:
Frontend branding infrastructure only.

Do not build the settings screen yet.
Do not redesign the full app.
Do not add dashboard/slot-map/security-gate work.
Do not touch payment-service.

Read:

* Phase 2 backend branding report
* `frontend/src/providers/AuthProvider.tsx`
* frontend API client/factory files
* frontend route helpers
* frontend MUI theme files
* frontend layout/app shell files
* frontend tests

Implement frontend branding foundation:

* Add branding API client/types.
* Add `TenantBrandingProvider` or equivalent.
* Add `useTenantBranding` hook.
* Add default/fallback branding constants.
* Add tenant slug resolution strategy for pre-auth pages.
* Store selected tenant slug safely if needed.
* Apply branding tokens to MUI theme in a controlled way.
* Keep default theme stable when no tenant branding exists.
* Do not crash if backend branding endpoint is unavailable.
* Ensure authenticated organization context and branding context do not conflict.

Required frontend types:

* Branding object includes org/tenant display name and theme fields.
* All fields optional where backend may return null.
* Safe defaults are always available.

Required tests:

* Provider returns default branding when no tenant slug exists.
* Provider fetches public branding when tenant slug exists.
* Provider exposes current organization branding for authenticated user where applicable.
* Invalid/missing branding does not crash.
* Theme token application preserves usable UI.
* Logout does not leak previous tenant branding into another session.
* Role redirects from Phase 1D still pass.

Update/create:

`.grok/reports/phase-2-frontend-branding-provider.md`

Update:

* `.grok/reports/README.md`
* `MASTER_PROMPT.md`

Validation:

```bash
cd frontend
npm run build
npm run test:run
```

If backend contract/types were touched:

```bash
cd backend
npm run build
npm run test:cov
```

Commit:

`feat(frontend): add tenant branding provider`

Open PR, wait for CI, fix if needed, merge, pull latest `develop`.

============================================================
LOOP 2D — Branded Login and App Shell
=====================================

Branch:

`feature/phase-2-branded-login-shell`

PR title:

`feat(frontend): add branded login and app shell`

Scope:
Frontend visible branding surfaces.

Do not add branding settings screen yet.
Do not start dashboard redesign.
Do not start visual slot map.
Do not touch payment-service.

Read:

* Phase 2 frontend branding provider report
* Login/Register/Auth pages
* App shell/sidebar/header/nav layout
* role-based navigation
* current Cypress smoke tests
* existing screenshots/design conventions if present

Implement:

* Branded login experience using tenant branding.
* Support tenant slug in route/query/local selection according to Phase 2 contract.
* Show tenant logo if configured.
* Show tenant display name/login title if configured.
* Use safe fallback for default app.
* App shell/sidebar/header should show tenant name/logo where appropriate.
* Keep premium, clean SaaS look.
* Ensure labels/inputs remain readable.
* Ensure mobile/responsive layout does not regress.
* Ensure ADMIN, SECURITY, USER, TENANT_ADMIN, SUPER_ADMIN layouts remain safe.
* Do not expose branding controls in this loop.

Required tests:

* Login page renders fallback branding.
* Login page renders tenant branding when slug is present.
* App shell renders authenticated organization branding.
* Unknown tenant slug does not crash login page.
* Existing auth smoke tests pass.
* Route/nav guards still pass.

Cypress:

* Update smoke only if login/auth selectors or visible flow changed.
* Add a small smoke check for branded login if deterministic.
* Do not make E2E flaky.

Update/create:

`.grok/reports/phase-2-branded-login-shell.md`

Update:

* `.grok/reports/README.md`
* `MASTER_PROMPT.md`

Validation:

```bash
cd frontend
npm run build
npm run test:run
npm run e2e:smoke
```

Commit:

`feat(frontend): add branded login and app shell`

Open PR, wait for CI, fix if needed, merge, pull latest `develop`.

============================================================
LOOP 2E — Tenant Branding Settings UI
=====================================

Branch:

`feature/phase-2-branding-settings-ui`

PR title:

`feat(frontend): add tenant branding settings UI`

Scope:
Frontend settings UI + any small backend compatibility fix if needed.

Do not build full SUPER_ADMIN platform console.
Do not build billing.
Do not start dashboard/slot-map/security-gate.
Do not touch payment-service.

Read:

* Phase 2 backend branding API report
* Phase 2 frontend branding provider report
* existing admin/settings/navigation patterns
* existing form/dialog patterns
* existing auth role guard tests

Implement tenant branding settings screen:

* Accessible to TENANT_ADMIN.
* Accessible to SUPER_ADMIN if consistent with current routing/access model.
* Not accessible to ADMIN, SECURITY, USER.
* Allow editing safe branding fields:

  * logo URL
  * primary color
  * secondary color
  * accent color
  * login title/display text
  * support email if implemented
* Show preview before/after save if simple.
* Validate hex colors client-side.
* Show clear error messages.
* Save via branding API.
* Refresh branding context after successful save.
* Keep UX simple and premium.
* No file upload in this phase.

Required tests:

* TENANT_ADMIN can see branding settings nav/screen.
* ADMIN/SECURITY/USER cannot see or access branding settings.
* Form loads existing branding.
* Invalid color shows validation error.
* Successful save calls API and updates context.
* Failed save shows error.
* Logout/login does not leak previous branding.

Cypress:

* Add smoke if deterministic:

  * tenant admin opens branding settings
  * changes a harmless test branding field
  * sees updated preview/app shell
* Avoid fragile color pixel assertions.

Update/create:

`.grok/reports/phase-2-branding-settings-ui.md`

Update:

* `.grok/reports/README.md`
* `MASTER_PROMPT.md`

Validation:

```bash
cd frontend
npm run build
npm run test:run
npm run e2e:smoke
```

If backend was touched:

```bash
cd backend
npm run build
npm run test:cov
```

Commit:

`feat(frontend): add tenant branding settings UI`

Open PR, wait for CI, fix if needed, merge, pull latest `develop`.

============================================================
FINAL LOOP — Phase 2 White-label Acceptance
===========================================

Branch:

`verify/phase-2-whitelabel-acceptance`

PR title:

`test(phase-2): verify white-label branding acceptance`

Scope:
Acceptance tests + docs/report. Small bug fixes allowed only if acceptance finds real Phase 2 gaps.

Do not start Phase 3.
Do not touch payment-service.
Do not add billing.
Do not add slot map/security gate/dashboard features.

Acceptance criteria:

* Tenant A can have branding config.
* Tenant B can have different branding config.
* Tenant A login page shows Tenant A branding.
* Tenant B login page shows Tenant B branding.
* Unknown tenant slug behaves safely.
* Authenticated Tenant A user sees Tenant A app shell branding.
* Authenticated Tenant B user sees Tenant B app shell branding.
* Tenant A users cannot read/update Tenant B branding through authenticated APIs.
* TENANT_ADMIN can update own branding.
* ADMIN/SECURITY/USER cannot update branding.
* Default organization/demo mode still works.
* Existing Cypress smoke remains green.
* No payment-service changes.
* No Phase 3 features introduced.

Add/adjust tests:

* Backend tenant branding isolation acceptance tests.
* Frontend branded login/app shell acceptance tests.
* Frontend role guard tests for branding settings.
* Cypress smoke if stable and deterministic.

Create final report:

`.grok/reports/phase-2-whitelabel-acceptance.md`

Update:

* `.grok/reports/README.md`
* `MASTER_PROMPT.md`

MASTER_PROMPT must mark Phase 2 complete only if acceptance passes.

Validation:

```bash
cd backend
npm run build
npm run test:cov

cd ../frontend
npm run build
npm run test:run
npm run e2e:smoke
```

Commit:

`test(phase-2): verify white-label branding acceptance`

Open PR, wait for CI, fix if needed, merge only when green.

============================================================
FINAL REPORT
============

After all Phase 2 loops are merged, report:

Phase 2 status:

* 2A branding contract:
* 2B backend branding API:
* 2C frontend branding provider:
* 2D branded login/app shell:
* 2E branding settings UI:
* Acceptance:

PR links:
Validation:
Known deferred work:
Next recommended phase:

Known deferred work should include:

* full SUPER_ADMIN platform console if not implemented
* file upload/logo asset management
* custom domain support
* subscription billing/plan limits
* payment-service tenant linkage
* Phase 3 operator dashboard
* Phase 4 visual slot map
* Phase 5 mobile security gate

Next recommended phase after successful Phase 2 acceptance:

`Phase 3 — Operator Dashboard`

Do not start Phase 3 until the human explicitly approves.
