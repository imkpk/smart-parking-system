<!-- TEMPLATE: copy this folder to .grok/agent-runs/YYYY-MM-DD-<slug>/ and fill placeholders -->

# Plan — [Short task name]

## Assumptions

- [Assumption 1]
- Base branch: `develop`

## Phased execution plan

| Phase | Action | Owner |
|-------|--------|-------|
| 0 | Safety: status, fetch, checkout base branch | ① |
| 1 | Orchestration summary | ① |
| 2 | Create prompt file | ① |
| 3 | Create agent-run folder | ① |
| 4 | Create agent-run task files | ① |
| 5 | Branch from develop | ① |
| 6 | Implementation | ②③④ |
| 13 | Role ⑤ quality review | ⑤ |
| 14 | Report + README + MASTER_PROMPT changelog | ⑤ |
| 15 | Push + open PR | ① |

## Role boundaries

| Role | Owns | Never touches |
|------|------|---------------|
| ② | `backend/` | `frontend/`, `payment-service/` |
| ③ | `frontend/` | `backend/` schema, `payment-service/` |
| ④ | `payment-service/` | NestJS routes, React UI |
| ⑤ | Review, reports, CI gate docs | Feature code (except test/CI fixes) |

## Branch plan

```text
develop
  └── <type>/<slug>  →  develop (merge commit — never squash)
```

## Expected tests

```bash
# Per touched service — see prompt Build/test commands
```

## Risks

| Risk | Level | Mitigation |
|------|-------|------------|
| [Risk] | Low/Med/High | [Mitigation] |