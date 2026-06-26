# Plan — Outbox Super Admin Monitor Endpoint

## Assumptions

- Base branch: `develop`
- PR #150 is merged and present in local `develop`.
- Step 2 is backend-only and must not touch `frontend/` or `payment-service/`.

## Active agents this run

| Agent | ID | Reason activated | Execution |
|-------|----|------------------|-----------|
| Orchestrator | ① | Always; Phase 0 merge sync, branch, scope, PR | Sequential — first |
| Core API Agent | ② | `backend/src/events` controller/service/module changes | Sequential |
| Security Agent | ⑧ | Protected endpoint requires `JwtAuthGuard`, `RolesGuard`, and `SUPER_ADMIN` only | Sequential |
| Testing Agent | ⑨ | Specs added for monitor access, filters, summary, safe fields, read-only behavior | After implementation |
| Documentation Agent | ⑩ | `.grok` run/report indexes and `MASTER_PROMPT.md` changelog | After tests |
| Events Agent | ⑫ | Outbox/event monitor code in `backend/src/events` | Sequential |
| Quality Agent | ⑤ | Always; final diff and verification gate | Sequential — last |

**Activation reasoning:** Backend event/outbox code activates ② and ⑫; guard/role-sensitive access activates ⑧; new specs activate ⑨; status/report updates activate ⑩.

## Expected changed paths

- `backend/src/events/**`
- `backend/docs/openapi.yaml`
- `.grok/agent-runs/**`
- `.grok/reports/**`
- `MASTER_PROMPT.md`

## Expected tests

```bash
cd backend
npm run build
npm run test:run
```

## Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Exposing outbox payload | High | Select only safe fields; test `payload` is not selected |
| Endpoint accessible to tenant roles | High | Class-level `JwtAuthGuard`, `RolesGuard`, and `@Roles(Role.SUPER_ADMIN)`; controller metadata tests |
| Worker behavior changes | Medium | Add monitor service only; no changes to `OutboxWorkerService` |
