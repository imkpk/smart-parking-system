# Plan — Frontend Parking Events Tab Query Gating

## Assumptions

- Base branch: `develop`.
- Step 2 PR #151 remains separate and untouched.
- Step 4 and Step 5 must not start.

## Active agents this run

| Agent | ID | Reason activated | Execution |
|-------|----|------------------|-----------|
| Orchestrator | ① | Always; scope and branch control | Sequential — first |
| Experience Agent | ③ | Frontend page query gating in `ParkingEventsPage` | Sequential |
| Testing Agent | ⑨ | Focused page tests for tab-driven query behavior | After implementation |
| Documentation Agent | ⑩ | Run folder, report, indexes, changelog | After tests |
| Performance Agent | ⑪ | API fan-out reduction from inactive tab queries | Review with ③/⑤ |
| Quality Agent | ⑤ | Final review and verdict | Sequential — last |

**Activation reasoning:** The diff is frontend-only and performance-related; tests and documentation are required by the prompt.

## Expected changed paths

- `frontend/src/pages/parking-events/ParkingEventsPage.tsx`
- `frontend/src/test/pages/parking-events/ParkingEventsPage.test.tsx`
- `.grok/agent-runs/**`
- `.grok/reports/**`
- `MASTER_PROMPT.md`

## Expected tests

```bash
cd frontend
npm run test:run -- ParkingEventsPage.test.tsx
npm run build
npm run test:run
```

## Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Admin history no longer loads | Medium | Tests switch to history tab and assert `getParkingEvents` fires |
| USER history accidentally disabled | High | USER test asserts history query fires and active query does not |
| SECURITY behavior regresses | High | SECURITY test asserts active-only behavior and no history tab |
| Full test suite appears hung | Medium | Verified targeted test; full suite passes with longer timeout because current suite runs ~5m23s |
