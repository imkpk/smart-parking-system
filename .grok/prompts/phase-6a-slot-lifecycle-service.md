Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 6a only: SlotLifecycleService backend cleanup.

Do not change frontend.
Do not change payment-service.
Do not start Phase 6b, 6c, 6d, or payment contract cleanup.
Do not add new features.

Goal:
Remove duplicate slot status transition logic from backend services and centralize it in one reusable service.

Current issue:
Slot status changes are likely duplicated in:

* bookings.service.ts
* parking-events.service.ts

Business rules:

1. Booking a slot should reserve the slot.

   * AVAILABLE → RESERVED
2. Check-in should occupy the slot.

   * RESERVED → OCCUPIED
3. Check-out should release the slot.

   * OCCUPIED → AVAILABLE
4. Cancelling a booking should release the slot if no active parking event exists.

   * RESERVED → AVAILABLE
5. Prevent invalid transitions.
6. Keep all existing behavior unchanged.

Scope:

1. Inspect current slot status update logic first.
2. Create a reusable SlotLifecycleService if it does not exist.

Suggested file:
src/slots/slot-lifecycle.service.ts

3. Add methods like:

* reserveSlot(slotId, prismaTransaction?)
* occupySlot(slotId, prismaTransaction?)
* releaseSlot(slotId, prismaTransaction?)
* validateSlotAvailable(slotId, vehicleType, prismaTransaction?)
* validateSlotReserved(slotId, prismaTransaction?)
* validateSlotOccupied(slotId, prismaTransaction?)

4. Use Prisma transaction client where existing booking/check-in/check-out flows already use transactions.
5. Do not break transaction safety.
6. Do not create circular dependencies.
7. If adding SlotLifecycleService to module providers, update module wiring properly.
8. Refactor bookings.service.ts to use SlotLifecycleService.
9. Refactor parking-events.service.ts to use SlotLifecycleService.
10. Do not change API routes.
11. Do not change DTOs.
12. Do not change response shape.
13. Do not change database schema.
14. Do not change frontend.

Important:

* Keep slot status enum usage from @prisma/client.
* Keep existing error messages if possible.
* Throw proper ConflictException / BadRequestException where invalid transitions happen.
* Keep double-booking protection.
* Keep check-in/check-out behavior working.
* Keep tests passing.

Run:
cd backend
npm run build
npm run test:cov

Manual test:

1. Create booking.
2. Confirm slot becomes RESERVED.
3. Try duplicate booking for same slot and confirm it fails.
4. Check in booking.
5. Confirm slot becomes OCCUPIED.
6. Check out active event.
7. Confirm slot becomes AVAILABLE.
8. Cancel booking.
9. Confirm reserved slot becomes AVAILABLE.
10. Confirm existing APIs still return same response shape.

After implementation, show:

1. Files changed
2. Duplicate slot logic removed
3. SlotLifecycleService methods added
4. Services refactored
5. Build result
6. Test coverage result
7. Manual test steps
8. Any pending issues
