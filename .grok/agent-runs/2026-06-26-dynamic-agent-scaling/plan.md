# Plan — Dynamic agent scaling

## Assumptions

- Prisma (not TypeORM) — ⑥ Database Agent owns `backend/prisma/`
- Base branch: `develop`

## Active agents this run

| Agent | ID | Reason activated | Execution |
|-------|----|------------------|-----------|
| Orchestrator | ① | Always | Sequential — first |
| Documentation Agent | ⑩ | `docs/agents/`, `.grok/`, `MASTER_PROMPT.md` | Parallel |
| DevOps Agent | ⑦ | `.github/workflows/agent-activation-summary.yml` | Parallel |
| Quality Agent | ⑤ | Always | Sequential — **last** |

**Activation reasoning:** Docs-only infrastructure task — no ②③④⑨ required.

## Phased execution plan

| Phase | Action | Owner | Status |
|-------|--------|-------|--------|
| 0 | Safety + diff scan | ① | ✅ |
| 1–4 | Update ROLES, templates, QUALITY_REVIEW, workflow | ⑩⑦ | ✅ |
| 13 | Role ⑤ self-review | ⑤ | ✅ |
| 14 | Report + README index | ⑤ | ✅ |
| 15 | PR → develop | ① | ⏳ |