# Phase 6d Complete — Prisma Duplicate Error Handling Cleanup

## 1. Files changed

**New**
- `backend/src/prisma/prisma-error.util.ts`
- `backend/src/prisma/prisma-error.util.spec.ts`

**Updated**
- `backend/src/users/users.service.ts` — replaced inline P2002 handling with shared util
- `backend/src/vehicles/vehicles.service.ts` — `create`, `update`
- `backend/src/floors/floors.service.ts` — `create`, `update`
- `backend/src/slots/slots.service.ts` — `create`, `createBulk`
- `backend/src/bookings/bookings.service.ts` — `create`
- `backend/src/parking-events/parking-events.service.ts` — `checkIn`
- Service specs for vehicles, floors, slots, bookings, parking-events

**Unchanged (by design)**
- `AuthService` — keeps email/phone pre-checks for clearer registration errors
- `ParkingLotsService` — no unique constraints in schema
- `SlotLifecycleService`, `ParkingLotValidationService`, `AccessPolicyService`

## 2. Duplicate error handling centralized

| Before | After |
|--------|-------|
| `UsersService` had inline P2002 parsing (~20 lines) | Uses `handlePrismaUniqueConstraint()` |
| `VehiclesService` let Prisma errors bubble | Maps `vehicleNumber` → 409 Conflict |
| `FloorsService` / `SlotsService` had no P2002 handling | Maps composite unique violations → 409 |
| `BookingsService` / `ParkingEventsService` relied only on pre-checks | P2002 race-condition fallback added |

## 3. Helper methods added

- `isPrismaUniqueConstraintError(error)` — detects P2002
- `getPrismaTargetFields(error)` — extracts field names from `meta.target`
- `handlePrismaUniqueConstraint(error, fieldMessageMap, defaultMessage)` — throws `ConflictException` with a friendly message

Supports single fields (`email`, `vehicleNumber`) and composite keys (`parkingLotId,name`, `floorId,slotNumber`).

## 4. Services refactored

| Service | Unique fields | Message |
|---------|---------------|---------|
| Users | `email`, `phone` | Email/Phone already exists |
| Vehicles | `vehicleNumber`, `registrationNo` | Vehicle number already exists |
| Floors | `parkingLotId,name` | Floor already exists |
| Slots | `floorId,slotNumber` | Slot already exists |
| Bookings | `bookingCode` | Booking code already exists |
| ParkingEvents | `bookingId` | Parking event already exists for this booking |

## 5. Build result

`npm run build` — **success**

## 6. Test coverage result

`npm run test:cov` — **192/192 tests passed**, **100% coverage**

## 7. Manual test steps

1. Register with duplicate email → 409 `Email already exists`
2. Register with duplicate phone → 409 `Phone number already exists`
3. Create vehicle with duplicate number → 409 `Vehicle number already exists`
4. Create duplicate floor/slot (same lot/floor) → 409 with friendly message
5. Confirm no raw Prisma/database errors in API responses
6. Confirm normal create/update still works

## 8. Pending issues

None for Phase 6d. Auth pre-checks are intentionally kept alongside the Prisma fallback in `UsersService` for defense in depth. Parking lots have no DB-level unique constraints, so no handler was added there.