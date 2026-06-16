# Phase 6c Complete — Backend Access Policy Cleanup

## 1. Files changed

**New**
- `backend/src/common/access-policy.service.ts`
- `backend/src/common/access-policy.service.spec.ts`
- `backend/src/common/common.module.ts` (`@Global()` — stateless helpers only)

**Updated**
- `backend/src/app.module.ts` — imports `CommonModule`
- `backend/src/vehicles/vehicles.service.ts`
- `backend/src/bookings/bookings.service.ts`
- `backend/src/parking-events/parking-events.service.ts`
- `vehicles.service.spec.ts`, `bookings.service.spec.ts`, `parking-events.service.spec.ts`

## 2. Duplicate access checks removed

| Service | Before | After |
|---------|--------|-------|
| VehiclesService | Private `ensureOwnerOrAdmin()` | `accessPolicy.assertOwnerOrAdmin()` |
| BookingsService | Inline ADMIN/USER/SECURITY checks in `findOne` | `accessPolicy.assertCanViewUserOwnedRecord()` |
| BookingsService | Inline ownership check in `cancel` | `accessPolicy.assertOwnerOrAdmin()` |
| ParkingEventsService | Inline `user.role === USER` scoping in `findHistory` | `accessPolicy.buildUserScopedWhere()` |
| ParkingEventsService | Inline role checks in `findOne` | `accessPolicy.assertCanViewUserOwnedRecord()` |

Left unchanged: booking creation's "own vehicle only" check (business rule, not duplicated role logic).

## 3. New helper/service methods added

- `isAdmin`, `isSecurity`, `isUser`, `isOperationalRole`
- `canAccessUserResource`, `canViewUserOwnedRecord`
- `assertCanAccessUserResource`, `assertOwnerOrAdmin`, `assertCanViewUserOwnedRecord`
- `buildUserScopedWhere` — USER → `{ userId }`, ADMIN/SECURITY → `{}`

## 4. Services refactored

- **VehiclesService** — `update`, `remove` use `assertOwnerOrAdmin`
- **BookingsService** — `findOne` uses `assertCanViewUserOwnedRecord`; `cancel` uses `assertOwnerOrAdmin`
- **ParkingEventsService** — `findHistory` uses `buildUserScopedWhere`; `findOne` uses `assertCanViewUserOwnedRecord`

## 5. Build result

`npm run build` — **success** (commit `050daf1`, merged PR #27)

## 6. Test coverage result

`npm run test:cov` — **176/176 tests passed**, **100% coverage**

## 7. Manual test steps

1. USER: create/list own vehicles.
2. USER: cannot access another user's vehicle or booking.
3. USER: can book only with own vehicle.
4. ADMIN: can access all bookings, vehicles, and history.
5. SECURITY: can perform check-in/check-out and view operational records.
6. USER: cannot perform security-only actions.
7. Dashboard permissions unchanged.
8. Payment initiation after checkout still works.

## 8. Pending issues

None for Phase 6c. `CommonModule` should stay limited to small stateless cross-cutting helpers — do not add many services to the global module.

## Design note

`@Global()` on `CommonModule` is acceptable for `AccessPolicyService` because it is stateless and cross-cutting. Keep future additions to stateless helpers only.