Read `.grok/AGENTS.md` first and strictly follow all coding standards, architecture rules, branch rules, testing rules, and reporting rules defined there.

Fix PR #42 only.

Repository:
`https://github.com/imkpk/smart-parking-system`

PR:
`https://github.com/imkpk/smart-parking-system/pull/42`

Branch:
`feature/phase-1b-tenant-scoping-backend`

Work on the existing branch:

```bash
git checkout feature/phase-1b-tenant-scoping-backend
git pull origin feature/phase-1b-tenant-scoping-backend
```

Do not merge the PR.
Do not start Phase 1c.
Do not change payment-service.
Do not redesign the UI.
Do not add staleTime/debounce/cache-only bandaids.
Fix the API/functionality design.

## Problem

After fixing Parking Events, the same repeated `/slots` request problem is visible on the Bookings page:

```text
http://localhost:5173/bookings
```

Network tab shows repeated calls like:

```text
GET /api/parking-lots/:id/slots
```

The Bookings page should not need to repeatedly call the Slots API just to render booking table labels.

Current issue:
`BookingsPage` still uses `useReferenceLabels({ includeParkingStructure: true })`, and uses:

```text
labels.getCustomerLabel(...)
labels.getVehicleLabel(...)
labels.getParkingLotLabel(...)
labels.getSlotLabel(...)
```

for booking rows, details, and search.

That causes slots/reference data loading even when the user is only reviewing bookings.

## Required functional fix

Change the Bookings API response to include the display fields needed by the Bookings page.

Booking list/detail rows should include fields like:

```ts
{
  id,
  bookingCode,
  userId,
  customerName,
  customerEmail,
  customerPhone,
  vehicleId,
  vehicleNumber,
  parkingLotId,
  parkingLotName,
  slotId,
  slotNumber,
  floorId,
  floorName,
  status,
  startTime,
  endTime,
  createdAt,
  updatedAt
}
```

Keep existing fields too for backward compatibility.

## Backend direction

Inspect and update:

```text
backend/src/bookings/bookings.service.ts
backend/src/bookings/bookings.controller.ts
backend/src/bookings/bookings.service.spec.ts
```

Add a booking presenter similar to the parking event presenter if appropriate:

```text
backend/src/bookings/booking.presenter.ts
backend/src/bookings/booking.presenter.spec.ts
```

Use Prisma `include` / `select` to load related display data:

```text
user
vehicle
parkingLot
slot
slot.floor
```

Apply to booking responses from:

```text
create
findMine
findAll
findOne
cancel
```

Do not break tenant scoping:

* Bookings must remain organization-scoped.
* `USER` still sees only own bookings.
* `ADMIN` / `SECURITY` see only current organization bookings.
* Cross-org vehicle/slot/booking protections must remain.

## Frontend direction

Update:

```text
frontend/src/pages/bookings/BookingsPage.tsx
frontend/src/types/booking.ts
frontend/src/lib/searchFilters.ts
```

The Bookings page should use fields from the Booking API response:

```text
customerName / customerEmail
vehicleNumber
parkingLotName
floorName
slotNumber
bookingCode
```

Remove `useReferenceLabels` from `BookingsPage` for table/details/search rendering.

Do not use `/api/parking-lots/:id/slots` for booking row labels.

Important distinction:
The create-booking form may still call:

```text
GET /api/parking-lots/:id/available-slots
```

or the existing available-slots API after the user selects a lot/vehicle. That is valid.

But the booking list page must not call the general slots API repeatedly just to render existing bookings.

## Tests required

Backend tests:

* Booking presenter returns display fields:

  * customerName
  * customerEmail
  * vehicleNumber
  * parkingLotName
  * floorName
  * slotNumber
* `findAll` returns enriched booking rows scoped to org.
* `findMine` returns enriched booking rows scoped to current user/org.
* Cross-org booking access remains rejected.

Frontend tests if practical:

* Bookings page renders booking rows using enriched booking response fields.
* Bookings page does not call SlotsApi for table row labels.
* Search works with customer, vehicle number, parking lot, floor, slot number, and status.

If frontend test setup is not suitable, document manual verification clearly.

## Manual verification

After the fix:

```text
1. Login as ADMIN.
2. Open http://localhost:5173/bookings.
3. Open DevTools → Network.
4. Filter "slots".
5. Refresh the page.
6. Confirm general /parking-lots/:id/slots is not called repeatedly.
7. Booking table still shows customer, vehicle, parking lot, floor/slot labels.
8. Search still works by customer, vehicle number, parking lot, slot, status.
9. Open details dialog and confirm business labels are shown.
10. Open create booking form and confirm available slots still load only when selecting lot/vehicle.
11. Confirm booking → check-in → check-out still works.
```

## Documentation

Update:

```text
.grok/reports/phase-1b-tenant-scoping-backend.md
```

Add under PR review fixes:

```markdown
### Bookings repeated slots API calls
- Problem
- Root cause
- API-level fix
- Frontend changes
- Validation
```

Update `MASTER_PROMPT.md` only if needed. Keep it minimal.

## Validation

Run backend:

```bash
cd backend
npx prisma validate
npx prisma generate
npm run build
npm run test:cov
```

Run frontend because frontend files changed:

```bash
cd frontend
npm run build
npm test -- --run
```

If the frontend test command differs, inspect `frontend/package.json` and use the existing test command.

## Commit

```bash
git status
git add .
git commit -m "fix: enrich bookings API and stop repeated slots fetches"
git push origin feature/phase-1b-tenant-scoping-backend
```

Do not merge PR #42.

Success criteria:

* Bookings page no longer repeatedly calls `/parking-lots/:id/slots`.
* Booking API returns display fields needed by the page.
* Booking table/details/search use enriched booking response fields.
* Create-booking available-slot flow still works.
* Tenant scoping remains intact.
* Backend build/tests pass.
* Frontend build/tests pass.
