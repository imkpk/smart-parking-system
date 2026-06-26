You are working in:

`https://github.com/imkpk/smart-parking-system`

You are the implementation agent. Work autonomously in a loop. Do not ask the human for routine approvals. Only stop if you hit a true blocker.

Goal:
Prepare and execute the Cypress/E2E rollout without human interference.

Important human instruction:
The human does not want to manually supervise every PR. You must run prompt-by-prompt, create PRs, watch CI, fix failures, merge only when green, then continue to the next prompt.

Repository rules:

* Read `MASTER_PROMPT.md` and `.grok/AGENTS.md` before doing anything.
* Use `develop` as the base branch for all SaaS work.
* Never merge `develop` into `single-tenant`.
* Do not start Phase 1c during this E2E rollout.
* Do not change backend business logic unless explicitly required for deterministic E2E setup.
* Do not change payment-service business logic.
* Do not change frontend product behavior except Cypress/testability work required by the prompt.
* Keep each PR focused.
* Enable auto-merge on every PR when branch protection allows.
* Do not idle-wait for CI after opening a PR — start the next safe branch while checks run.
* Merge PRs when CI is green, PR is mergeable, and there are no unresolved blocking review comments (auto-merge handles this when enabled).
* If merge permissions or auto-merge are unavailable, report the PR link, CI status, and exact next action — continue only when safe.
* Never leave stale PRs open across phase boundaries.

Autonomous loop protocol:

```text
1. Sync develop (`git fetch && git pull origin develop`).
2. Create branch for current prompt.
3. Make only scoped changes.
4. Run fast local validation (`npm run build` + `npm run test:run` for touched services).
5. Commit and push.
6. Open PR to develop early.
7. Enable auto-merge when possible (`gh pr merge <n> --auto --merge` only — never `--squash`).
8. Start the next prompt branch immediately — do not idle-wait for CI.
9. Before opening a dependent PR, fetch latest develop and merge/rebase if needed.
10. If CI fails on an open PR, inspect logs, fix, push again (max 3 attempts per issue).
11. Merge stacked PRs in dependency order (base slice before dependent slice).
12. Pull latest develop after a merge before starting work that depends on it.
```

PR CI runs fast gates (build + unit tests). Full coverage and Cypress smoke run on `develop` push after merge. See `.grok/reports/ci-fast-pr-gates-and-agent-flow.md`.

============================================================
LOOP 00 — Create E2E agent playbook and prompt pack
===================================================

Branch:

`docs/e2e-agent-playbook`

PR title:

`docs(e2e): add agent playbook and Cypress prompt pack`

Scope:
Docs/prompts only.

Do not install Cypress yet.
Do not implement Cypress yet.

Create:

```text
.grok/prompts/e2e-00-agent-playbook.md
.grok/prompts/e2e-01-strategy-and-registry.md
.grok/prompts/e2e-02-cypress-foundation.md
.grok/prompts/e2e-03-core-parking-smoke.md
.grok/prompts/e2e-04-cypress-ci-stage.md
.grok/prompts/e2e-05-policy-and-release-pack-docs.md
.grok/reports/e2e-agent-playbook.md
```

Update:

```text
.grok/AGENTS.md
MASTER_PROMPT.md
.grok/reports/README.md
```

Add this policy to `.grok/AGENTS.md`:

````markdown
## Cypress / E2E Agent Rules

Cypress E2E is for sellable user journeys, not every component.

Use this rule:

```text
New sellable user journey      → add/update Cypress smoke
Changed sellable user journey  → update Cypress smoke
Visible UI regression          → add regression smoke if it affects a real flow
Style-only/internal change     → Cypress not required unless usability is affected
````

Smoke tests live in:

```text
frontend/cypress/e2e/smoke/
```

Future full regression tests may live in a separate protected repo:

```text
smart-parking-e2e
```

Do not create the separate repo until the human explicitly asks.

Definition of done for user-facing UI:

```text
1. Vitest/RTL covers changed UI logic.
2. Cypress smoke exists or is updated for changed sellable journey.
3. Journey registry is updated.
4. Smoke passes locally or in CI depending rollout phase.
```

Do not make Cypress flaky:

```text
- Prefer accessible selectors.
- Use data-testid only where MUI/DataGrid is painful.
- Do not use arbitrary cy.wait(5000).
- Use seeded/API-created data, not manual local DB state.
- Use timestamp-based unique values.
- Do not test real Razorpay in PR CI.
- Stub Razorpay only where needed.
- Keep smoke happy-path only.
- Put edge cases in Vitest/backend tests.
```

Never merge an E2E PR with failing CI.
Never silently delete failing smoke coverage.
Flaky smoke = P0 quality issue; quarantine max 48 hours with a ticket.

````

Update `MASTER_PROMPT.md`:
- Version: `1.4.4`
- Current branch: `docs/e2e-agent-playbook`
- Add an E2E/Cypress control section with:
  - `.grok/e2e/journey-registry.md`
  - `.grok/prompts/e2e-*.md`
  - `frontend/cypress/e2e/smoke/`
  - `.grok/reports/e2e-agent-playbook.md`
- Add changelog row:

```markdown
| 2026-06-18 | 1.4.4 | Grok | Added E2E/Cypress agent playbook and prompt pack. Future UI/user-flow PRs must update Cypress smoke or document why not. |
````

