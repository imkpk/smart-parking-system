Read `.grok/AGENTS.md` first and strictly follow it.

Fix PR #40 only: admin login regression after Phase 1a Organization / tenant schema changes.

Repository:
`https://github.com/imkpk/smart-parking-system`

PR:
`https://github.com/imkpk/smart-parking-system/pull/40`

Branch:
`feature/phase-1a-organization-schema`

Important:
Work on the existing PR branch. Do not create a new feature branch unless GitHub workflow requires it.

```bash
git checkout feature/phase-1a-organization-schema
git pull origin feature/phase-1a-organization-schema
```

Problem:
After the Phase 1a commit, admin login is not working.

Context:
PR #40 added:

* `Organization` model
* `OrganizationPlan` enum
* expanded `Role` enum with `SUPER_ADMIN`, `TENANT_ADMIN`
* `organizationId` columns
* default organization seed
* default-org wiring in auth / parking lot / vehicle / booking / parking event flows

The PR is directionally correct, but something in this commit broke existing ADMIN login. Fix the regression only.

Do not change frontend unless the backend response contract is proven broken.
Do not change payment-service.
Do not implement TenantGuard.
Do not implement tenant-scoped Prisma middleware.
Do not implement tenant onboarding API.
Do not add JWT tenant claims unless the existing auth code already requires a minimal safe fix.
Do not build Phase 1b.
Do not change role permissions.
Do not change booking/check-in/check-out/payment behavior.
Do not add white-label UI.
Do not merge the PR.

Goal:
Restore existing ADMIN login behavior while keeping the Phase 1a Organization schema foundation intact.

Expected behavior:
Existing ADMIN credentials that worked on `develop` must still work on this PR branch after migration/seed.

Existing login flow should remain:

```text
email + password
→ find user
→ verify password
→ check active status if existing behavior does that
→ return safe user + JWT
```

Phase 1a should not require the user to select a tenant, enter a tenant slug, use a subdomain, or provide `organizationId` at login.

Likely risk areas to inspect first:

1. `backend/src/auth/auth.service.ts`
2. `backend/src/auth/auth.service.spec.ts`
3. `backend/src/users/users.service.ts`
4. `backend/src/users/users.service.spec.ts`
5. `backend/src/users/types/safe-user.type.ts`
6. `backend/prisma/schema.prisma`
7. `backend/prisma/migrations/20260617220000_phase_1a_organizations/migration.sql`
8. `backend/prisma/seed.ts`
9. Any existing seed/default admin setup before this PR
10. Any login/auth e2e or unit tests

Known concern:
This PR changed user uniqueness from global `email` / `phone` to composite `(organizationId, email)` and `(organizationId, phone)`, then changed `findByEmail()` / `findByPhone()` to `findFirst()`.

Until Phase 1c/1d adds tenant-aware login, email-only login must remain deterministic.

For Phase 1a, use default organization behavior.

Preferred safe behavior for now:

* Existing users belong to `DEFAULT_ORGANIZATION_ID = 1`
* Existing ADMIN login searches the default organization
* No tenant slug/subdomain is required yet
* `SUPER_ADMIN` may later be allowed without organization, but do not implement full SUPER_ADMIN behavior in this fix unless needed for compile/test safety

Suggested fix direction:
If `findByEmail(email)` is now ambiguous, scope it to default organization for current Phase 1a behavior:

```ts
findByEmail(email: string): Promise<User | null> {
  return this.prisma.user.findFirst({
    where: {
      email,
      organizationId: DEFAULT_ORGANIZATION_ID,
    },
  });
}
```

Do the equivalent for `findByPhone(phone)` if registration duplicate checks or phone login use it.

But do not blindly patch. First reproduce or inspect the actual failure.

Debug checklist:

1. Reproduce admin login failure.

   * Run backend locally if possible.
   * Use the existing admin credentials from seed/docs.
   * Capture whether failure is:

     * user not found
     * password mismatch
     * inactive user
     * missing organization
     * Prisma query error
     * JWT/signing error
     * frontend contract issue

2. Compare auth behavior against `develop`.

   * Existing login should not require tenant input.
   * Existing JWT shape should not break frontend.

3. Verify migration/seed behavior.

   * Default organization must exist.
   * Existing admin user must have `organizationId = 1`.
   * New registered users must connect to default org.
   * Seed should not wipe or recreate passwords unexpectedly.

4. Check `SafeUser`.

   * Adding `organizationId` to `SafeUser` is okay.
   * Do not remove fields frontend expects.
   * Ensure `toSafeUser()` handles existing/admin records correctly.

5. Check duplicate user lookup behavior.

   * `findFirst({ where: { email } })` may become unsafe once duplicate emails exist across orgs.
   * For now, prefer deterministic default-org lookup unless a better minimal fix exists.

Tests required:
Add or update tests proving:

1. Existing ADMIN login works with `organizationId = DEFAULT_ORGANIZATION_ID`.
2. Existing USER login still works.
3. Login does not require tenant slug or organization input in Phase 1a.
4. `findByEmail()` uses deterministic default-org behavior or otherwise cannot return the wrong tenant user.
5. Register still connects new users to default organization.
6. Existing auth response shape remains compatible.

If there is an existing admin fixture, update it to include `organizationId: DEFAULT_ORGANIZATION_ID`.

If no admin login test exists, add one in `auth.service.spec.ts`.

Do not over-test frontend.

Validation:

Run:

```bash
cd backend
npx prisma validate
npx prisma generate
npm run build
npm run test:cov
```

If the failure depends on local DB migration/seed, also run the project’s migration/seed flow:

```bash
cd backend
npx prisma migrate deploy
npm run prisma:seed
```

If local MySQL is not available, state that clearly in the report and still run validate/generate/build/tests.

Manual smoke test:
After the fix, manually verify or document the expected steps:

1. Apply migration.
2. Run seed.
3. Start backend.
4. Login as existing ADMIN.
5. Confirm login returns token and safe user.
6. Confirm dashboard-protected API still works with the token.
7. Confirm existing USER login still works.
8. Confirm no frontend/payment-service changes were needed.

Documentation:
Update the existing report:

```text
.grok/reports/phase-1a-organization-schema.md
```

Add a section:

```markdown
## Admin login regression fix

### Problem
Describe the exact cause.

### Fix
Describe the minimal code change.

### Validation
List commands run and results.

### Manual verification
List admin login smoke result.
```

Update `MASTER_PROMPT.md` only if needed. Keep it factual and minimal.

Also fix this if still present:
`MASTER_PROMPT.md` should not permanently say current branch is `feature/phase-1a-organization-schema` after merge. Prefer:

```text
Current branch: develop
```

and mention PR branch only inside the in-progress section.

Commit:

```bash
git status
git add .
git commit -m "fix(backend): restore admin login after organization schema"
git push origin feature/phase-1a-organization-schema
```

Do not merge the PR.

PR comment/body update:
Add a short note to PR #40:

```markdown
## Admin login regression fix
- Restored existing ADMIN login behavior after Phase 1a organization schema changes.
- Login remains email/password only for Phase 1a.
- Tenant-aware login is deferred to Phase 1c/1d.
- Added/updated auth tests for default organization admin login.

## Validation
- npx prisma validate
- npx prisma generate
- npm run build
- npm run test:cov
```

Success criteria:

* Existing ADMIN login works again.
* Existing USER login still works.
* No frontend changes unless strictly necessary.
* No payment-service changes.
* No TenantGuard or Phase 1b implementation.
* Tests pass.
* PR #40 remains small enough to review.
