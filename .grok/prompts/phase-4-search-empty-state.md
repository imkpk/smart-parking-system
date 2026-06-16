Read `.grok/AGENTS.md` first and strictly follow it.

Execute Phase 4 only: shared SearchField and EmptyState cleanup.

Do not change backend.
Do not change payment-service.
Do not start API client factory.
Do not start backend deduplication.
Do not add new features.
Do not redesign tables again.

Goal:
Make search inputs and empty states consistent across the frontend.

Current issue:
Search/filter logic is implemented differently across pages.
Some pages have inline search fields.
Some pages have custom empty text.
Search inputs should always be type="text" and should support layman-friendly values.

Scope:

1. Create shared SearchField component if it does not exist.

Preferred file:
src/components/common/SearchField.tsx

Requirements:

* Use MUI TextField
* Always use type="text"
* Do not use type="number"
* Do not use inputMode="numeric"
* Support:

  * value
  * onChange
  * placeholder
  * label
  * disabled
  * optional clear button
  * optional search icon
* Should be reusable across pages

2. Create shared EmptyState component if it does not exist.

Preferred file:
src/components/common/EmptyState.tsx

Requirements:

* Support title
* Support description
* Optional action button
* Should be usable inside table/card areas
* Keep styling consistent with existing MUI design

3. Create shared search filter helpers if useful.

Preferred file:
src/lib/searchFilters.ts

Add helper functions only if they reduce duplicate code.

Search should support:

* booking code
* booking no
* receipt no
* session no
* vehicle number
* customer name
* email
* parking lot name
* slot number
* payment reference
* status

4. Apply SearchField to pages where low-risk:

* PaymentsPage
* ParkingEventsPage
* BookingsPage
* VehiclesPage
* ParkingLotsPage
* ParkingLotDetailsPage if search/filter exists

5. Apply EmptyState to pages where low-risk:

* PaymentsPage
* ParkingEventsPage
* BookingsPage
* VehiclesPage
* ParkingLotsPage
* ParkingLotDetailsPage

6. Payments search behavior:

* Should accept number or string
* Searching "PAY-000006" should work if row data supports it
* Searching booking no, vehicle number, status, payment reference should work where data exists
* Do not call number-only APIs for string values
* Do not show increment/decrement arrows

7. Parking Events search behavior:

* Should support session no
* booking no
* vehicle number
* customer
* parking lot
* slot
* status

8. Bookings search behavior:

* Should support booking no
* booking code
* customer
* vehicle number
* parking lot
* slot
* status

Important:

1. Do not break existing filters.
2. Do not change table columns again unless needed for search integration.
3. Do not expose technical IDs in normal tables.
4. Keep existing actions working.
5. Keep DetailsDialog working.
6. Keep role-based behavior unchanged.
7. Avoid duplicate search logic where possible.
8. Keep changes small and focused.

Run:
cd frontend && npm run build

Manual test:

1. Login as ADMIN.
2. Search Payments using receipt no, booking no, status.
3. Search Parking Events using session no, booking no, vehicle number.
4. Search Bookings using booking code and vehicle number.
5. Search Vehicles using vehicle number.
6. Search Parking Lots using lot name/city.
7. Confirm empty states look clean.
8. Confirm clear search works if implemented.
9. Confirm all actions still work.
10. Confirm build passes.

After implementation, show:

1. Files changed
2. Shared SearchField created/updated
3. Shared EmptyState created/updated
4. Pages migrated
5. Duplicate search code removed
6. Build result
7. Manual test steps
8. Pending issues
