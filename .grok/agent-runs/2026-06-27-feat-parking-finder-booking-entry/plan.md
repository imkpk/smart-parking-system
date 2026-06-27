# Step 5 Plan: Parking Finder Booking Entry Flow

Date: 2026-06-27
Branch: `feat/parking-finder-booking-entry`
PR title: `feat(parking-finder): add booking entry flow`

## Scope

- Keep `/parking-finder` public.
- Add a booking entry path from each bookable public lot.
- Route logged-out users to `/login?redirect=/bookings/new?parkingLotId=<id>`.
- Route logged-in users to `/bookings/new?parkingLotId=<id>`.
- Add `/bookings/new` only as a booking-create entry route using the existing bookings page/form behavior.
- Prefill `parkingLotId` from the route query parameter without reserving a slot.
- Keep booking creation authenticated and USER-scoped through existing protected routing and booking APIs.
- Update focused frontend tests, run required frontend verification, and document the run.

## Out of Scope

- Payment implementation.
- Maps, geolocation, or external provider integrations.
- IoT, QR gate, device, or camera work.
- Backend changes unless a blocking API gap is found.
- Public exposure of private lots.
- UI redesign or unrelated pages.
- Merging this PR.

## Target Files

- `frontend/src/pages/parking-finder/ParkingFinderPage.tsx`
- `frontend/src/pages/auth/LoginPage.tsx`
- `frontend/src/pages/bookings/BookingsPage.tsx`
- `frontend/src/router.tsx`
- `frontend/src/test/pages/parking-finder/ParkingFinderPage.test.tsx`
- `frontend/src/test/pages/bookings/BookingsPage.test.tsx`
- `frontend/src/test/pages/auth/LoginPage.test.tsx`
- `frontend/src/test/router.test.tsx`
- `.grok/agent-runs/2026-06-27-feat-parking-finder-booking-entry/`
- `.grok/reports/parking-finder-booking-entry.md`
- `.grok/agent-runs/README.md`
- `.grok/reports/README.md`
- `MASTER_PROMPT.md` changelog/status only if required by project convention.

## Auth Redirect Behavior

- Public finder remains accessible without auth.
- For unauthenticated users, the finder book action links to login with a redirect back to the exact booking entry path.
- Login accepts only safe internal redirects for `/bookings/new`; unsafe or external redirect values fall back to the role home route.
- Authenticated users use the direct `/bookings/new?parkingLotId=<id>` route.
- `/bookings/new` stays behind protected routing and is limited to users who can create bookings.

## Existing `/bookings/new` Route

- Not present before this step.
- Existing deep link is `/bookings?create=1`.
- Step 5 will add `/bookings/new` as a small route-level entry point into the existing bookings page/form instead of duplicating booking creation UI.

## Backend Need

- No backend change is planned.
- Existing public finder behavior already filters active public lots from active organizations.
- Existing booking creation remains authenticated and tenant scoped.
- Backend work would only be reconsidered if tests or code inspection reveal a blocking contract gap.

## Key Patterns Found

- Public finder page uses `getPublicParkingFinderResults` and card actions.
- Router exposes `/parking-finder` publicly and `/bookings` under protected role routes.
- Bookings page already supports a create-dialog deep link via `?create=1`.
- Login currently redirects to role home after successful authentication; Step 5 needs a safe redirect allowlist for the new booking entry path.

## Activated Agents

| Agent | Role | Status | Notes |
| --- | --- | --- | --- |
| ① Orchestrator | Plan and scope control | Active | Inspected routes, auth, finder, booking, and public finder API behavior. |
| ③ Experience | Frontend implementation | Active | Will wire finder CTA, route alias, and booking form prefill. |
| ⑧ Security | Auth/redirect review | Active | Required because login redirect and booking access routing are touched. |
| ⑨ Testing | Test coverage | Active | Will update finder, booking, login, and router tests. |
| ⑤ Quality | Final quality gate | Pending | Runs after implementation and tests. |
| ⑩ Documentation | Run/report docs | Pending | Updates report and run indexes after verification. |
| ② Core API | Backend/API | Not activated | No backend blocker found during planning. |
*** End Patch
