# Feature: Tenant Self-Service Onboarding + Platform Super Admin

**Date:** 2026-06-20  
**Branch:** `feature/tenant-self-service-onboarding`  
**PR:** feat(saas): add tenant self-service onboarding and platform super admin  
**Base:** `develop` (not merged — per instruction)

## Summary

Implemented public tenant self-service signup (organization + first `TENANT_ADMIN`), platform `SUPER_ADMIN` bootstrap script, role-safe user management APIs, and frontend auth/UX updates including Indian phone normalization, password visibility toggles, and a SUPER_ADMIN platform placeholder.

## Backend changes

- **Public `/auth/register`** creates `Organization` + first `TENANT_ADMIN` in a transaction; ignores client role; never uses `DEFAULT_ORGANIZATION_ID`.
- **Organization type** column added (`organization_type` / `ParkingLotType`).
- **Unique slug** generation with numeric suffix when slug collides.
- **Login** resolves active users by email globally; supports `SUPER_ADMIN` with `organizationId = null`; rejects ambiguous multi-tenant email/password matches.
- **`npm run seed:super-admin`** upserts platform owner from `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`.
- **`POST /users`** with role rules: `TENANT_ADMIN` → `ADMIN|SECURITY|USER`; `ADMIN` → `SECURITY|USER`; blocks `SUPER_ADMIN` / `TENANT_ADMIN` creation from API.
- **`GET /users/summary`** for `TENANT_ADMIN` and `ADMIN`.
- **Permissions:** `TENANT_ADMIN` added to parking lot/floor/slot mutate routes and dashboard admin-summary endpoints.
- **Access policy:** `isTenantManager` treats `TENANT_ADMIN` like admin for operational scoping helpers.

## Frontend changes

- **Register page:** organization name/type, full name, email, +91 phone UX, password toggle; no role field sent.
- **Login page:** password show/hide toggle.
- **Routing:** `SUPER_ADMIN` → `/platform/admin` placeholder; `TENANT_ADMIN`/`ADMIN` → `/admin/dashboard`.
- **Nav:** separate Platform Admin vs Admin Dashboard entries.
- **Dashboard:** `UserSummaryCard` via `GET /users/summary` on tenant admin dashboard.

## SUPER_ADMIN bootstrap

```bash
cd backend
set SUPER_ADMIN_NAME=Platform Owner
set SUPER_ADMIN_EMAIL=you@example.com
set SUPER_ADMIN_PASSWORD=your-32-char-minimum-password
npm run seed:super-admin
```

## Public signup behavior

Request fields: `organizationName`, `organizationType`, `name`, `email`, `phone` (optional `+91XXXXXXXXXX`), `password`.

Creates isolated organization + `TENANT_ADMIN`. Returns `{ user, accessToken }` unchanged.

## Validation results

```bash
cd backend && npm run build && npm run test:run   # 31 suites, 327 tests passed
cd frontend && npm run build                        # passed
cd frontend && npx vitest run src/test/pages/auth/RegisterPage.test.tsx src/test/lib/routes.test.ts  # passed
```

## Manual test checklist

- [ ] Run `npm run seed:super-admin` with env vars
- [ ] SUPER_ADMIN login with `organizationId = null`
- [ ] SUPER_ADMIN lands on `/platform/admin` placeholder
- [ ] Public signup creates new org + TENANT_ADMIN
- [ ] New tenant does not see demo/default org data
- [ ] TENANT_ADMIN can manage lots/floors/slots and security gate
- [ ] TENANT_ADMIN can create ADMIN/SECURITY/USER via `POST /users`
- [ ] ADMIN cannot create TENANT_ADMIN or SUPER_ADMIN
- [ ] Phone stored as `+91XXXXXXXXXX`
- [ ] Password toggles on login/signup
- [ ] Existing demo logins still work

## Known limitations

- Full platform SUPER_ADMIN tenant management UI not built (placeholder only).
- Duplicate email across multiple organizations returns conflict at login (by design).
- No automated E2E for signup flow in this PR.
- PR opened to `develop` but **not merged** per workflow instruction.

## Files (high level)

- `backend/src/auth/*`, `backend/src/users/*`, `backend/prisma/*`
- `frontend/src/pages/auth/*`, `frontend/src/pages/platform/*`, `frontend/src/router.tsx`
- `.grok/prompts/feature-tenant-self-service-onboarding.md`