Create `.grok/reports/e2e-agent-playbook.md` with:

* Purpose
* Files added
* Files updated
* Same-PR UI/E2E rule
* Journey registry requirement
* Monorepo smoke first
* Separate regression repo later
* No flaky Cypress gate
* No real Razorpay in PR CI
* Never merge develop into single-tenant
* Next execution order: E2E 01 → E2E 05

Create each `.grok/prompts/e2e-*.md` as a real executable prompt, not a placeholder.

The prompt files must define:

```text
E2E 01 — Strategy and Journey Registry
E2E 02 — Cypress Foundation
E2E 03 — Core Parking Smoke
E2E 04 — Cypress CI Stage
E2E 05 — Policy and Release Pack Docs
```

Each prompt file must include:

* branch name
* PR title
* files to read
* files to create/update
* scope restrictions
* exact validation commands
* commit message
* merge rules

Commit:

```bash
git add .grok/AGENTS.md MASTER_PROMPT.md .grok/prompts .grok/reports
git commit -m "docs(e2e): add agent playbook and Cypress prompt pack"
git push -u origin docs/e2e-agent-playbook
```

Open PR to `develop`.
Wait for CI.
Fix CI if needed.
Merge only when green.
Pull latest `develop`.

============================================================
LOOP 01 — Strategy and Journey Registry
=======================================

Read and execute:

`.grok/prompts/e2e-01-strategy-and-registry.md`

Expected branch:

`docs/e2e-strategy-and-journey-registry`

Expected PR title:

`docs(e2e): add Cypress journey strategy and registry`

This PR must create:

```text
.grok/e2e/journey-registry.md
.grok/reports/e2e-strategy-hybrid-model.md
```

Journey registry must include J1–J14:

```text
J1  Login → role home redirect
J2  Register → correct dashboard
J3  Register vehicle → appears in list
J4  Book slot → booking visible
J5  Security/Admin check-in → active event
J6  Security/Admin check-out → completed event
J7  User views parking/payment history
J8  Payment initiation / Razorpay stub
J9  Admin creates parking lot
J10 Admin manages floors/slots
J11 Admin views bookings/payments grids
J12 Admin mock payment success/fail
J13 Admin dashboard summary loads
J14 Unauthorized route blocked / logout
```

Merge only when green.
Pull latest `develop`.

============================================================
LOOP 02 — Cypress Foundation
============================

Read and execute:

`.grok/prompts/e2e-02-cypress-foundation.md`

Expected branch:

`feature/cypress-e2e-foundation`

Expected PR title:

`test(e2e): add Cypress smoke foundation`

This PR should add:

* Cypress dependency
* Cypress config
* support commands
* auth smoke
* vehicles smoke
* package scripts

Expected scripts:

```json
{
  "e2e:open": "cypress open",
  "e2e:smoke": "cypress run --spec \"cypress/e2e/smoke/**/*.cy.ts\"",
  "e2e:ci": "start-server-and-test dev http://localhost:5173 e2e:smoke"
}
```

Cover:

* J1 login redirect
* J14 protected route blocked
* J3 vehicle page/create/list if stable

Validation:

```bash
cd frontend
npm run build
npm run test:run
npm run e2e:smoke
```

If `npm run e2e:smoke` cannot run because backend/DB is not running, document exact local stack commands and either:

* start backend/frontend/DB and run it, or
* mark the blocker clearly in the report.

Do not fake passing E2E.

Merge only when green.
Pull latest `develop`.

============================================================
LOOP 03 — Core Parking Smoke
============================

Read and execute:

