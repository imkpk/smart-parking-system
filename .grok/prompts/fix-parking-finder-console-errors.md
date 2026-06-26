# Parking Finder Console Errors

## Goal

Silence expected console noise on the public `/parking-finder` page: skip stale `auth/me` bootstrap on public routes, omit JWT on public API calls, suppress handled React Query errors, and add automated console-error checks. Extend Role ⑤ §10 with a browser console gate for new/changed pages.

**PR:** [#142](https://github.com/imkpk/smart-parking-system/pull/142) — merged 2026-06-26

## Role ownership

| Role | Needed | Reason |
|------|--------|--------|
| ① Orchestrator | Yes | Branch, PR, merge sync |
| ② Core API | No | |
| ③ Experience | Yes | Auth bootstrap, API client, finder page |
| ④ Payments | No | |
| ⑤ Quality, Architecture & Release | Yes | §10 console gate + report |
| ⑨ Testing | Yes | `spyConsoleErrors()` tests |

## Agent activation

| Agent | ID | Activated | Reason |
|-------|----|-----------|--------|
| Orchestrator | ① | Yes | Always |
| Experience Agent | ③ | Yes | `frontend/src/providers/`, `createApiClient.ts`, finder page |
| Testing Agent | ⑨ | Yes | Console assertion helpers + page tests |
| Quality Agent | ⑤ | Yes | Always — runs last |

## Allowed paths

```text
frontend/src/providers/AuthProvider.tsx
frontend/src/api/createApiClient.ts
frontend/src/lib/createAppQueryClient.ts
frontend/src/lib/publicRoutes.ts
frontend/src/lib/publicApiPaths.ts
frontend/src/lib/pathnameStore.ts
frontend/src/hooks/usePathname.ts
frontend/src/main.tsx
frontend/src/pages/parking-finder/
frontend/src/test/
docs/agents/QUALITY_REVIEW.md
.grok/agent-runs/TEMPLATE/tasks/quality-release.md
MASTER_PROMPT.md
```

## Forbidden paths

```text
backend/
payment-service/
unrelated page rewrites
```

## Branch name

`fix/parking-finder-console-errors`

## Scope

1. **Public route detection** — `publicRoutes.ts`, `pathnameStore.ts`, `usePathname.ts` so auth layer knows when user is on `/parking-finder` (and other public routes).
2. **Skip auth bootstrap** — `AuthProvider` does not call `auth/me` on public routes when no valid session expected.
3. **Public API client** — `createApiClient.ts` omits JWT Authorization header for paths in `publicApiPaths.ts` (e.g. `/public/parking-finder`).
4. **React Query noise** — `createAppQueryClient.ts` suppresses logging for handled query errors; finder page sets `throwOnError: false` where appropriate.
5. **Tests** — `spyConsoleErrors()` in `frontend/src/test/consoleAssertions.ts`; `ParkingFinderPage.test.tsx` asserts no unexpected `console.error`/`console.warn` on happy/empty/error paths; `createApiClient.test.ts`, `publicRoutes.test.ts`, `publicApiPaths.test.ts`.
6. **Quality gate docs** — `QUALITY_REVIEW.md` §10 adds browser console check; template `quality-release.md` updated.

## Out of scope

- Parking finder feature changes (already in #140)
- Backend auth changes
- Global console suppression outside public/finder paths

## Acceptance criteria

- [ ] `/parking-finder` loads logged out without `auth/me` 401 console errors
- [ ] Public finder API calls do not send stale JWT
- [ ] Handled React Query errors do not spam console on finder page
- [ ] `ParkingFinderPage` tests include console-error assertions
- [ ] `QUALITY_REVIEW.md` §10 documents browser console gate
- [ ] Frontend build + tests pass; CI green
- [ ] Role ⑤ APPROVE
- [ ] `MASTER_PROMPT.md` changelog v1.16.3

## Code quality requirements

- Reuse existing API client factory; minimal new abstractions
- Public path lists centralized in `publicRoutes` / `publicApiPaths`

## React Hooks requirements

- `usePathname` follows hooks rules; no conditional hooks in AuthProvider

## Design-system requirements

N/A — no visual changes.

## Backend architecture requirements

N/A

## Payment requirements

N/A

## Performance requirements

- Skipping unnecessary `auth/me` on public routes reduces network noise

## Build/test commands

```bash
cd frontend && npm run build && npm run test:run
```

## Manual verification steps

1. Open DevTools console; visit `/parking-finder` logged out
2. Confirm no unexpected `console.error` / `console.warn` during load, empty state, and filter change
3. Confirm finder results still load correctly

## Expected report file

N/A — changelog entry in `MASTER_PROMPT.md` v1.16.3 documents fix.

## Original task prompt (2026-06-26)

User reported: **“getting console errors”** on the public parking finder page after PR #140. Request: add console-error checks to quality reviews.

Agent task: Fix root causes (stale auth bootstrap, JWT on public APIs, handled RQ errors) and add `spyConsoleErrors()` test coverage plus `QUALITY_REVIEW.md` §10 browser console gate.

Branch: `fix/parking-finder-console-errors`  
PR title: `fix(parking-finder): silence public page console errors`