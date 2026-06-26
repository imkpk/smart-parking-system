# Dashboard Onboarding API Fan-Out

## Goal

Replace `TenantAdminQuickActions` per-lot floors/slots `useQueries` fan-out (N lots → 2N+ API calls, 429 throttle) with a single aggregated `GET /api/dashboard/onboarding-status`. Raise default API throttle to 120/min, add dashboard `staleTime: 30s`, and add Cypress network regression smoke.

**PR:** [#143](https://github.com/imkpk/smart-parking-system/pull/143) — merged 2026-06-26

## Role ownership

| Role | Needed | Reason |
|------|--------|--------|
| ① Orchestrator | Yes | Branch, HAR analysis, PR |
| ② Core API | Yes | Onboarding status endpoint |
| ③ Experience | Yes | TenantAdminQuickActions refactor |
| ④ Payments | No | |
| ⑤ Quality, Architecture & Release | Yes | Review gate |
| ⑨ Testing | Yes | Unit + Cypress smoke |
| ⑪ Performance | Yes | Fan-out + throttle review |

## Agent activation

| Agent | ID | Activated | Reason |
|-------|----|-----------|--------|
| Orchestrator | ① | Yes | Always |
| Core API Agent | ② | Yes | `backend/src/dashboard/` |
| Experience Agent | ③ | Yes | `TenantAdminQuickActions.tsx` |
| Testing Agent | ⑨ | Yes | Dashboard tests + Cypress |
| Performance Agent | ⑪ | Yes | HAR showed 429 from fan-out |
| Quality Agent | ⑤ | Yes | Always — runs last |

## Allowed paths

```text
backend/src/dashboard/
backend/src/app.module.ts
frontend/src/components/dashboard/TenantAdminQuickActions.tsx
frontend/src/components/dashboard/OperatorDashboardShell.tsx
frontend/src/components/dashboard/RecentActivityTimeline.tsx
frontend/src/api/dashboardApi.ts
frontend/src/lib/dashboardQueryOptions.ts
frontend/src/types/dashboard.ts
frontend/src/test/
cypress/e2e/smoke/dashboard-onboarding-network.cy.ts
MASTER_PROMPT.md
```

## Forbidden paths

```text
payment-service/
unrelated dashboard UI redesign
global React Query changes (deferred to #144)
```

## Branch name

`fix/dashboard-onboarding-fanout`

## Scope

1. **Backend** — `DashboardService.getOnboardingStatus(currentUser)` aggregates: has parking lot, has floor, has slot, has team members (users summary); tenant-scoped via `AccessPolicyService`; type `DashboardOnboardingStatus`.
2. **Endpoint** — `GET /api/dashboard/onboarding-status` on `DashboardController`; JWT + role guard (tenant admin paths).
3. **Frontend** — Replace per-lot `useQueries` for floors/slots in `TenantAdminQuickActions` with single `useQuery` to `getOnboardingStatus`; preserve chip UX, a11y labels, disabled states, navigation guards.
4. **Throttle** — Default `THROTTLE_LIMIT` 120/min in `app.module.ts` (was 10/min causing 429 on dashboard load).
5. **Dashboard cache** — `staleTime: 30_000` via `dashboardQueryOptions.ts` on dashboard queries.
6. **Tests** — Update `TenantAdminQuickActions.test.tsx`, `dashboardApi.test.ts`, `dashboard.service.spec.ts`; mock `getOnboardingStatus` in dashboard page tests.
7. **Cypress** — `dashboard-onboarding-network.cy.ts` asserts bounded network calls on admin dashboard load.

## Out of scope

- Global React Query `staleTime` (PR #144)
- `useReferenceLabels` key sharing (PR #144)
- Parking lot workspace tab fan-out (see `fix-parking-lot-workspace-tab-fanout.md` — landed same branch)

## Acceptance criteria

- [ ] Dashboard load uses one onboarding-status call instead of per-lot floors/slots fan-out
- [ ] Onboarding chips still reflect lot/floor/slot/team state correctly
- [ ] Default throttle ≥ 120 req/min; dashboard no longer 429s with 5 lots
- [ ] Dashboard queries use 30s staleTime override
- [ ] Cypress network smoke passes
- [ ] Backend + frontend build and tests pass
- [ ] Role ⑤ APPROVE; `MASTER_PROMPT.md` v1.16.5 changelog

## Code quality requirements

- Reuse `AccessPolicyService`, existing dashboard module boundaries
- Thin controller; aggregation logic in `DashboardService`

## React Hooks requirements

- Single `useQuery` for onboarding status; no conditional hooks
- Preserve role-gated `enabled` flags

## Design-system requirements

- No visual redesign of quick actions panel; chips/tooltips unchanged

## Backend architecture requirements

- Tenant-scoped queries only; no N+1 per lot in onboarding endpoint
- Efficient counts/flags in one or few Prisma queries

## Payment requirements

N/A

## Performance requirements

- One aggregated API call replaces O(N) floors + O(N) slots calls
- Dashboard `staleTime: 30_000` reduces remount refetches
- Throttle limit aligned with realistic dashboard fan-out

## Build/test commands

```bash
cd backend && npm run build && npm run test:run
cd frontend && npm run build && npm run test:run
```

## Manual verification steps

1. Log in as tenant admin with multiple parking lots
2. Open dashboard; DevTools Network — confirm single `onboarding-status` call (not N× floors/slots)
3. Confirm quick-action chips enable/disable correctly
4. Reload dashboard — no 429 responses

## Expected report file

N/A — documented in `MASTER_PROMPT.md` v1.16.5.

## Original task prompt (2026-06-26)

Triggered by HAR analysis (`localhost.har` on dashboard): `TenantAdminQuickActions` fired 5× floors + 5× slots → **429** against 10 req/min throttle.

User: “can u check this har file im on dashboard” and “can u merge prs one by one keep syncing develop im not sure is this fan-out issue fixed or not”.

Fix: Aggregate onboarding checks server-side; refactor frontend to single query; raise throttle default; add network regression test.