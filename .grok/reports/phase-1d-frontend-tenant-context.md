# Phase 1d - Frontend Tenant Context

**Status:** Merged (PR #68)
**Branch:** `feature/phase-1d-frontend-tenant-context`
**Scope:** Frontend auth tenant context, minimal backend auth response enrichment, tests, and reports

## Summary

Phase 1d adds tenant-aware auth state to the React frontend. Authenticated users now carry `organizationId` and an optional organization summary through `AuthProvider`, while existing ADMIN/SECURITY/USER flows continue to work. SUPER_ADMIN and TENANT_ADMIN roles are represented in frontend types, route guards, and home redirects without adding white-label UI.

## Frontend files changed

- `frontend/src/types/auth.ts`
- `frontend/src/providers/AuthProvider.tsx`
- `frontend/src/hooks/useUserRole.ts`
- `frontend/src/lib/routes.ts`
- `frontend/src/lib/formatRole.ts`
- `frontend/src/router.tsx`
- `frontend/src/components/layout/AppLayout.tsx`
- `frontend/src/test/test-utils.tsx`
- `frontend/src/test/providers/AuthProvider.test.tsx`
- `frontend/src/test/components/auth/RoleHomeRedirect.test.tsx`
- `frontend/src/test/components/auth/routeGuards.test.tsx`
- `frontend/src/test/hooks/useUserRole.test.ts`
- `frontend/src/test/lib/routes.test.ts`
- `frontend/src/test/lib/formatRole.test.ts`

## Auth state changes

`AuthProvider` now exposes:

```ts
organizationId: number | null;
organization: OrganizationSummary | null;
```

Tenant context is derived from the authenticated `user` returned by login and `/auth/me`. Logout clears auth queries and tenant context with the existing token reset path.

## Type changes

- `Role` now includes `SUPER_ADMIN` and `TENANT_ADMIN`.
- `User` includes `organizationId: number | null`.
- Optional `organization` summary includes `id`, `name`, and `slug`.

## Route and guard behavior

- `getRoleHomePath()` sends SUPER_ADMIN, TENANT_ADMIN, and ADMIN to `/admin/dashboard`.
- Router and sidebar nav allow TENANT_ADMIN on tenant-operational routes previously limited to ADMIN.
- SUPER_ADMIN can access the admin dashboard route for safe platform-user handling until a dedicated platform console exists.
- Existing ADMIN/SECURITY/USER redirects and guards remain unchanged.

## Backend compatibility change

Minimal backward-compatible auth response enrichment:

- `SafeUser` now includes optional `organization`.
- `UsersService.findActiveById()` includes organization `id`, `name`, and `slug`.
- `AuthService.login()` and `AuthService.register()` return the enriched active user from `findActiveById()`.

No API contract break: existing clients still receive the same user fields plus optional `organization`.

## Tests added or updated

Frontend:

- AuthProvider stores and clears tenant context.
- Missing organization data does not crash auth state.
- Role home redirects for SUPER_ADMIN and TENANT_ADMIN.
- RoleRoute allows TENANT_ADMIN on tenant-admin routes.
- `useUserRole` recognizes new platform/tenant roles.
- `getRoleHomePath` and `formatRole` cover new roles.

Backend:

- Auth service uses enriched active-user lookup on login/register.
- Users service spec updated for organization include on `findActiveById()`.
- Added auth failure tests when active-user lookup returns null after register/login.

## Validation

```text
cd frontend
npm run build       - passed
npm run test:run    - passed (296 tests)

cd backend
npm run build       - passed
npm run test:cov    - passed (20 suites, 234 tests)
```

E2E smoke was not changed because login paths and default-org demo credentials are unchanged.

## Deferred to Phase 2

- Per-tenant branding, logo, and theme switching.
- Tenant admin settings page.
- SUPER_ADMIN platform console UI.
- Tenant onboarding UI.
- Subscription billing and plan enforcement.