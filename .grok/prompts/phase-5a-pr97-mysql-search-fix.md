seems like u already fixed this check and confirm after reading this prompt URGENT FIX — PR #97 runtime crash in Security Gate search

Repo:
`https://github.com/imkpk/smart-parking-system`

Branch:
`feature/phase-5a-mobile-security-gate`

PR:
`#97 feat(security): add mobile gate check-in checkout flow`

Problem:
Manual testing `/security/gate` crashes backend when searching `BK-DEMO-001`.

Error:
PrismaClientValidationError in:
`backend/src/security/security-gate.service.ts`

Cause:
The code uses Prisma filters like:

```ts
{
  bookingCode: {
    equals: normalizedQuery,
    mode: 'insensitive'
  }
}
```

and:

```ts
{
  vehicleNumber: {
    equals: normalizedQuery,
    mode: 'insensitive'
  }
}
```

But this project uses MySQL Prisma. `mode: 'insensitive'` is not supported here and causes runtime failure:
`Unknown argument mode`.

Fix:

* Remove all `mode: 'insensitive'` usages from Security Gate Prisma queries.
* Use `equals: normalizedQuery` only.
* Keep query normalization by trimming and uppercasing user input where safe.
* Rely on the existing MySQL collation for case-insensitive matching.
* Ensure this is fixed anywhere in `security-gate.service.ts`, not just the first query.
* Do not change schema.
* Do not change API contract.
* Do not touch frontend unless needed for error display.
* Do not start chat / PR 5B.
* Do not add broad tests.

Also handle accidental pasted values cleanly:

* Trim whitespace.
* Strip accidental trailing `)` if present from copied examples like `BK-000123)`.
* Keep valid booking codes and vehicle numbers unchanged.

Validation:

```bash
cd backend
npm run build
npm run test:run -- security-gate.service.spec.ts
```

Manual verification required:

1. Login as SECURITY.
2. Open `/security/gate`.
3. Search `BK-DEMO-001`.
4. Confirm backend does not crash.
5. Search `TS09EA1234`.
6. Confirm backend does not crash.
7. Search `NOT-REAL-999`.
8. Confirm clear error response, no crash.

Push fix to the same PR #97 branch.
Do not open a new feature PR.