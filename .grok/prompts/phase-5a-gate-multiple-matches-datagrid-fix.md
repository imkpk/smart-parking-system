PR #99 UI FIX — Make Security Gate multiple matches use uniform DataGrid layout

Repository:
`https://github.com/imkpk/smart-parking-system`

PR:
`#99 feat(security): add phone search and vehicle visit history to gate`

Branch:
`feature/phase-5a-gate-phone-search-history`

Fix only PR #99 UI. Do not start chat / PR 5B.

Problem:
When searching by phone number on `/security/gate`, multiple matches are shown in a cramped custom table.

Current issues:

* Table is too narrow.
* Left columns are clipped.
* Horizontal scrollbar appears inside the card.
* It does not match the rest of the app’s table style.
* The `Select` button is unclear; users need a clear action like “Use this booking”.
* The multiple match list should feel like the same product as Parking Lots / Slots / Bookings tables.

Required fix:
Use the existing shared table/grid pattern for desktop/tablet.

Desktop/tablet behavior:

* Replace the custom table with the existing `AppDataGrid` or same MUI X DataGrid wrapper used elsewhere.
* Use the common toolbar/search layout used by other tables if available.
* Include grid toolbar/search/filter affordance consistently with other app DataGrids.
* Use compact row height.
* Use cursor/pagination or page-size pagination consistently with existing AppDataGrid usage.
* Do not show horizontal scroll for normal laptop width.
* The grid/card should use available page width, not a narrow centered column.
* Keep the page layout aligned with other admin/security pages.

Grid columns:

* Booking — show Booking No and Booking Code if available
* Customer
* Phone
* Vehicle
* Lot / Slot
* Status
* Gate Action
* Action

Action column:

* Replace unclear `Select` with:
  * `Use this booking` for CHECK_IN
  * `Use this session` for CHECK_OUT
  * disabled `No action` for NONE
* Keep action button compact but readable.
* Do not use only icon buttons for the main selection.

Status / Gate Action:

* Use existing status chips where possible.
* Gate Action should show: Check in / Check out / No action
* Do not show raw technical IDs in main grid.

Mobile behavior:

* At 375px width, stacked cards are still allowed.
* Cards should show: Booking, Customer + phone, Vehicle, Lot / slot, Status, primary button
* No horizontal scroll on mobile.

Layout:

* The Security Gate content should not be locked to a tiny width when showing multiple matches.
* Search panel can remain compact.
* Multiple matches section should expand wider, similar to other table pages.
* Dark mode must remain readable.

Do not:

* Do not change backend unless response shape is missing data required by columns.
* Do not change search logic.
* Do not change check-in/check-out lifecycle.
* Do not touch payment-service.
* Do not touch single-tenant.
* Do not create long reports.
* Do not write broad tests.
* Do not start chat.

Validation:

```bash
cd frontend
npm run build
```

Manual verification:

1. Login as SECURITY.
2. Open `/security/gate`.
3. Search phone number with multiple matches.
4. Desktop/tablet: confirm DataGrid-style table uses available width and no clipped columns.
5. Confirm toolbar/search/pagination style matches existing app tables.
6. Confirm action button says `Use this booking` or `Use this session`, not just `Select`.
7. Select a row and continue check-in/check-out.
8. Set viewport to 375px and confirm stacked cards are readable with no horizontal scroll.

Push fix to same PR #99 branch. Do not open a new PR.