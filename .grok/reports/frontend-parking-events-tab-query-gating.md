# Frontend Parking Events Tab Query Gating

Status: PR pending
Branch: `fix/frontend-parking-events-tab-query-gating`
Date: 2026-06-27

## Summary

Reduced API fan-out on `ParkingEventsPage` by enabling each parking event query only when its tab is active:

- Active events query now runs only for operators on the active tab.
- Admin all/history query now runs only after switching to the history tab.
- USER history remains enabled by default because USER lands directly on history.
- SECURITY remains active-only and does not fetch history/all events.

## Root Cause Of Previous Timeout

The timeout was not caused by a hanging Parking Events test or unresolved `waitFor`.

Evidence:

- Targeted `ParkingEventsPage.test.tsx` passed in 41.73s.
- Full `npm run test:run` passed in 322.56s with 73 files and 416 tests.
- Previous tool ceilings of 120s and 300s were shorter than the current serialized frontend suite runtime.

## Active Agents

| Agent | ID | Reason activated |
|-------|----|------------------|
| Orchestrator | ① | Scope control, branch, verification, PR |
| Experience Agent | ③ | Frontend page query gating |
| Testing Agent | ⑨ | Tab query behavior tests |
| Documentation Agent | ⑩ | Run/report/changelog updates |
| Performance Agent | ⑪ | API fan-out reduction |
| Quality Agent | ⑤ | Final quality gate |

## Verification

- `cd frontend && npm run test:run -- ParkingEventsPage.test.tsx` ✅ 1 file, 12 tests, 41.73s
- `cd frontend && npm run build` ✅
- `cd frontend && npm run test:run` ✅ 73 files, 416 tests, 322.56s

## Role ⑤ Verdict

APPROVE

No blockers. Scope is frontend-only, behavior is role-preserving, and inactive tab API calls are gated.
