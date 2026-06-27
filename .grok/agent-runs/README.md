# Agent Runs Index

> Every agent run **MUST** add a row here during Phase 3 (create agent-run folder).

## Merge sync (automatic — run every session)

**Role ⑤ or ①** runs this at **Phase 0** (before any new work) and again after human merges a PR — no manual “please update README” required.

```bash
git fetch origin
# For each row below still marked ⏳ In Progress:
gh pr view <N> --json state,mergedAt
```

| If `state` is | Agent action (same session) |
|---------------|------------------------------|
| `MERGED` | Set index Status → **✅ Merged**; update run folder `README.md`, `status.md`, report `Status`; finalize `MASTER_PROMPT` if pending |
| `OPEN` | Leave **⏳ In Progress** |
| `CLOSED` (not merged) | Set **❌ Abandoned** or **🔀 Superseded** per PR comments |

Human may merge whenever they choose. The agent **notices on the next run** (or end of current run after merge) and closes the loop.

## Naming convention

```text
YYYY-MM-DD-<type>-<slug>
```

Types: `feat` · `fix` · `docs` · `refactor` · `chore`

Example: `2026-06-26-docs-agent-run-infrastructure`

## Status values

| Status | Meaning |
|--------|---------|
| ⏳ In Progress | Run active; PR open or work not merged |
| ✅ Merged | PR merged to `develop` |
| ❌ Abandoned | Run stopped without merge |
| 🔀 Superseded | Replaced by a newer run/PR |

## Templates

- Prompt: [`.grok/prompts/TEMPLATE.md`](../prompts/TEMPLATE.md)
- Run folder: [`.grok/agent-runs/TEMPLATE/`](./TEMPLATE/)
- Quality task: [`TEMPLATE/tasks/quality-release.md`](./TEMPLATE/tasks/quality-release.md)
- Role guide: [`docs/agents/ROLES.md`](../../docs/agents/ROLES.md)
- Quality gate: [`docs/agents/QUALITY_REVIEW.md`](../../docs/agents/QUALITY_REVIEW.md)

## Index

| Date | Folder | Scope | Roles | PR | Status |
|------|--------|-------|-------|-----|--------|
| 2026-06-26 | [agent-quality-review-flow](./2026-06-26-agent-quality-review-flow/) | docs: QUALITY_REVIEW gate + Role ⑤ | ①⑤ | [#133](https://github.com/imkpk/smart-parking-system/pull/133) | ✅ Merged |
| 2026-06-26 | [agent-run-infrastructure](./2026-06-26-agent-run-infrastructure/) | docs: reusable agent-run scaffolding | ①⑤ | [#134](https://github.com/imkpk/smart-parking-system/pull/134) | ✅ Merged |
| 2026-06-26 | [dynamic-agent-scaling](./2026-06-26-dynamic-agent-scaling/) | docs: dynamic agent registry ①–⑫ + CI activation summary | ①⑦⑩⑤ | [#139](https://github.com/imkpk/smart-parking-system/pull/139) | ✅ Merged |
| 2026-06-26 | [parking-finder-foundation](./2026-06-26-parking-finder-foundation/) | feat: public parking finder foundation | ①⑥②③⑧⑨⑪⑤ | [#140](https://github.com/imkpk/smart-parking-system/pull/140) | ✅ Merged |
| 2026-06-26 | — | docs: parking-finder merge sync | ①⑤ | [#141](https://github.com/imkpk/smart-parking-system/pull/141) | ✅ Merged |
| 2026-06-26 | — | fix: parking-finder console errors | ①③⑨⑤ | [#142](https://github.com/imkpk/smart-parking-system/pull/142) | ✅ Merged |
| 2026-06-26 | — | fix: dashboard onboarding API fan-out | ①②⑪⑨⑤ | [#143](https://github.com/imkpk/smart-parking-system/pull/143) | ✅ Merged |
| 2026-06-26 | — | fix: frontend query fan-out staleTime + labels | ①③⑨⑤ | [#144](https://github.com/imkpk/smart-parking-system/pull/144) | ✅ Merged |
| 2026-06-26 | [feat-events-outbox-foundation](./2026-06-26-feat-events-outbox-foundation/) | feat: transactional outbox foundation | ①⑥②⑧⑨⑤ | [#145](https://github.com/imkpk/smart-parking-system/pull/145) | ✅ Merged |
| 2026-06-27 | [parking-events-outbox-publish](./2026-06-27-feat-parking-events-outbox-publish/) | feat: parking check-in/out outbox events | ①②⑧⑨⑩⑫⑤ | [#150](https://github.com/imkpk/smart-parking-system/pull/150) | ✅ Merged |
| 2026-06-27 | [feat-outbox-super-admin-monitor-endpoint](./2026-06-27-feat-outbox-super-admin-monitor-endpoint/) | feat: SUPER_ADMIN outbox monitor endpoint | ①②⑧⑨⑩⑫⑤ | [#151](https://github.com/imkpk/smart-parking-system/pull/151) | ✅ Merged |
| 2026-06-27 | [fix-frontend-parking-events-tab-query-gating](./2026-06-27-fix-frontend-parking-events-tab-query-gating/) | fix: ParkingEventsPage tab query gating | ①③⑨⑩⑪⑤ | [#152](https://github.com/imkpk/smart-parking-system/pull/152) | ✅ Merged |
| 2026-06-27 | [fix-frontend-narrow-operational-invalidations](./2026-06-27-fix-frontend-narrow-operational-invalidations/) | fix: narrow parking operation invalidations | ①③⑨⑩⑤ | TBD | ⏳ In Progress |
