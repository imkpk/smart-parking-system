Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 6c only: Backend Access Policy / Ownership Checks Cleanup.

Do not change frontend.
Do not change payment-service.
Do not change database schema.
Do not change DTOs.
Do not change API routes.
Do not add new features.
Do not start Phase 6d or payment contract cleanup.

Goal:
Centralize repeated backend role/ownership access checks so services do not duplicate ADMIN vs USER vs SECURITY logic.

Current issue:
Some services may repeatedly check:

* ADMIN can access all records
* USER can access only their own vehicles/bookings/payments/history
* SECURITY can access operational flows like check-in/check-out
* USER cannot access another user's vehicle/booking/history
* ownership checks are duplicated across services

Scope:

1. Inspect backend first:

   * src/vehicles
   * src/bookings
   * src/parking-events
   * src/payments or payment client usage if present
   * src/dashboard
   * src/auth / users role types
2. Find duplicated access/ownership checks only.
3. Create a small reusable helper/service only if it reduces duplication.

Suggested option:

* src/common/access-policy.service.ts
  or
* src/common/access-policy.ts

Possible methods:

* isAdmin(user)
* isSecurity(user)
* isUser(user)
* canAccessUserResource(currentUser, ownerUserId)
* assertCanAccessUserResource(currentUser, ownerUserId)
* buildUserScopedWhere(currentUser)

Rules:

1. Keep existing role behavior unchanged.
2. Keep existing ForbiddenException behavior as much as possible.
3. Do not loosen permissions.
4. Do not expose other users' data.
5. Do not introduce circular module dependencies.
6. Do not change API response shape.
7. Do not change decorators or guards unless clearly needed.
8. Do not move unrelated business logic.
9. Keep ADMIN access unchanged.
10. Keep USER ownership restrictions unchanged.
11. Keep SECURITY operational permissions unchanged.

Important:

* If a check is unique to a service and not duplicated, leave it there.
* Prefer small and readable cleanup.
* Avoid over-engineering.
* Do not rename public APIs.
* Do not change route permissions.
* Do not change frontend expectations.

Run:
cd backend
npm run build
npm run test:cov

Manual test:

1. USER can create/list own vehicles.
2. USER cannot access another user's vehicle/booking.
3. USER can create booking only with own vehicle.
4. ADMIN can access all bookings/vehicles/history.
5. SECURITY can perform check-in/check-out.
6. USER cannot perform security-only operational actions.
7. Dashboard permissions still work.
8. Payment initiation after checkout still works.

After implementation, show:

1. Files changed
2. Duplicate access checks removed
3. New helper/service methods added
4. Services refactored
5. Build result
6. Test coverage result
7. Manual test steps
8. Pending issues
