# Public Parking Finder Foundation

## Goal

Build the first Parking Finder foundation: Prisma visibility/geo/pricing fields, unauthenticated `GET /api/public/parking-finder`, public `/parking-finder` page, admin finder configuration fields, and tests. Visitors can search public lots and see bookability without logging in. No booking, map, or payment integration yet.

**PR:** [#140](https://github.com/imkpk/smart-parking-system/pull/140) — merged 2026-06-26

## Role ownership

| Role | Needed | Reason |
|------|--------|--------|
| ① Orchestrator | Yes | Branch, agent-run, prompt, PR |
| ② Core API | Yes | Public finder API module |
| ③ Experience | Yes | Finder page + admin form fields |
| ④ Payments | No | |
| ⑤ Quality, Architecture & Release | Yes | Review gate + report |
| ⑥ Database | Yes | Prisma schema + migration |
| ⑧ Security | Yes | Public unauthenticated endpoint |
| ⑨ Testing | Yes | Backend + frontend specs |
| ⑪ Performance | Yes | Debounced finder queries, staleTime |

## Agent activation

| Agent | ID | Activated | Reason |
|-------|----|-----------|--------|
| Orchestrator | ① | Yes | Always |
| Database Agent | ⑥ | Yes | `backend/prisma/schema.prisma` |
| Core API Agent | ② | Yes | `backend/src/public-parking-finder/` |
| Experience Agent | ③ | Yes | `frontend/src/pages/parking-finder/` |
| Security Agent | ⑧ | Yes | Public endpoint visibility rules |
| Testing Agent | ⑨ | Yes | Specs after writers |
| Performance Agent | ⑪ | Yes | React Query debounce/staleTime |
| Quality Agent | ⑤ | Yes | Always — runs last |

## Allowed paths

```text
backend/prisma/
backend/src/public-parking-finder/
backend/src/parking-lots/dto/
backend/src/app.module.ts
frontend/src/pages/parking-finder/
frontend/src/components/parking-lots/ParkingLotFinderFields.tsx
frontend/src/api/publicParkingFinderApi.ts
frontend/src/types/
frontend/src/router.tsx
frontend/src/pages/parking-lots/
frontend/src/test/
.grok/prompts/
.grok/agent-runs/
.grok/reports/
MASTER_PROMPT.md
```

## Forbidden paths

```text
payment-service/
unrelated dashboard/auth/branding rewrites
deployment config (unless required)
```

## Branch name

`feat/parking-finder-foundation`

## Scope

1. **Database** — Add `ParkingLotVisibility` enum (`PRIVATE`, `PUBLIC`, `INVITE_ONLY`); add `visibility`, `latitude`, `longitude`, `baseHourlyRate`, `currency`, `openingHours` to `ParkingLot` (default `PRIVATE`); migration `20260626200000_parking_lot_finder_fields`; indexes on `visibility`, `city`, `type`, `isActive`.
2. **Backend API** — `GET /api/public/parking-finder` (no auth); filters: active PUBLIC lots from active orgs only; slot counts via floors; `bookable` when `availableSlots > 0`; optional `city`, `vehicleType`, `lat`/`lng`, `limit` (max 50); distance sort when coordinates provided; no `organizationId` in response.
3. **Admin forms** — `ParkingLotFinderFields` on create/edit/settings; visibility, lat/lng, rate, currency, hours; helper text “Only PUBLIC lots appear in Parking Finder.”
4. **Public page** — Route `/parking-finder` (no login); city + vehicle filters; result cards; loading/error/empty states; “Sign in to book” → `/login`; debounced city + `staleTime: 30s`.
5. **Frontend API/types** — `publicParkingFinderApi.ts`, `PublicParkingFinderResult`, `PublicParkingFinderQuery`, `AvailabilityType`.
6. **Tests** — `public-parking-finder.service.spec.ts`, `ParkingFinderPage.test.tsx`, admin form visibility field tests.
7. **Agent scaffolding** — `.grok/agent-runs/2026-06-26-parking-finder-foundation/`, report, MASTER_PROMPT changelog.

## Out of scope

- Booking from finder
- Map / geolocation permission
- External providers
- Payment integration

## Acceptance criteria

- [ ] Public `/parking-finder` works without login
- [ ] Public API returns only PUBLIC active lots from active organizations
- [ ] Private lots never appear; default visibility is PRIVATE
- [ ] Tenant admin can set visibility/geo/pricing fields
- [ ] Finder shows slot counts, pricing, opening hours, bookable status
- [ ] Loading/error/empty states present; “Book” placeholder navigates to login
- [ ] No payment-service / map / external provider changes
- [ ] Backend + frontend build and tests pass; CI green
- [ ] Role ⑤ APPROVE; report at `.grok/reports/parking-finder-foundation.md`
- [ ] `QUALITY_REVIEW.md` §1–13 reviewed; no BLOCK findings

## Code quality requirements

- Reuse existing parking lot DTOs, API client factory, MUI form patterns
- Dedicated `public-parking-finder` module; tenant `/parking-lots` unchanged
- Small focused diff; no drive-by refactors

## React Hooks requirements

- Hooks only at top level; complete dependency arrays
- Debounced filter state; intentional `staleTime` on finder query

## Design-system requirements

- MUI 7 + theme tokens; `ParkingLotFinderFields` matches existing lot forms
- Mobile-friendly card layout on finder page

## Backend architecture requirements

- Thin controller; business logic in `PublicParkingFinderService`
- DTO validation for query params; no raw SQL
- `AccessPolicyService` unchanged for tenant-scoped routes

## Payment requirements

N/A — no payment-service changes.

## Performance requirements

- Debounced city input on finder page
- `staleTime: 30_000` on public finder query to avoid duplicate calls
- Efficient slot counting (no N+1 per lot in public list)

## Build/test commands

```bash
cd backend && npm run prisma:generate && npm run build && npm run test:run
cd frontend && npm run build && npm run test:run
```

## Manual verification steps

1. Mark a demo lot `PUBLIC` with city/lat/lng in admin form
2. Open `http://localhost:5173/parking-finder` logged out
3. Confirm lot appears with slot counts and bookable status
4. Click **Sign in to book** → `/login`
5. Confirm private lots never appear

## Expected report file

`.grok/reports/parking-finder-foundation.md`

## Original task prompt (2026-06-26)

Read `MASTER_PROMPT.md`, `.grok/AGENTS.md`, `docs/agents/ROLES.md`, and `docs/agents/QUALITY_REVIEW.md` first. Run Phase 0 merge sync before starting.

Branch: `feat/parking-finder-foundation`  
PR title: `feat(parking-finder): add public parking finder foundation`

Workflow: Do not merge; open PR for CI/Role ⑤ review; human merges with merge commit (never squash).

User goal: A visitor opens a public Parking Finder page, searches available public parking lots, sees basic lot details, and understands whether a lot is bookable. Foundation only — no booking/payment/map/external providers.

See scope sections 1–6 above for full database, API response shape, admin fields, page requirements, and test matrix from the original prompt.