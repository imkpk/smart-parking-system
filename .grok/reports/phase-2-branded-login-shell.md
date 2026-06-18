# Phase 2 Branded Login and App Shell

**Status:** In progress (LOOP 2D)
**Branch:** `feature/phase-2-branded-login-shell`
**Scope:** Visible tenant branding on login and app shell

## Summary

Applied tenant branding to the login experience and authenticated app shell using `useTenantBranding()` and tenant slug route resolution.

## Changes

- `AuthPageShell` shows tenant logo, name, login title, support email, and branding warnings
- `LoginPage` resolves tenant slug from `/login/:tenantSlug` or `?tenant=` query
- `AppLogo` accepts tenant `name` and `logoUrl`
- `AppLayout` sidebar/header uses authenticated organization branding
- Router adds `/login/:tenantSlug`

## Tests

- `LoginPage.branding.test.tsx` — fallback, tenant branding, unknown slug safety
- Updated auth/layout/router tests with branding mocks

## Validation

```bash
cd frontend
npm run build
npm run test:run
```