# Phase 1b — Backend Tenant Scoping Enforcement

**Status:** PR open  
**Branch:** `feature/phase-1b-tenant-scoping-backend`

## 1. Scope

Enforce organization-scoped reads/writes on the backend using Phase 1a `organizationId` columns. Login remains email/password only; no tenant slug, onboarding API, frontend changes, or payment-service changes.

## 2. Files changed

**New**
- `backend/src/test/test-tenant-fixtures.ts` — org1/org2 lot, floor, slot, vehicle, booking, event fixtures

**Updated — auth**
- `backend/src/auth/types/jwt-payload.type.ts` — `organizationId` on payload
- `backend/src/auth/auth.service.ts` — sign JWT with `organizationId`
- `backend/src/auth/auth.service.spec.ts`

**Updated — access policy**
- `backend/src/common/access-policy.service.ts` — org helpers and scoped `where` builders
- `backend/src/common/access-policy.service.spec.ts`

**Updated — validation**
- `backend/src/parking-lots/parking-lot-validation.service.ts` — require `organizationId` on lot/floor/slot lookups

**Updated — services + controllers**
- `parking-lots`, `floors`, `slots`, `vehicles`, `bookings`, `parking-events`, `dashboard`
- `slot-lifecycle.service.ts` — `validateSlotAvailable` takes `organizationId`
- All related `*.spec.ts`, `controllers.spec.ts`, `infrastructure.spec.ts`

**Updated — test fixtures**
- `backend/src/test/test-users.ts` — org2 users, security user
- `backend/src/organizations/organizations.constants.ts` — `OTHER_ORGANIZATION_ID = 2`

## 3. JWT / auth changes

JWT payload (additive, frontend-compatible):

```ts
{ sub, email, role, organizationId }
```

`organizationId` is `null` when the user record has no org. Login/register response shape unchanged (`user` + `accessToken`). JwtStrategy still loads user from DB by `sub`.

## 4. Access policy changes

New helpers on `AccessPolicyService`:

| Method | Purpose |
|--------|---------|
| `getRequiredOrganizationId` | Throws if user has no org (tenant ops) |
| `canAccessOrganization` | Same-org check |
| `assertSameOrganization` | Forbidden on cross-org |
| `buildOrganizationWhere` | `{ organizationId }` |
| `buildFloorOrganizationWhere` | Via `parkingLot.organizationId` |
| `buildSlotOrganizationWhere` | Via `floor.parkingLot.organizationId` |
| `buildUserScopedWhere` | USER: `{ userId, organizationId }`; ops: `{ organizationId }` |

`SUPER_ADMIN` / `TENANT_ADMIN` full platform behavior deferred.

## 5. Services scoped

| Service | Scoping |
|---------|---------|
| ParkingLots | List/read/write by `organizationId`; create uses caller's org |
| Floors | Through `parkingLot.organizationId` |
| Slots | Through `floor.parkingLot.organizationId` |
| Vehicles | List/read/write by `organizationId` |
| Bookings | List/read/write by `organizationId`; create validates vehicle + slot in same org |
| ParkingEvents | Check-in/out/list by `organizationId` |
| Dashboard | All aggregates filtered by org (users, lots, slots, bookings, events) |

## 6. Floor / Slot tenant strategy

No direct `organizationId` column added. Floor and Slot inherit tenant context:

```text
Slot → Floor → ParkingLot → organizationId
```

`ParkingLotValidationService` enforces org on all lot/floor/slot resolution paths.

## 7. Cross-tenant protections added

- Vehicle lookup scoped — cannot read/update/delete another org's vehicle
- Booking create — vehicle must belong to user **and** org; slot validated in same org
- Check-in — booking query includes `organizationId`
- Check-out — parking event query includes `organizationId`
- Parking lot/floor/slot admin ops — 404/Forbidden when targeting another org's hierarchy
- Dashboard — counts/lists exclude other orgs

## 8. Tests added/updated

213 tests, 100% coverage. New tenant isolation cases:

- Auth JWT includes `organizationId`
- Vehicles: cross-org access rejected
- Bookings: other-org vehicle/slot rejected
- Parking events: cross-org check-in/check-out rejected
- Parking lots: scoped list
- Floors/slots: scoped through parking lot
- Dashboard: org-scoped aggregates

Fixtures: `DEFAULT_ORGANIZATION_ID = 1`, `OTHER_ORGANIZATION_ID = 2`.

## 9. Build / test results

```text
npx prisma validate  — pass
npx prisma generate  — pass
npm run build        — pass
npm run test:cov     — 213/213 passed, 100% coverage
```

## 10. Intentionally deferred

- Prisma middleware / TenantGuard decorator
- Tenant onboarding API
- Frontend `AuthProvider` tenant context
- `SUPER_ADMIN` cross-tenant console
- Direct `organizationId` on Floor/Slot tables
- Payment-service changes

## 11. Manual smoke test steps

1. `cd backend && npx prisma migrate deploy && npm run prisma:seed`
2. Login as ADMIN org 1 — token decodes with `organizationId: 1`
3. Login as USER org 1
4. Create vehicle → booking → check-in → check-out (org 1)
5. Seed or create org 2 data in DB
6. Confirm org 1 lists do not include org 2 lots/vehicles/bookings/events
7. Confirm org 1 ADMIN cannot read org 2 parking lot by ID (404)

## 12. Next phase

Phase 1c/1d: tenant onboarding API and frontend tenant context in `AuthProvider` (per roadmap).