Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 3a only: table readability and user-friendly columns.

Do not start Phase 3b DetailsDialog/DetailsDrawer adoption.
Do not start Phase 4 search cleanup.
Do not change backend.
Do not change payment-service.
Do not add new features.

Goal:
Improve table readability so a normal user can understand the tables without seeing too many raw database IDs.

Main rule:
Keep raw IDs internally for API actions, but hide unnecessary technical IDs from normal table views.

Use existing shared utilities/components:

* AppDataGrid
* StatusChip or existing thin status wrappers
* formatBookingNo
* formatReceiptNo
* formatSessionNo
* formatDateTime
* formatCurrency
* useReferenceLabels where useful

Scope:

1. PaymentsPage
   Update table labels:

* Payment ID should display as Receipt No using formatReceiptNo
* Booking ID should display as Booking No using formatBookingNo
* Event ID should display as Session No using formatSessionNo if shown
* Created At should display as Created On using formatDateTime
* Amount should use currency formatter

Hide from normal table if possible:

* userId
* raw parkingEventId
* raw internal IDs that are not useful

Keep payment.id internally for:

* Mock Success
* Mock Failure
* View/Search logic

2. ParkingEventsPage
   Update table labels:

* Event ID should display as Session No using formatSessionNo
* Booking ID should display as Booking No using formatBookingNo
* Check-in Time should display as Checked In At
* Check-out Time should display as Checked Out At
* Duration should use formatDuration
* Fee should use currency formatter

Hide from normal table if possible:

* userId
* vehicleId
* slotId
* parkingLotId

Keep event.id internally for checkout action.

3. BookingsPage
   Update table readability:

* Add Booking No using formatBookingNo
* Keep Booking Code visible
* Use readable Vehicle label where available
* Use readable Parking Lot label where available
* Use readable Slot label where available
* Use formatDateTime for Start Time and End Time

Hide from normal table where possible:

* userId
* vehicleId
* slotId
* parkingLotId

Keep booking.id internally for actions.

4. VehiclesPage
   Improve admin table readability:

* Avoid showing raw userId as the main owner column if better owner label is available
* Prefer Owner / Customer label
* Keep vehicle.id internally for edit/delete

5. ParkingLots / Floors / Slots
   Only make low-risk label improvements.
   Do not rewrite the page.
   Hide raw IDs from normal table if they are currently visible.
   Keep IDs internally for actions.

Important:
Do not break existing actions.
Do not change API response contracts.
Do not create duplicate formatters.
Do not create new status chip logic.
Do not create DetailsDrawer in this phase.
Do not refactor search in this phase.

Run:
cd frontend && npm run build

After implementation, show:

1. Files changed
2. Tables updated
3. Columns renamed
4. Raw IDs hidden from normal views
5. Build result
6. Manual test steps
7. Pending issues for Phase 3b
