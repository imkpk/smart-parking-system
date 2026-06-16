Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 6b only: Active Parking Lot Validation Cleanup.

Do not change frontend.
Do not change payment-service.
Do not change database schema.
Do not change DTOs.
Do not change API routes.
Do not add new features.
Do not start Phase 6c, 6d, or any payment cleanup.

Goal:
Centralize repeated backend validation logic related to active parking lots, floors, and slots.

Current issue:
Some services may repeatedly check:

* parking lot exists
* parking lot is active
* floor exists
* floor belongs to an active parking lot
* slot exists
* slot belongs to an active parking lot

Scope:

1. Inspect backend first:

   * src/parking-lots
   * src/floors
   * src/slots
   * src/bookings
   * src/parking-events
   * src/dashboard
2. Find duplicated validation logic only.
3. Create a small reusable validation helper/service only if it reduces duplication.

Suggested option:

* src/parking-lots/parking-lot-validation.service.ts

Possible methods:

* getActiveParkingLotOrThrow(parkingLotId, tx?)
* getActiveFloorOrThrow(floorId, tx?)
* getActiveSlotOrThrow(slotId, tx?)

Rules:

1. Keep existing error behavior as much as possible.
2. Use NotFoundException when resource does not exist or inactive resource should be hidden.
3. Do not loosen validation.
4. Do not introduce circular module dependencies.
5. Use Prisma transaction client where existing flows already use transactions.
6. Keep SlotLifecycleService behavior unchanged.
7. Do not modify API response shape.
8. Do not modify frontend expectations.

Important:

* If validation already exists cleanly in one place, do not over-engineer.
* Prefer small, simple helper/service.
* Do not move unrelated business logic.
* Do not rename public APIs.
* Do not change role permissions.

Run:
cd backend
npm run build
npm run test:cov

Manual test:

1. Create active parking lot, floor, slot.
2. Create booking successfully.
3. Try booking slot from inactive parking lot and confirm it fails.
4. Try accessing invalid parking lot/floor/slot and confirm proper error.
5. Confirm dashboard APIs still work.
6. Confirm check-in/check-out still work after SlotLifecycleService changes.

After implementation, show:

1. Files changed
2. Duplicate validation removed
3. New helper/service methods added
4. Services refactored
5. Build result
6. Test coverage result
7. Manual test steps
8. Pending issues
