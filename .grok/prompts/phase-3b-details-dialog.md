Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 3b only: DetailsDialog adoption.

Do not start Phase 4 search cleanup.
Do not change backend.
Do not change payment-service.
Do not add new features.
Do not redesign table columns again unless required for details action.

Goal:
Add or improve View Details flow so technical IDs are not shown in normal tables but are still available inside details dialog.

Main rule:
Normal table should show layman-friendly information.
DetailsDialog should show:

1. Business Details
2. Technical Details

Use existing:

* DetailsDialog
* AppDataGrid
* StatusChip
* formatBookingNo
* formatReceiptNo
* formatSessionNo
* formatDateTime
* formatCurrency
* formatDuration
* useReferenceLabels

Scope:

1. PaymentsPage
   Improve existing payment details dialog.

Business Details should show:

* Receipt No
* Booking No
* Customer if available
* Vehicle Number if available
* Amount
* Currency
* Payment Status
* Method
* Payment Reference
* Failure Reason if available
* Created On

Technical Details should show:

* paymentId
* parkingEventId
* bookingId
* userId
* providerReference
* raw status
* raw paymentMethod

Also fix pending issue:

* buildPaymentSummaryRows should use formatReceiptNo instead of Receipt #id.

2. ParkingEventsPage
   Improve existing parking event details dialog if present.

Business Details should show:

* Session No
* Booking No
* Customer
* Vehicle Number
* Parking Lot
* Slot
* Status
* Checked In At
* Checked Out At
* Duration
* Fee

Technical Details should show:

* parkingEventId
* bookingId
* userId
* vehicleId
* slotId
* parkingLotId
* raw status

3. BookingsPage
   Add View Details action using DetailsDialog.

Business Details should show:

* Booking No
* Booking Code
* Customer
* Vehicle Number
* Parking Lot
* Slot
* Start Time
* End Time
* Status

Technical Details should show:

* bookingId
* userId
* vehicleId
* slotId
* parkingLotId
* raw status

Keep existing booking actions working:

* Cancel booking
* Any existing admin/security actions

4. VehiclesPage
   Add View Details action using DetailsDialog.

Business Details should show:

* Vehicle Number
* Vehicle Type
* Brand
* Model
* Color
* Owner

Technical Details should show:

* vehicleId
* userId
* raw vehicleType

Keep edit/delete actions working.

5. ParkingLotsPage
   Add View Details action using DetailsDialog if low-risk.

Business Details should show:

* Parking Lot Name
* Address
* City
* Status
* Created On / Updated On if available

Technical Details should show:

* parkingLotId

Keep create/edit/delete actions working.

6. ParkingLotDetailsPage
   If simple and low-risk, add details action for Floors and Slots.

Floor Business Details:

* Floor Name
* Floor Number
* Parking Lot
* Total Slots if available

Floor Technical Details:

* floorId
* parkingLotId

Slot Business Details:

* Slot Number
* Floor
* Parking Lot
* Vehicle Type
* Status

Slot Technical Details:

* slotId
* floorId
* parkingLotId
* raw status
* raw vehicleType

Important:

1. Do not duplicate details row rendering.
2. If InfoRows duplicates DetailsDialog row rendering, either reuse one or keep changes minimal and note it as pending.
3. Do not expose technical IDs back into normal tables.
4. Do not change API contracts.
5. Keep actions using raw IDs internally.
6. Do not break role-based visibility.
7. Do not change search in this phase.

Run:
cd frontend && npm run build

Manual test:

1. Login as ADMIN.
2. Open Payments and click View Details.
3. Open Parking Events and click View Details.
4. Open Bookings and click View Details.
5. Open Vehicles and click View Details.
6. Open Parking Lots and click View Details if added.
7. Confirm Business Details are readable.
8. Confirm Technical Details show raw IDs only inside dialog.
9. Confirm edit/delete/cancel/checkout/mock payment actions still work.
10. Confirm build passes.

After implementation, show:

1. Files changed
2. Details dialogs added/updated
3. Business Details included
4. Technical Details included
5. Build result
6. Manual test steps
7. Pending issues for Phase 4
