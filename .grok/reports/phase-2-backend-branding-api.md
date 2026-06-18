# Phase 2 Backend Branding API

**Status:** In progress (LOOP 2B)
**Branch:** `feature/phase-2-backend-branding-api`
**Scope:** Organization branding fields, public/authenticated APIs, tests

## Summary

Extended the `Organization` model with white-label branding fields and added three API endpoints for public lookup, authenticated read, and tenant-admin update. Responses expose only safe display fields.

## Schema changes

Added to `Organization`:

- `secondaryColor String?`
- `accentColor String?`
- `loginTitle String?`
- `supportEmail String?`

Migration: `20260618150000_phase_2_organization_branding`

## API endpoints

| Method | Path | Auth | Roles |
|--------|------|------|-------|
| GET | `/organizations/public-branding/:slug` | None | Public |
| GET | `/organizations/current/branding` | JWT | Any authenticated user with org context |
| PATCH | `/organizations/current/branding` | JWT | SUPER_ADMIN, TENANT_ADMIN |

### Safe response fields

`name`, `slug`, `logoUrl`, `primaryColor`, `secondaryColor`, `accentColor`, `loginTitle`, `supportEmail`

### Validation

- Colors: `#RRGGBB` hex when provided
- `logoUrl`: HTTP/HTTPS URL, max 2048 chars; empty string clears
- `loginTitle`: max 120 chars
- `supportEmail`: valid email, max 254 chars

## Files changed

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260618150000_phase_2_organization_branding/migration.sql`
- `backend/src/organizations/organizations.controller.ts`
- `backend/src/organizations/organizations.service.ts`
- `backend/src/organizations/dto/update-organization-branding.dto.ts`
- `backend/src/organizations/types/organization-branding.type.ts`
- `backend/src/organizations/organizations.service.spec.ts`
- `backend/src/organizations/dto/update-organization-branding.dto.spec.ts`
- `backend/src/controllers.spec.ts`
- `backend/src/test/test-users.ts`

## Tests

- Public branding returns safe fields only
- Unknown slug → 404
- Authenticated current branding scoped to JWT organization
- TENANT_ADMIN / SUPER_ADMIN (with org) can PATCH
- ADMIN / SECURITY / USER forbidden
- Tenant A updates scoped to org A only
- Invalid hex colors rejected at DTO layer
- Existing onboarding tests still pass

## Validation

```bash
cd backend
npx prisma validate
npm run build
npm run test:cov
```