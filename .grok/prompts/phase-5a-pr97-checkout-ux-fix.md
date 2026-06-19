now fix this URGENT FIX — PR #97 gate checkout UX + duplicate checkout bug

Repo:
`https://github.com/imkpk/smart-parking-system`

PR:
`#97 feat(security): add mobile gate check-in checkout flow`

Branch:
`feature/phase-5a-mobile-security-gate`

Fix only PR #97. Do not start PR 5B/chat.

Problems found in manual testing:

1. Confirmation dialog text is not meaningful.
   Current text looks like:
   `Confirm check-out for TS09GB5678 at Access Lot 1781640762, slot ACCESS-1781640762-B?`

This is not acceptable because it exposes ugly/internal demo names and is hard for a security guard to understand.

Expected text:
For check-in:
`Check in vehicle TS09EA1234 to slot C-01 at City Center Mall?`

For check-out:
`Check out vehicle TS09GB5678 from slot C-02?`

Optional second line:
`Session SES-000186 · Checked in 19 Jun 2026, 11:09 AM`

Rules:

* Do not show raw technical/random names like `Access Lot 1781640762`.
* Prefer business labels:

  * vehicle number
  * slot number
  * floor name
  * parking lot name only if it is a real clean name
  * session no for checkout
* Keep dialog short and readable on 375px mobile.
* Button labels:

  * `Check in`
  * `Check out`
  * `Cancel`

2. Duplicate checkout bug.
   Currently the same vehicle/session can be checked out multiple times.

Expected behavior:

* An ACTIVE parking event can be checked out exactly once.
* After checkout succeeds:

  * parking event status becomes COMPLETED
  * checkOutTime is set
  * slot is released according to existing lifecycle rules
* A second checkout attempt for the same event/vehicle must be rejected safely.
* Searching the same vehicle after checkout should not offer `Check out` again.
* It should show:

  * no active session found, or
  * disabled state: `Already checked out`
* Backend must enforce this, not only frontend.

Backend fix:

* In the checkout endpoint/service, before checkout:

  * fetch event by id/booking/vehicle within organization
  * require `status === ACTIVE`
  * require `checkOutTime === null`
* If not active, throw a clear 400/409 error:
  `This session is already checked out.`
* Ensure Security Gate search only returns `CHECK_OUT` when there is an active event with no `checkOutTime`.
* Do not directly update slot status outside existing SlotLifecycleService if there is already a lifecycle method.

Frontend fix:

* After successful checkout, reset cached search/result state or refetch.
* Do not allow repeated clicking while checkout mutation is pending.
* Disable primary action while request is in progress.
* If backend returns already checked out, show snackbar:
  `This session is already checked out.`
* Success screen should say:
  `Vehicle checked out successfully.`

Tests:
Add/update focused backend tests only:

1. Checkout active event succeeds once.
2. Second checkout for same event is rejected.
3. Gate search after completed checkout does not return `CHECK_OUT`.

Do not add broad UI tests.

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
2. Search active vehicle `TS09GB5678`.
3. Confirm dialog text is clean and readable.
4. Click Check out once.
5. Success appears.
6. Search `TS09GB5678` again.
7. Confirm Check out is not offered again.
8. Try direct/repeated checkout if possible; backend rejects it safely.

Push fix to same PR #97 branch.
Do not open chat PR yet.