# Phase 5B — Manual test steps on every PR turn

**Source:** User instruction during Phase 5B implementation (2026-06-19).

## Rule

On **every Phase 5B loop turn** (5B-1 through 5B-6):

1. Include **manual test steps** in the agent response to the human.
2. Post the same steps as a **PR comment** on the open PR for that loop (`gh pr comment <n> --body-file ...`).

## Format

- Use role-specific demo credentials (`password123`):
  - USER: `demo-user@smartparking.demo`
  - SECURITY: `demo-security@smartparking.demo`
  - ADMIN: `demo-admin@smartparking.demo`
- Number steps clearly; group by role or feature area.
- State **expected results** after each step.
- For schema-only PRs (5B-1), document migration/Prisma verification — no UI steps.
- For API PRs (5B-2), include curl or REST client sequence; note `npx prisma migrate deploy` if tables are missing.
- For frontend PRs (5B-3–5B-6), include browser flows and 375px mobile checks where relevant.

## PR comment posting

Prefer `--body-file` on Windows/PowerShell to avoid escaping issues with backticks.

Example:

```bash
gh pr comment 102 --body-file .grok/pr-comments/pr-102-manual-tests.md
```

## Merge workflow (user follow-ups)

When the human says **merge and move to next step** or **merge and sync with develop**:

1. Merge the open PR when CI is green.
2. `git checkout develop && git pull origin develop`
3. Create the next loop branch from fresh `develop`.
4. Continue the next loop in the Phase 5B stack.

Do not start Phase 6 without explicit approval.