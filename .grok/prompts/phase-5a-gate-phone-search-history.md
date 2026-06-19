PHASE 5A EXTENSION — Gate phone search, multiple matches, and vehicle visit history

Repository:
`https://github.com/imkpk/smart-parking-system`

Base branch:
`develop`

Create branch:
`feature/phase-5a-gate-phone-search-history`

PR title:
`feat(security): add phone search and vehicle visit history to gate`

Context:
PR #97 basic mobile security gate is already merged. Do not redo it.

Goal:
Enhance `/security/gate` so security staff can search by customer phone number, handle multiple matching bookings/vehicles, select the correct record, and see vehicle visit history.

Do not:

* Do not start chat / PR 5B.
* Do not add WebSockets.
* Do not touch payment-service.
* Do not touch single-tenant.
* Do not redesign the whole gate page.
* Do not add broad test suites.
* Do not create long reports.
* Do not expose raw DB IDs in the main UI.

Current gate search supports:

* Booking code, e.g. `BK-DEMO-001`
* Vehicle number, e.g. `TS09EA1234`
* Booking No, e.g. `BK-000018`

Add support for:

* Customer phone number search.

Backend requirements:

1. Search input normalization:

   * trim whitespace
   * remove spaces and hyphens for phone matching
   * tolerate `+91` and plain 10-digit Indian phone numbers where possible
   * strip accidental trailing `)` from copied values
   * keep booking codes and vehicle numbers working

2. Phone search:

   * Search users by phone inside the current organization only.
   * From matched users, find relevant bookings and active parking events.
   * Do not leak cross-tenant data.

3. Multiple matches:
   If the phone number maps to multiple bookings or vehicles, do not auto-pick one.

   Return a response like:

   ```ts
   {
     resultType: 'MULTIPLE_MATCHES',
     matches: [
       {
         bookingNo,
         bookingCode,
         customerName,
         customerPhone,
         vehicleNumber,
         parkingLotName,
         floorName,
         slotNumber,
         bookingStatus,
         sessionStatus,
         gateAction
       }
     ]
   }
   ```

4. Single match:
   If only one valid match exists, return the existing single gate result shape or a compatible single-result shape.

5. Gate action rules:

   * `CHECK_IN` only for confirmed/reserved booking that is not already active/completed.
   * `CHECK_OUT` only for active parking event with `checkOutTime === null`.
   * `NONE` for completed, cancelled, expired, or already checked-out state.
   * Backend must continue preventing duplicate checkout.

6. Vehicle visit history:
   For each selected/single result, include:

   * todayVisits
   * last7DaysVisits
   * last30DaysVisits
   * last365DaysVisits
   * lastVisitAt
   * lastCheckoutAt

   Use existing `ParkingEvent` records.
   Count by `vehicleId + organizationId`.
   Do not create a new table.

7. Optional recent visits:
   If simple, include latest 5 visits:

   * sessionNo
   * parkingLotName
   * slotNumber
   * checkInTime
   * checkOutTime
   * status

Frontend requirements:

1. Update search placeholder:
   `Search booking code, booking no, vehicle number, or phone number`

2. Single result card:
   Show:

   * Booking No
   * Booking Code
   * Customer
   * Phone
   * Vehicle Number
   * Parking Lot
   * Floor
   * Slot
   * Booking Status
   * Session Status
   * Vehicle Activity summary

3. Vehicle Activity summary:
   Compact section:

   * Today: X visits
   * Last 30 days: X visits
   * Last 1 year: X visits
   * Last visit: date/time or `No previous visits`

4. Multiple matches UI:
   If backend returns `MULTIPLE_MATCHES`, show selectable results.

   Desktop/tablet:

   * compact MUI table or list
   * columns: Booking, Customer, Phone, Vehicle, Lot/Slot, Status, Action
   * each row has `Select`

   Mobile 375px:

   * stacked cards, not DataGrid
   * each card shows booking, phone, vehicle, slot, status/action
   * big `Select` button

5. After selecting a match:

   * show normal result card
   * show correct primary action:

     * Check in
     * Check out
     * No action available

6. Confirmation dialog:
   Check-in:
   `Check in vehicle TS09EA1234 to slot C-01 at City Center Mall?`

   Check-out:
   `Check out vehicle TS09GB5678 from slot C-02?`

   Optional second line:
   `Session SES-000186 · Checked in 19 Jun 2026, 11:09 AM`

7. UX:

   * 375px mobile usable
   * no horizontal scroll
   * large touch targets
   * no raw database IDs in main view
   * disable action button while request is pending
   * after successful check-in/out, reset/refetch so stale action is not repeated

Focused tests only:

* phone search returns multiple matches when applicable
* phone search is tenant-scoped
* vehicle activity counts use current organization only
* already checked-out event does not return `CHECK_OUT`
* duplicate checkout remains rejected

Validation:

```bash
cd backend
npm run build
npm run test:run -- security-gate.service.spec.ts
```

If frontend changed:

```bash
cd frontend
npm run build
```

Manual verification:

1. Login as SECURITY.
2. Open `/security/gate`.
3. Search `BK-DEMO-001`.
4. Search `TS09EA1234`.
5. Search a customer phone number with multiple records.
6. Select one result.
7. Confirm phone and vehicle activity summary appear.
8. Check-in/check-out works.
9. Search same vehicle after checkout; checkout is not offered again.
10. Login as USER; `/security/gate` remains blocked.

Stop after opening this PR.
Do not start chat.