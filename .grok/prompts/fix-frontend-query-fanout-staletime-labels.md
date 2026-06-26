# Frontend Query Fan-Out — staleTime + Shared Label Keys

## Goal

Reduce unnecessary frontend API traffic from React Query default refetch-on-mount and duplicate cache keys in `useReferenceLabels`. Set global `staleTime: 30_000` and align hook query keys with BookingsPage, VehiclesPage, and parking-lots list caches.

**PR:** [#144](https://github.com/imkpk/smart-parking-system/pull/144) — merged 2026-06-26  
**Report:** `.grok/reports/frontend-query-fanout-staletime-labels.md`

## Role ownership

| Role | Needed | Reason |
|------|--------|--------|
| ① Orchestrator | Yes | Branch, PR |
| ② Core API | No | |
| ③ Experience | Yes | `useReferenceLabels`, QueryClient |
| ④ Payments | No | |
| ⑤ Quality, Architecture & Release | Yes | Review + report |
| ⑨ Testing | Yes | Hook tests |

## Agent activation

| Agent | ID | Activated | Reason |
|-------|----|-----------|--------|
| Orchestrator | ① | Yes | Always |
| Experience Agent | ③ | Yes | `frontend/src/hooks/useReferenceLabels.ts`, `main.tsx` |
| Testing Agent | ⑨ | Yes | `useReferenceLabels.test.tsx` |
| Quality Agent | ⑤ | Yes | Always — runs last |

## Allowed paths

```text
frontend/src/main.tsx
frontend/src/lib/createAppQueryClient.ts
frontend/src/hooks/useReferenceLabels.ts
frontend/src/pages/payments/PaymentsPage.tsx
frontend/src/pages/vehicles/VehiclesPage.tsx
frontend/src/test/
.grok/reports/
```

## Forbidden paths

```text
backend/
payment-service/
ParkingEventsPage tab-gating (deferred)
Cypress network smoke (deferred)
unrelated refactors / UI redesign
```

## Branch name

`fix/frontend-query-fanout-staletime-labels`

## Scope

1. **Global staleTime** — `defaultOptions.queries.staleTime: 30_000` in QueryClient bootstrap (`main.tsx` / `createAppQueryClient.ts`); preserve `refetchOnWindowFocus: false` and `retry: 1`.
2. **`useReferenceLabels`** — Remove `context` suffix from query keys; align with:
   - `['bookings', 'my' | 'all']`
   - `['vehicles', 'my' | 'all']`
   - `['users']`
   - `['parking-lots']`
   - `['reference-labels', 'all-slots', lotIds]` only when `includeParkingStructure: true`
3. **Call sites** — Remove unused `context` param from `PaymentsPage`, `VehiclesPage`.
4. **Tests** — Shared keys, cache reuse, parking-structure gating; `createTestQueryClient()` mirrors production staleTime.

## Out of scope

- ParkingEventsPage tab-gating
- `invalidateOperationalQueries` narrowing
- Cypress network smoke
- Backend / payment-service changes

## Acceptance criteria

- [ ] Global query `staleTime` is 30 seconds
- [ ] `refetchOnWindowFocus` remains disabled
- [ ] `useReferenceLabels` no longer uses context-specific duplicate keys
- [ ] Parking structure N×lot fan-out gated behind `includeParkingStructure`
- [ ] PaymentsPage/VehiclesPage do not trigger duplicate label-enrichment calls
- [ ] Conversation polling / gate search polling unaffected
- [ ] Frontend build + tests pass (408+ tests)
- [ ] Role ⑤ APPROVE; report at `.grok/reports/frontend-query-fanout-staletime-labels.md`

## Code quality requirements

- Reuse existing page query keys; do not invent parallel key namespaces
- Small focused diff

## React Hooks requirements

- Complete dependency arrays in `useReferenceLabels`
- No conditional hooks

## Design-system requirements

N/A — no UI changes.

## Backend architecture requirements

N/A

## Payment requirements

N/A

## Performance requirements

- Global 30s stale window reduces remount refetches app-wide
- Shared keys eliminate duplicate bookings/vehicles/parking-lots fetches on Payments/Vehicles pages
- `includeParkingStructure` must not run N×lot slot fan-out by default

## Build/test commands

```bash
cd frontend && npm run build && npm run test:run
```

## Manual verification steps

1. Open Payments page — Network tab shows single bookings/vehicles/parking-lots fetch (not duplicates from labels hook)
2. Navigate away and back within 30s — cached data reused
3. Confirm conversation/support pages still poll at 5s where configured

## Expected report file

`.grok/reports/frontend-query-fanout-staletime-labels.md`

## Original task prompt (2026-06-26)

```
/implement Read MASTER_PROMPT.md, .grok/AGENTS.md, docs/agents/ROLES.md, and docs/agents/QUALITY_REVIEW.md first.

Run Phase 0 merge sync before starting.

Branch: fix/frontend-query-fanout-staletime-labels
PR title: fix(frontend): reduce query fan-out with shared cache keys

Goal: Reduce unnecessary frontend API fan-out caused by React Query default refetching and duplicate cache keys.

Scope — only:
1. Add global React Query staleTime: 30_000
2. Fix useReferenceLabels duplicate query keys (remove context suffix; share page keys)

Do not include: ParkingEventsPage tab-gating, operational invalidation narrowing, Cypress smoke, backend changes.

User also asked: "can u check all fan-out effects like these from frontend" — this PR addresses the highest-impact global + useReferenceLabels items; other items deferred.
```