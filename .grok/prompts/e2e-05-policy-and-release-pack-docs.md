# E2E 05 — Policy and Release Pack Docs

You are the implementation agent. Work autonomously.

## Branch

`docs/e2e-policy-and-release-pack`

## PR title

`docs(e2e): add release regression policy`

## Base

Fresh `develop` (all prior E2E loops merged).

## Files to read first

```text
MASTER_PROMPT.md
.grok/AGENTS.md
.grok/e2e/journey-registry.md
.grok/reports/e2e-strategy-hybrid-model.md
.grok/reports/cypress-ci-smoke-stage.md
.github/pull_request_template.md
docs/project-plan/09-branch-strategy.md
```

## Files to create

```text
.grok/reports/e2e-policy-and-release-pack.md
```

## Files to update

```text
.github/pull_request_template.md
MASTER_PROMPT.md
.grok/reports/README.md
```

## Scope restrictions

```text
Docs and PR template only.
No Cypress spec changes.
No CI changes unless fixing a typo in workflow comments.
```

## Policy report requirements

`.grok/reports/e2e-policy-and-release-pack.md` must include:

### Same-PR Cypress update rule

```text
New sellable user journey      → add/update Cypress smoke in same PR
Changed sellable user journey  → update Cypress smoke in same PR
Visible UI regression          → add regression smoke if real flow affected
Style-only/internal change     → Cypress not required (document in PR checklist)
```

### Release regression policy

- Pre-release: run full `npm run e2e:smoke` against pinned **app SHA**
- Record SHA in release notes
- Never test floating `develop` tip for release sign-off

### Future `smart-parking-e2e` repo

- Protected separate repo for manual/release regression
- Do not create until human explicitly asks
- Monorepo smoke remains PR gate; separate repo for deep regression

### App SHA requirement

```text
git checkout <release-sha>
cd frontend && npm run e2e:smoke
```

Document in agent instructions for manual and release runs.

### single-tenant minimal smoke subset

For `single-tenant` branch hotfixes, minimum subset:

```text
J1  Login redirect
J14 Auth guard / logout
J3  Vehicle (if applicable to hotfix)
```

Full J4–J8 only when parking lifecycle touched.

### Flake policy

```text
- Flaky smoke = P0 quality issue
- Quarantine max 48 hours with ticket
- Never merge E2E PR with failing required CI
- Never silently delete failing smoke coverage
```

## PR template update

Add to `.github/pull_request_template.md`:

```markdown
## UI/E2E impact
- [ ] No UI/user-flow change
- [ ] Existing Cypress coverage still applies
- [ ] Added/updated Cypress smoke test
- [ ] Cypress not needed because this is style-only/internal
- [ ] Journey ID: J__
```

## Validation

```bash
git diff develop -- .github/pull_request_template.md .grok/reports/e2e-policy-and-release-pack.md
```

## Commit message

```bash
git add .github/pull_request_template.md .grok/reports/e2e-policy-and-release-pack.md MASTER_PROMPT.md .grok/reports/README.md
git commit -m "docs(e2e): add release regression policy"
git push -u origin docs/e2e-policy-and-release-pack
```

## Merge rules

- Open PR to `develop`
- Merge when CI green
- After merge, run final verification loop (see `loop-engineering-prompt.md` FINAL LOOP section)
- Create `.grok/reports/e2e-rollout-final-summary.md` on branch `docs/e2e-rollout-final-summary`