`.grok/prompts/e2e-03-core-parking-smoke.md`

Expected branch:

`feature/cypress-core-parking-smoke`

Expected PR title:

`test(e2e): cover core parking lifecycle smoke`

This PR should add:

* booking lifecycle smoke
* security gate/check-in/check-out smoke
* payment initiation smoke if stable

Cover:

* J4 booking visible
* J5 check-in active event
* J6 check-out completed event
* J8 payment initiation, no real Razorpay

Must include regression checks:

* Bookings page initial load must not fan out repeated broad slots API calls.
* Parking Events page initial load must not fan out repeated broad slots API calls.

Use network intercept:

```text
GET **/parking-lots/*/slots**
```

Assert it is not called during initial Bookings/Parking Events page load.

Validation:

```bash
cd frontend
npm run build
npm run test:run
npm run e2e:smoke
```

Merge only when green.
Pull latest `develop`.

============================================================
LOOP 04 — Cypress CI Stage
==========================

Read and execute:

`.grok/prompts/e2e-04-cypress-ci-stage.md`

Expected branch:

`ci/cypress-smoke-stage`

Expected PR title:

`ci(e2e): add Cypress smoke stage`

This PR should add an `e2e-smoke` job to `.github/workflows/ci.yml`.

Run E2E when:

* push
* frontend changed
* backend changed
* workflow changed

Do not run E2E for:

* docs-only
* `.grok` reports/prompts-only
* payment-service-only unless payment UI/API contract is affected

If E2E full-stack startup is unstable in CI:

* make the job advisory/manual first
* document blocker
* do not create a flaky required check

Merge only when green.
Pull latest `develop`.

============================================================
LOOP 05 — Policy and Release Pack Docs
======================================

Read and execute:

`.grok/prompts/e2e-05-policy-and-release-pack-docs.md`

Expected branch:

`docs/e2e-policy-and-release-pack`

Expected PR title:

`docs(e2e): add release regression policy`

This PR should finalize:

* same-PR Cypress update rule
* release regression policy
* future `smart-parking-e2e` separate repo rules
* explicit app SHA requirement
* PR template UI/E2E checklist
* single-tenant minimal smoke subset
* flake policy

Update or create:

`.github/pull_request_template.md`

Add:

```markdown
## UI/E2E impact
- [ ] No UI/user-flow change
- [ ] Existing Cypress coverage still applies
- [ ] Added/updated Cypress smoke test
- [ ] Cypress not needed because this is style-only/internal
- [ ] Journey ID: J__
```

Merge only when green.
Pull latest `develop`.

============================================================
FINAL LOOP — Verify rollout complete
====================================

After LOOP 00–05 are merged, verify fresh develop:

```bash
git checkout develop
git pull origin develop
```

Confirm files exist:

```text
.grok/e2e/journey-registry.md
.grok/prompts/e2e-00-agent-playbook.md
.grok/prompts/e2e-01-strategy-and-registry.md
.grok/prompts/e2e-02-cypress-foundation.md
.grok/prompts/e2e-03-core-parking-smoke.md
.grok/prompts/e2e-04-cypress-ci-stage.md
.grok/prompts/e2e-05-policy-and-release-pack-docs.md
frontend/cypress.config.ts
frontend/cypress/e2e/smoke/
.github/pull_request_template.md
```

Run final validation:

```bash
cd frontend
npm run build
npm run test:run
npm run e2e:smoke
```

Create final report:

`.grok/reports/e2e-rollout-final-summary.md`

Final report must include:

* PR links for every loop
* Merge status
* CI status
* Cypress specs added
* Journey registry final status
* Any deferred journeys with reason
* Exact commands for future agents
* Whether E2E CI is advisory or required

If final report is added after all PRs, open a final docs PR:

Branch:

`docs/e2e-rollout-final-summary`

PR title:

`docs(e2e): add rollout final summary`

Merge only when green.

============================================================
STOP CONDITIONS
===============

Stop and report only if:

* GitHub permissions prevent branch creation, PR creation, or merge
* CI fails after 3 fix attempts on the same issue
* A test requires backend/product behavior changes outside scope
* Cypress cannot be made deterministic without a backend test-data endpoint
* Merge conflict cannot be resolved safely
* Human review is explicitly required by branch protection

Report format if stopped:

```text
Stopped at: LOOP __
Branch:
PR:
CI status:
Failure:
What I tried:
Recommended next action:
```

Otherwise continue until the final rollout summary is merged.
