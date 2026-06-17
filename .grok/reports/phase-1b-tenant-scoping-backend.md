# Phase 1b — Backend Tenant Scoping Enforcement

**Status:** ✅ Merged  
**PR:** [#42](https://github.com/imkpk/smart-parking-system/pull/42)  
**Branch:** `feature/phase-1b-tenant-scoping-backend` (merged to `develop`)

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

**New — API presenters (display enrichment)**
- `backend/src/parking-events/parking-event.presenter.ts`
- `backend/src/bookings/booking.presenter.ts`

**Updated — services + controllers**
- `parking-lots`, `floors`, `slots`, `vehicles`, `bookings`, `parking-events`, `dashboard`, `users`
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

219 tests, 100% coverage. New tenant isolation cases:

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
npm run test:cov     — 219/219 passed, 100% coverage
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

## 12. PR review fixes

### Parking Events repeated slots API calls
- **Problem:** Opening `/parking-events` triggered dozens of `GET /parking-lots/:id/slots` calls because list endpoints returned only raw IDs.
- **Root cause:** `ParkingEventsPage` used `useReferenceLabels({ includeParkingStructure: true })` to resolve customer, vehicle, lot, and slot labels client-side.
- **API-level fix:** Added `parking-event.presenter.ts` with Prisma `include` for `user`, `vehicle`, `parkingLot`, `slot.floor`; all parking-event read/write endpoints return flat display fields (`bookingCode`, `customerName`, `customerEmail`, `vehicleNumber`, `parkingLotName`, `floorName`, `slotNumber`).
- **Frontend changes:** `ParkingEventsPage` reads enriched API fields via `parkingEventDisplay.ts`; removed `useReferenceLabels` from the page; search uses embedded fields.
- **Validation:** Backend 217 tests at 100% coverage; frontend build/tests pass; Parking Events page no longer calls general slots API for row labels.

### Users API tenant leak
- **Problem:** `UsersService.findAll` / `findOne` returned users across all organizations.
- **Root cause:** Controller did not pass `CurrentUser`; service queries had no `organizationId` filter.
- **API-level fix:** `UsersController` passes `@CurrentUser()`; `findAll` / `findOne` scope with `AccessPolicyService.buildOrganizationWhere`. `findActiveById` unchanged for JWT validation.
- **Frontend changes:** None required.
- **Validation:** Org 1 admin cannot list/read org 2 users (404); backend tests cover isolation.

### Bookings repeated slots API calls
- **Problem:** Opening `/bookings` triggered repeated `GET /parking-lots/:id/slots` calls for table/details/search labels.
- **Root cause:** `BookingsPage` used `useReferenceLabels({ includeParkingStructure: true })` to resolve customer, vehicle, lot, and slot labels client-side.
- **API-level fix:** Added `booking.presenter.ts` with Prisma `include` for `user`, `vehicle`, `parkingLot`, `slot.floor`; `create`, `findMine`, `findAll`, `findOne`, and `cancel` return flat display fields (`customerName`, `customerEmail`, `customerPhone`, `vehicleNumber`, `parkingLotName`, `floorId`, `floorName`, `slotNumber`) while keeping existing IDs and codes.
- **Frontend changes:** `BookingsPage` reads enriched API fields via `bookingDisplay.ts`; removed `useReferenceLabels` from the page; search uses embedded fields. Create-booking form still uses `getAvailableSlotsForBooking` only after lot/vehicle selection.
- **Validation:** Backend build/tests pass; frontend build/tests pass; Bookings list page no longer calls general slots API for row labels; available-slots flow unchanged.

## 13. Next phase

**Phase 1c — Tenant onboarding API** (`feature/phase-1c-tenant-onboarding-api` from `develop`)

- SUPER_ADMIN endpoints to create organizations and initial TENANT_ADMIN users
- Deterministic tenant bootstrap without manual DB seeding for new customers
- Branch strategy: `docs/project-plan/09-branch-strategy.md` §7 (stacked PR #3 after 1b)

**Phase 1d** (after 1c): frontend tenant context in `AuthProvider`.