Read `.grok/AGENTS.md` first and strictly follow it.

Fix only small UI view issues after frontend refactor.

Do not change backend.
Do not change payment-service.
Do not change role behavior.
Do not change tabs.
Do not add new features.
Do not change business logic.

Issues to fix:

1. Payments table height issue
- Payments DataGrid parent/container height is too small.
- Rows are getting squeezed/cut.
- Table should show rows clearly.
- Set proper minHeight/height for AppDataGrid or PaymentsPage usage.
- Target height around 480px to 560px.
- Do not break pagination.
- Horizontal scroll is okay, but rows should not be vertically clipped.

2. Parking Events spacing issue
- Search field is too close to the Active Events tab.
- Add proper spacing/margin between tab area and SearchField.
- Layout should look clean.

3. Icons
- Parking Events and Payments sidebar icons should remain visually different.

Important:
- Do not restore or add History tab in this PR.
- SECURITY seeing only Active Events is acceptable for now.
- ADMIN/USER history refinements can be handled later.
- Keep DetailsDialog working.
- Keep SearchField working.
- Keep EmptyState working.
- Keep check-in/check-out working.

Run:
cd frontend && npm run build

After implementation, show:
1. Files changed
2. View fixes made
3. Build result
4. Manual test steps
5. Pending issues