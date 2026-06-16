# Slot Lifecycle Release Safety Fix (PR #25)

## Problem

A generic `releaseSlot()` could release a slot from any status, which was unsafe:
- Cancel should only release **RESERVED** slots.
- Checkout should only release **OCCUPIED** slots.

## Fix

Split into two guarded methods in `SlotLifecycleService`:

| Method | Transition | Used by |
|--------|------------|---------|
| `releaseReservedSlot` | RESERVED → AVAILABLE | `BookingsService.cancel()` |
| `releaseOccupiedSlot` | OCCUPIED → AVAILABLE | `ParkingEventsService.checkOut()` |

Both use `updateMany` with expected source status and throw `ConflictException` if count !== 1.

## Files changed

- `backend/src/slots/slot-lifecycle.service.ts`
- `backend/src/slots/slot-lifecycle.service.spec.ts`
- `backend/src/bookings/bookings.service.ts`
- `backend/src/parking-events/parking-events.service.ts`
- Related service specs

## Build / tests

`npm run build && npm run test:cov` — **passed** (commit `d4dc3df`)

## Manual verification

1. Cancel active booking → only RESERVED slot released.
2. Checkout active event → only OCCUPIED slot released.
3. Attempting wrong transition → ConflictException.