PR #99 SMALL FIX — Disable completed rows in Security Gate multiple matches

Repo:
`https://github.com/imkpk/smart-parking-system`

PR:
`#99 feat(security): add phone search and vehicle visit history to gate`

Branch:
`feature/phase-5a-gate-phone-search-history`

Fix only this small UI/logic clarity issue.

Problem:
In `/security/gate`, phone search multiple-match results show rows with Status = `Completed`, but:

* Gate Action still says `Check in`
* Action button still says `Use this booking`

This is confusing. Completed bookings should not look actionable.

Required behavior:
For rows where booking/session is completed, cancelled, expired, or already checked out:

* Gate Action column should show `No action` or a clear reason like `Completed`
* Action button should be disabled.
* Button text should be `No action` or `Completed`
* Do not allow selecting a completed row for check-in/check-out.

For rows where action is valid:

* CHECK_IN → Gate Action: `Check in`, button: `Use this booking`
* CHECK_OUT → Gate Action: `Check out`, button: `Use this session`

Backend:

* Confirm backend returns `gateAction: NONE` for completed/cancelled/expired/already checked-out rows.
* If backend currently returns CHECK_IN for completed bookings, fix the backend action calculation.
* Keep tenant scoping unchanged.

Frontend:

* Respect `gateAction`.
* Disable action button when `gateAction === NONE`.
* Do not show completed rows as actionable.
* Keep current DataGrid layout.

Do not:

* Do not redesign the table.
* Do not change pagination.
* Do not start chat.
* Do not touch payment-service.
* Do not write broad tests.

Validation:

```bash
cd backend
npm run build
npm run test:run -- security-gate.service.spec.ts
cd ../frontend
npm run build
```

Manual verification:

1. Login as SECURITY.
2. Search phone number that returns completed rows.
3. Confirm completed rows show no actionable check-in/check-out.
4. Confirm valid confirmed rows still show `Check in` + `Use this booking`.
5. Confirm active session rows show `Check out` + `Use this session`.

Push to same PR #99 branch.