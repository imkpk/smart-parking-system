# Plan — Agent Quality Review Flow

## Assumptions

- Work on `docs/multi-agent-roles` (PR #132) is functionally complete but wrong branch name per controller spec
- `develop` is integration trunk; no uncommitted human changes on disk
- Docs-only PR skips service CI (path filters)

## Phased execution plan

| Phase | Action | Owner |
|-------|--------|-------|
| 0 | Safety: status, fetch, checkout develop | ① |
| 1 | Orchestration summary | ① |
| 2 | Create `docs-agent-quality-review-flow.md` prompt | ① |
| 3 | Create agent-run folder | ① |
| 4 | Create agent-run task files | ① |
| 5 | Branch `docs/agent-quality-review-flow` from develop | ① |
| 6 | Cherry-pick ROLES + QUALITY_REVIEW commits; add prompt/run/report/MASTER_PROMPT | ① |
| 13 | Role ⑤ review (QUALITY_REVIEW.md self-check) | ⑤ |
| 14 | Report + README + MASTER_PROMPT changelog | ⑤ |
| 15 | Push, open PR, close/supersede #132 | ① |

## Dependencies

- None on backend/frontend/payment code

## Role boundaries

- Only `docs/` and `.grok/` paths touched
- MASTER_PROMPT.md changelog only

## Branch plan

```text
develop
  └── docs/agent-quality-review-flow  (one PR, squash merge)
```

## Expected tests

- No `npm run build` / `mvn package` (docs-only)
- `git diff develop --stat` — confirm allowed paths only

## Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| Duplicate PR #132 vs new PR | Low | Close #132 with superseded note |
| MASTER_PROMPT version drift | Low | Bump to 1.14.0 with changelog |
| Broken markdown links | Low | Manual link check in review |