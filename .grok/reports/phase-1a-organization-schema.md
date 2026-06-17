# Phase 1a — Organization Schema & Tenant Columns

**Status:** Merged ([#40](https://github.com/imkpk/smart-parking-system/pull/40))  
**Branch:** `feature/phase-1a-organization-schema` (merged to `develop`)  
**Commits:** `6a8590b` (schema), `7849a03` (admin login fix), `afb197c` (dev build fix)

## 1. Scope

Introduce multi-tenant data model foundation in the backend:

- `Organization` model with plan limits and white-label fields (for Phase 2)
- Expanded `Role` enum: `SUPER_ADMIN`, `TENANT_ADMIN`
- `organizationId` on direct tenant-scoped tables (see §3)
- Migration with default org backfill for existing data
- Prisma seed for default organization
- Service wiring: new records connect to default org; per-tenant unique constraints

**Explicitly deferred to Phase 1b–1d:** TenantGuard, JWT `organizationId` claims, query scoping on list endpoints, tenant onboarding API, frontend tenant context.

## 2. Files changed

**New**
- `backend/prisma/migrations/20260617220000_phase_1a_organizations/migration.sql`
- `backend/prisma/seed.ts`
- `backend/src/organizations/organizations.constants.ts`

**Updated**
- `backend/prisma/schema.prisma` — `Organization` model, `OrganizationPlan` enum, expanded `Role`, `organizationId` FKs
- `backend/package.json` — `prisma.seed` config, `prisma:seed` script
- `backend/src/auth/auth.service.ts` — register connects `organization: { id: 1 }`
- `backend/src/parking-lots/parking-lots.service.ts` — create connects default org
- `backend/src/vehicles/vehicles.service.ts` — resolve org from owner user; per-org unique vehicle number
- `backend/src/bookings/bookings.service.ts` — require `currentUser.organizationId` on create
- `backend/src/parking-events/parking-events.service.ts` — copy `organizationId` from booking on check-in
- `backend/src/users/users.service.ts` — `SafeUser.organizationId`; composite unique error messages
- `backend/src/users/types/safe-user.type.ts` — `organizationId: number | null`
- `backend/src/test/test-users.ts` — fixtures include `organizationId`
- Service specs: auth, users, parking-lots, vehicles, bookings, parking-events
- `MASTER_PROMPT.md` — status/changelog for Phase 1a

## 3. Schema changes

### Organization model

| Field | Purpose |
|-------|---------|
| `name`, `slug` | Tenant identity (`slug` unique) |
| `logoUrl`, `primaryColor` | White-label placeholders (Phase 2) |
| `plan` | `STARTER` / `PRO` / `ENTERPRISE` |
| `maxParkingLots`, `maxUsers` | Plan limits |
| `isActive` | Soft disable |

### Role enum expansion

`SUPER_ADMIN`, `TENANT_ADMIN` added alongside existing `ADMIN`, `SECURITY`, `USER`. Existing rows keep current roles; migration only widens the enum.

### Tenant-scoped tables

**Direct `organizationId` column** on: `User` (nullable — platform roles may omit org later), `ParkingLot`, `Vehicle`, `Booking`, `ParkingEvent`, and `SlotAssignment`.

**No direct `organizationId` in Phase 1a:** `Floor` and `ParkingSlot` (`Slot`). They inherit tenant context through their parent `ParkingLot` (`Floor.parkingLotId` → `ParkingLot.organizationId`). Explicit `organizationId` on floor/slot rows and query scoping for those tables are deferred to **Phase 1b**.

### Per-tenant unique constraints

| Table | Old unique | New unique |
|-------|------------|------------|
| `users` | `email`, `phone` (global) | `(organizationId, email)`, `(organizationId, phone)` |
| `vehicles` | `registrationNo` (global) | `(organizationId, registrationNo)` |

## 4. Migration behavior

1. Creates `organizations` table
2. Inserts default org: `id=1`, `slug=default`, `name=Default Organization`
3. Adds `organizationId` columns; backfills from related rows or defaults to `1`
4. Replaces global unique indexes with per-organization composites
5. Adds FK constraints `ON DELETE RESTRICT`

**Post-deploy:** `npx prisma migrate deploy` then `npm run prisma:seed` (idempotent upsert of default org).

## 5. Service wiring

| Service | Behavior |
|---------|----------|
| `AuthService.register` | Connects new user to `DEFAULT_ORGANIZATION_ID` (1) |
| `ParkingLotsService.create` | Connects lot to default org |
| `VehiclesService.create` | Looks up owner's `organizationId`; throws if missing |
| `BookingsService.create` | Requires `currentUser.organizationId` |
| `ParkingEventsService.checkIn` | Sets `organizationId` from booking |
| `UsersService` | Exposes `organizationId` in `SafeUser`; maps composite P2002 messages |

Constants: `DEFAULT_ORGANIZATION_ID = 1`, `DEFAULT_ORGANIZATION_SLUG = 'default'`.

## 6. Tests updated

- Fixtures (`test-users.ts`) include `organizationId`
- `vehicles.service.spec` — org from user, missing-org rejection, composite unique message
- `bookings.service.spec` — missing `organizationId` on create
- `parking-events.service.spec` — `organizationId` propagated from booking
- `auth.service.spec` — register connects default org

## 7. Build & test result

```text
cd backend && npm run test:cov
Test Suites: 17 passed, 17 total
Tests:       198 passed, 198 total
Coverage:    100% statements/branches/functions/lines
```

Frontend unchanged — no frontend build required for this phase.

## 8. CI

PR #40 — GitHub Actions **green** (build + backend `test:cov` + frontend tests).

## 9. Manual verification steps

| Step | Command / action |
|------|------------------|
| Apply migration | `cd backend && npx prisma migrate deploy` |
| Seed default org | `npm run prisma:seed` |
| Smoke create | Register user → create lot → vehicle → booking → check-in (all should have `organizationId = 1`) |

## 10. Pending / next (Phase 1b)

- `TenantGuard` + Prisma middleware for automatic query scoping
- JWT payload: `organizationId`, role-aware claims
- `SUPER_ADMIN` cross-tenant access; `TENANT_ADMIN` org admin behavior
- Tenant onboarding API (create org + first admin)
- Frontend `AuthProvider` tenant context
- **Exit criteria:** two orgs in DB see completely separate data on list/read endpoints

## Admin login regression fix

### Problem

Phase 1a replaced global `findUnique({ email })` / `findUnique({ phone })` with unscoped `findFirst({ email })` / `findFirst({ phone })` after composite uniqueness `(organizationId, email)` landed. Login and registration duplicate checks became non-deterministic: a matching email in another organization (or the wrong row when multiple orgs exist) could be returned instead of the default-org ADMIN/USER record, causing "Invalid email or password" for credentials that worked on `develop`.

### Fix

Scoped `UsersService.findByEmail()` and `findByPhone()` to `DEFAULT_ORGANIZATION_ID` (1) so Phase 1a login remains email/password only with no tenant slug or `organizationId` input. Auth response shape unchanged (`user` + `accessToken`; JWT still `sub`, `email`, `role`).

### Validation

```text
cd backend
npx prisma validate   — schema valid
npx prisma generate   — client generated
npm run build         — success
npm run test:cov      — 198/198 passed, 100% coverage
```

Local MySQL was not used for `migrate deploy` / `prisma:seed` in this fix session; migration backfill (`UPDATE users SET organizationId = 1`) remains the source of truth for existing ADMIN rows.

### Manual verification

After `npx prisma migrate deploy` and `npm run prisma:seed`:

1. `POST /api/auth/login` with existing ADMIN credentials (`admin@example.com` / seeded password) → `200`, `accessToken` + `user.organizationId = 1`
2. Same for existing USER login → `200`
3. `GET /api/auth/me` with returned token → active user payload
4. No frontend or payment-service changes required