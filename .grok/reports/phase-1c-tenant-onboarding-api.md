# Phase 1c - Tenant Onboarding API

**Status:** Implemented locally; PR pending
**Branch:** `feature/phase-1c-tenant-onboarding-api`
**Scope:** Backend API, tests, and reports only

## Summary

Phase 1c adds a SUPER_ADMIN-only tenant onboarding API that creates a new organization and its first TENANT_ADMIN user in one Prisma transaction.

No frontend product UI, payment-service code, public signup, white-label UI, or subscription billing was added.

## Endpoint added

```text
POST /organizations/onboard
```

Access:

```text
JWT required
Role required: SUPER_ADMIN
```

Request shape:

```ts
{
  organization: {
    name: string;
    slug?: string;
  };
  tenantAdmin: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  };
}
```

Response shape:

```ts
{
  organization: Organization;
  tenantAdmin: Safe tenant admin fields without passwordHash;
}
```

## Files changed

New:

- `backend/src/organizations/dto/onboard-organization.dto.ts`
- `backend/src/organizations/organizations.controller.ts`
- `backend/src/organizations/organizations.module.ts`
- `backend/src/organizations/organizations.service.ts`
- `backend/src/organizations/organizations.service.spec.ts`
- `.grok/reports/phase-1c-tenant-onboarding-api.md`

Updated:

- `backend/src/app.module.ts`
- `backend/src/controllers.spec.ts`
- `backend/src/dtos.spec.ts`
- `backend/src/infrastructure.spec.ts`
- `backend/src/test/test-users.ts`
- `.grok/reports/README.md`
- `MASTER_PROMPT.md`

## Implementation details

- Added `OrganizationsModule` and registered it in `AppModule`.
- Added `OrganizationsController` at `/organizations` with `POST /onboard`.
- Added `@Roles(Role.SUPER_ADMIN)` and existing `JwtAuthGuard`/`RolesGuard` protection.
- Added a defensive service-level role check so non-SUPER_ADMIN calls are forbidden even in direct service use.
- Added nested DTO validation for organization and tenant admin payloads.
- Added slug derivation from organization name when slug is omitted.
- Used `bcrypt.hash(..., 10)` to match existing password hashing behavior.
- Used `prisma.$transaction()` so tenant admin creation failure rolls back organization creation.
- Created tenant admin users with `Role.TENANT_ADMIN` and the new organization's `organizationId`.
- Used Prisma `select` for tenant admin response so `passwordHash` is never returned.
- Mapped Prisma unique constraint errors for organization slug and tenant admin email/phone.

## Schema alignment

Current `Organization` schema has `name` and globally unique `slug`. It does not currently have a `domain` field and `name` is not unique.

Phase 1c therefore enforces slug uniqueness according to the current schema and does not add a migration for `domain` or organization-name uniqueness.

## Tests added or updated

- `organizations.service.spec.ts`
  - SUPER_ADMIN can onboard organization and first TENANT_ADMIN.
  - Slug can be derived from organization name.
  - ADMIN, SECURITY, and USER are forbidden.
  - Empty resolved slug is rejected.
  - Duplicate organization slug is rejected.
  - Duplicate tenant admin email within an organization is rejected.
  - Duplicate tenant admin phone within an organization is rejected.
  - Tenant admin creation failure happens inside a transaction.
  - Unexpected database errors are rethrown.
  - Response excludes `passwordHash`.
  - Created tenant admin has `TENANT_ADMIN` role and new organization id.
- `controllers.spec.ts`
  - `OrganizationsController` delegates onboarding to the service.
- `dtos.spec.ts`
  - Onboarding DTO accepts valid nested payloads and rejects invalid or missing nested tenant admin data.
- `infrastructure.spec.ts`
  - `OrganizationsModule` loads.
  - `RolesGuard` allows SUPER_ADMIN and rejects ADMIN, SECURITY, USER, and anonymous users for SUPER_ADMIN-only routes.
- `test-users.ts`
  - Added `superAdminUser` fixture.

## Auth and role behavior

- Anonymous requests are blocked by `JwtAuthGuard`.
- Non-SUPER_ADMIN authenticated users are blocked by `RolesGuard` and service-level defense.
- The onboarding service does not require `organizationId` on the caller, allowing future platform SUPER_ADMIN users with no tenant organization.
- Existing default-org login behavior remains unchanged.

## Validation

```text
cd backend
npx prisma validate  - passed (schema valid; existing Prisma 7 config deprecation warning)
npm run build       - passed
npm run test:cov    - passed (20 suites, 232 tests, 100% coverage)
```

## Deferred to Phase 1d

- Frontend tenant context in `AuthProvider`.
- Frontend route/home handling for SUPER_ADMIN and TENANT_ADMIN.
- Any tenant onboarding UI.
- White-label branding and tenant theme switching.
- Public tenant signup.
- Subscription billing and plan enforcement.
