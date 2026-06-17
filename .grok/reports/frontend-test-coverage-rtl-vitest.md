# Frontend Test Coverage — Vitest + React Testing Library

**Branch:** `feature/frontend-test-coverage-rtl-vitest`  
**Date:** 2026-06-18  
**Scope:** Frontend only — no backend, payment-service, product behavior, or UI design changes.

## Summary

Established a maintainable frontend testing foundation using Vitest, React Testing Library, jsdom, and shared test providers. Added behavior-focused tests for display helpers, login, route guards, bookings/parking-events regression coverage, and common components.

## Test framework setup

| Piece | Location / command |
|-------|-------------------|
| Runner | Vitest `^3.2.6` with jsdom |
| RTL | `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event` |
| Coverage | `@vitest/coverage-v8@3.2.6` |
| Global setup | `frontend/src/test/setup.ts` — jest-dom matchers, `matchMedia`/`ResizeObserver` mocks |
| Providers helper | `frontend/src/test/test-utils.tsx` — `renderWithProviders`, `createTestQueryClient`, `createMockUser` |
| MUI icon test shim | `frontend/src/test/mocks/` — Vite aliases active only when `process.env.VITEST` is set |
| Scripts | `test`, `test:run`, `test:coverage` in `frontend/package.json` |

`renderWithProviders` wraps components with:

- React Query `QueryClientProvider` (retry disabled in tests)
- `MemoryRouter`
- `ThemeModeProvider` (MUI theme + CssBaseline)

Auth is mocked per test file via `vi.mock('../../providers/AuthProvider')` where needed — no brittle global auth mock.

## Files added / changed

### Added

- `frontend/src/test/setup.ts`
- `frontend/src/test/test-utils.tsx`
- `frontend/src/test/mocks/muiIcon.tsx`
- `frontend/src/test/mocks/muiIconsMaterial.tsx`
- `frontend/src/lib/parkingEventDisplay.test.ts`
- `frontend/src/pages/auth/LoginPage.test.tsx`
- `frontend/src/components/auth/routeGuards.test.tsx`
- `frontend/src/pages/bookings/BookingsPage.test.tsx`
- `frontend/src/pages/parking-events/ParkingEventsPage.test.tsx`
- `frontend/src/components/common/commonComponents.test.tsx`

### Changed

- `frontend/package.json` — RTL/coverage dev deps + test scripts
- `frontend/package-lock.json`
- `frontend/vite.config.ts` — setup file, coverage, sequential fork pool, test-only MUI icon aliases
- `frontend/tsconfig.app.json` — exclude `src/test/**` and `*.test.*` from production typecheck

### Unchanged (reused)

- `frontend/src/lib/bookingDisplay.test.ts` — enriched booking/search coverage retained

## Test cases added

| Area | Tests | Assertions |
|------|-------|------------|
| `bookingDisplay` + `filterBookings` | 2 (existing) | Customer, vehicle, lot, floor, slot labels; enriched search fields |
| `parkingEventDisplay` + `filterParkingEvents` | 2 | Booking/customer/vehicle/lot/floor/slot labels; status search |
| `LoginPage` | 3 | Form render; failed login alert; login called with credentials |
| `ProtectedRoute` / `RoleRoute` | 4 | Unauthenticated redirect; authenticated access; role gate deny/allow |
| `BookingsPage` | 1 | Enriched labels rendered; `getSlots` and `getAvailableSlotsForBooking` not called on mount |
| `ParkingEventsPage` | 1 | Enriched labels rendered; `getSlots` not called on mount |
| Common components | 4 | `SearchField`, `EmptyState`, `PageHeader`, `AppSnackbar` |

**Total:** 30 tests passing (10 files).

## Coverage result

```
All files: 35.69% statements | 54.59% branches | 50.82% functions | 35.69% lines
```

Notable covered areas:

- `BookingsPage.tsx` ~68% statements
- `ParkingEventsPage.tsx` ~72% statements
- `LoginPage.tsx` ~96% statements
- `ProtectedRoute` / `RoleRoute` ~65–95% statements
- Display helpers and `searchFilters` partial coverage

No coverage thresholds enforced in this PR (baseline only).

## Validation commands / results

```bash
cd frontend && npm install          # ✅
cd frontend && npm run build        # ✅
cd frontend && npm run test:run     # ✅ 30/30 passed
cd frontend && npm run test:coverage # ✅ 30/30 passed, report generated
```

## Known deferred test areas

- E2E / Playwright flows (book → check-in → check-out → pay)
- Full `AuthProvider` integration (token storage + `/auth/me` query)
- Register page, dashboard pages, parking-lot CRUD pages
- `useReferenceLabels` hook (legacy reference-label fan-out path)
- DataGrid toolbar interactions beyond initial render (column picker, export)
- Payment / Razorpay UI flows (partial unit coverage exists from prior PRs)
- Coverage thresholds and CI gate (future PR)

## Not included

- Backend or payment-service changes
- Phase 1c tenant onboarding
- Product behavior or UI design changes
- Aggressive coverage thresholds