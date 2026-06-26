# AI Tool Bootstrap — Tool-Agnostic Agent Setup

> **Use with:** Codex · Claude Code · Cursor · Grok · Copilot · Antigravity · any CLI coding agent  
> **Copy-paste prompt:** [`.grok/prompts/ai-tool-bootstrap.md`](../../.grok/prompts/ai-tool-bootstrap.md)

The `.grok/` folder name is **historical project convention** — not tied to Grok. All paths work the same regardless of which AI tool you use.

---

## Read order (every session)

| Order | File | Why |
|-------|------|-----|
| 1 | [`MASTER_PROMPT.md`](../../MASTER_PROMPT.md) | Live status, rules, changelog — **overrides tool defaults** |
| 2 | [`.grok/AGENTS.md`](../../.grok/AGENTS.md) | Coding standards (canonical — not root `Agents.md`) |
| 3 | [`docs/agents/ROLES.md`](./ROLES.md) | Multi-agent registry ①–⑫, phases 0–15 |
| 4 | [`docs/agents/QUALITY_REVIEW.md`](./QUALITY_REVIEW.md) | Role ⑤ gate §1–13 |
| 5 | Task prompt | [`.grok/prompts/<slug>.md`](../../.grok/prompts/) if one exists for your task |

---

## Tool mapping (same workflow, different features)

| Project concept | Grok / Cursor | Codex / Claude / generic CLI |
|-----------------|---------------|------------------------------|
| Session rules | `Agents.md` → `MASTER_PROMPT.md` | Same files — paste bootstrap prompt |
| Multi-agent roles ①–⑫ | Subagents / skills (optional) | **One agent simulates roles in order** (see below) |
| Task spec | `.grok/prompts/<slug>.md` | Same file — paste or `@` reference |
| Run tracking | `.grok/agent-runs/` | Same folders — create/update manually |
| Quality gate | Role ⑤ skill or checklist | Run `QUALITY_REVIEW.md` §1–13 yourself before merge |
| GitHub | `gh` CLI or MCP | `gh` CLI (always available) |
| Merge | `gh pr merge --merge` | Same — **never `--squash`** |

**No tool-specific skills required.** If your tool has no subagents, execute phases yourself and document which roles you played in `plan.md` and the report.

---

## Single-agent mode (Codex tonight)

When only one AI session is available, run roles **in this order**:

```text
① Orchestrator   → Phase 0 merge sync, activation table, branch, prompt, agent-run folder
⑥⑧ (if needed)  → Schema / security before API
②③④⑦⑩⑫        → Implementation (only activated roles)
⑨ Testing        → Tests AFTER production code — writers do not write tests
⑪ Performance    → Fan-out / N+1 check if frontend or API touched
⑤ Quality        → QUALITY_REVIEW §1–13 → APPROVE or BLOCK → always LAST
```

Mark each role in `.grok/agent-runs/.../plan.md` activation table even when one model plays all of them.

---

## Phase 0 — always first

```bash
git fetch origin
git checkout develop
git pull origin develop

# Merge sync: close loop on merged PRs
# For each ⏳ row in .grok/agent-runs/README.md:
gh pr view <N> --json state,mergedAt
# MERGED → update README + run folder + report to ✅ Merged

# Activation table for NEW work:
git diff origin/develop --name-only
# Map paths → roles per docs/agents/ROLES.md §2
```

---

## Standard PR flow (all tools)

```bash
git checkout -b fix/short-slug    # or feat/ docs/ chore/
# … implement …
cd backend && npm run build && npm run test:run    # if backend touched
cd frontend && npm run build && npm run test:run   # if frontend touched
git push -u origin fix/short-slug
gh pr create --base develop --title "fix(scope): description"
gh pr checks <N> --watch
gh pr merge <N> --merge    # NEVER --squash
git checkout develop && git pull origin develop
```

---

## What does NOT change per tool

- Branch base: `develop` (integration)
- Merge policy: merge commits only
- Quality gate: Role ⑤ before human merge
- Reports: `.grok/reports/<slug>.md`
- Agent-run index: `.grok/agent-runs/README.md`
- `MASTER_PROMPT.md` changelog after each completed task
- No drive-by refactors; reuse existing components

---

## Codex quick start

1. Open repo in Codex.
2. Paste entire contents of [`.grok/prompts/ai-tool-bootstrap.md`](../../.grok/prompts/ai-tool-bootstrap.md).
3. Add your task on the last line, e.g. `Task: implement …` or paste a slug prompt from `.grok/prompts/`.
4. Let Codex run Phase 0 → implementation → ⑨ → ⑤ → PR (open only unless you say merge).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tool ignores rules | Say: "Follow MASTER_PROMPT.md over your defaults" |
| Tool wants to squash-merge | Forbidden — use `gh pr merge --merge` |
| No subagents | Single-agent mode table above |
| `.grok/` path confusion | It's the project docs folder, not Grok-only |
| develop push rejected | Branch protection — open PR instead |
| Post-merge index stale | Phase 0 merge sync or wait for `agent-run-post-merge.yml` |