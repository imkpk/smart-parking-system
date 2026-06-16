Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 6d only: Backend Prisma Duplicate Error Handling Cleanup.

Do not change frontend.
Do not change payment-service.
Do not change database schema.
Do not change DTOs.
Do not change API routes.
Do not add new features.
Do not start payment contract cleanup.

Goal:
Centralize Prisma duplicate/constraint error handling so services do not repeat raw Prisma error handling or expose unclear database errors.

Current issue:
Some backend services may create/update records with unique fields and may either:

* manually check duplicates before create/update
* allow Prisma P2002 errors to bubble up
* throw inconsistent error messages

Important duplicate cases to inspect:

* User email
* User phone
* Vehicle number
* Parking lot name/address if unique
* Floor number/name within parking lot if constrained
* Slot number within floor if constrained
* Booking code if unique
* Payment/reference fields if applicable in backend

Scope:

1. Inspect backend first:

   * prisma/schema.prisma
   * src/auth
   * src/users
   * src/vehicles
   * src/parking-lots
   * src/floors
   * src/slots
   * src/bookings
   * src/parking-events
2. Find Prisma unique constraint handling only.
3. Create a small reusable helper for Prisma errors.

Suggested option:

* src/prisma/prisma-error.util.ts
  or
* src/common/prisma-error.util.ts

Possible helper functions:

* isPrismaUniqueConstraintError(error)
* getPrismaTargetFields(error)
* handlePrismaUniqueConstraint(error, fieldMessageMap)
* throwConflictForPrismaUnique(error, fieldMessageMap)

Expected behavior:

* Prisma P2002 should become ConflictException.
* Error messages should be user-friendly.
* Do not expose raw Prisma/database error details to API users.
* Keep existing good duplicate pre-checks if they are needed for business clarity.
* Do not remove important validations.
* Do not loosen behavior.

Rules:

1. Keep existing API response shape as much as possible.
2. Preserve existing good error messages where possible.
3. Use ConflictException for duplicates.
4. Use BadRequestException/NotFoundException behavior only where it already exists.
5. Do not change role permissions.
6. Do not change SlotLifecycleService behavior.
7. Do not change ParkingLotValidationService behavior.
8. Do not change AccessPolicyService behavior.
9. Do not introduce circular dependencies.
10. Keep the helper small and readable.
11. Do not over-engineer.

Suggested messages:

* email → Email already exists
* phone → Phone number already exists
* vehicleNumber → Vehicle number already exists
* bookingCode → Booking code already exists
* parking lot name/address → Parking lot already exists
* floor/slot duplicates → Floor or slot already exists

Testing:

1. Add/update unit tests for duplicate handling.
2. Mock Prisma P2002 errors where needed.
3. Ensure existing tests still pass.

Run:
cd backend
npm run build
npm run test:cov

Manual test:

1. Try registering duplicate email.
2. Try registering duplicate phone.
3. Try creating duplicate vehicle number.
4. Try creating duplicate parking lot/floor/slot if constraints exist.
5. Confirm API returns 409 Conflict with friendly message.
6. Confirm normal create/update still works.

After implementation, show:

1. Files changed
2. Duplicate error handling centralized
3. Helper methods added
4. Services refactored
5. Build result
6. Test coverage result
7. Manual test steps
8. Pending issues
