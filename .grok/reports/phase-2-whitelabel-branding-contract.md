# Phase 2 White-label Branding Contract

**Status:** In progress (LOOP 2A)
**Branch:** `docs/phase-2-whitelabel-branding-contract`
**Scope:** Strategy and API/UI contract for per-tenant branding

## Summary

Phase 2 makes the Smart Parking SaaS feel tenant-branded without starting dashboard, slot map, security gate, billing, or enterprise integration work. Branding is configuration-driven (URL strings and hex colors), tenant-isolated, and applied through existing MUI 7 theme infrastructure.

## Current baseline (Phase 1 complete)

| Area | State |
|------|-------|
| `Organization` schema | `name`, `slug`, `logoUrl`, `primaryColor` already exist |
| Backend org API | `POST /organizations/onboard` (SUPER_ADMIN only, JWT) |
| Frontend auth | `AuthProvider` exposes `organizationId` + `OrganizationSummary` (id, name, slug) |
| Theme system | `createAppTheme(mode, brandOverrides?)` + `ThemeBrandOverrides` in `frontend/src/theme/tokens.ts` |
| Login | `LoginPage` + `AuthPageShell` — generic "Smart Parking" branding, no tenant slug |
| Role guards | SUPER_ADMIN, TENANT_ADMIN, ADMIN, SECURITY, USER routes and nav in place |

## Branding data model

Extend `Organization` (preferred over a separate table — fields are display config, not high-churn):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | String | Yes | Display name (existing) |
| `slug` | String | Yes | Public lookup key (existing) |
| `logoUrl` | String? | No | HTTPS URL to tenant logo; no file upload in Phase 2 |
| `primaryColor` | String? | No | Hex `#RRGGBB` |
| `secondaryColor` | String? | No | Hex `#RRGGBB` — **new** |
| `accentColor` | String? | No | Hex `#RRGGBB` — **new** |
| `loginTitle` | String? | No | Login page heading override — **new** |
| `supportEmail` | String? | No | Optional footer/support contact — **new** |

**Not exposed on public or branding DTOs:** `plan`, `maxParkingLots`, `maxUsers`, `isActive`, timestamps, user counts, payment data.

### Safe fallback defaults

When any field is null or lookup fails, frontend uses platform defaults from `frontend/src/theme/tokens.ts`:

```text
name:        "Smart Parking"
tagline:     "Management System"
primary:     parkingTokens.light.primary (#1565C0)
secondary:   parkingTokens.light.secondary (#F9A825)
accent:      derived from primary (MUI palette) or platform info color
loginTitle:  "Sign in"
logoUrl:     bundled app mark / no image
supportEmail: omitted
```

## Backend API contract

### 1. Public branding lookup (pre-auth)

```
GET /organizations/public-branding/:slug
```

- **Auth:** None (public)
- **Guards:** Rate-limit friendly; returns only safe display fields
- **Response 200:**

```json
{
  "name": "Acme Parking",
  "slug": "acme-parking",
  "logoUrl": "https://cdn.example.com/acme-logo.svg",
  "primaryColor": "#1565C0",
  "secondaryColor": "#F9A825",
  "accentColor": "#0288D1",
  "loginTitle": "Welcome to Acme Parking",
  "supportEmail": "support@acme.example"
}
```

- **Response 404:** Unknown or inactive slug — frontend shows controlled fallback (default branding + optional "Organization not found" message)
- **Never returns:** internal IDs required for auth, plan limits, user lists, `passwordHash`, payment refs

### 2. Authenticated current-tenant branding

```
GET /organizations/current/branding
```

- **Auth:** JWT required
- **Roles:** Any authenticated role (SUPER_ADMIN with null `organizationId` receives platform defaults or 403 per existing org-context rules)
- **Scope:** Returns branding for `currentUser.organizationId` only
- **Response:** Same safe field shape as public endpoint

### 3. Branding update

```
PATCH /organizations/current/branding
```

- **Auth:** JWT + RolesGuard
- **Allowed roles:** `SUPER_ADMIN`, `TENANT_ADMIN`
- **Forbidden:** `ADMIN`, `SECURITY`, `USER` → 403
- **Scope:** Updates only the caller's organization (`getRequiredOrganizationId`). SUPER_ADMIN without org context cannot PATCH unless future platform-console rules add explicit `organizationId` param (out of Phase 2 scope — SUPER_ADMIN with org uses same endpoint when `organizationId` is set)
- **Body (all optional, partial update):**

```json
{
  "logoUrl": "https://cdn.example.com/logo.svg",
  "primaryColor": "#1565C0",
  "secondaryColor": "#F9A825",
  "accentColor": "#0288D1",
  "loginTitle": "Sign in to Acme",
  "supportEmail": "help@acme.example"
}
```

### Validation rules

| Field | Rule |
|-------|------|
| `logoUrl` | Optional; if set, valid URL (`http:` or `https:`), max 2048 chars; empty string clears |
| `primaryColor`, `secondaryColor`, `accentColor` | Optional; if set, `^#[0-9A-Fa-f]{6}$`; empty string clears |
| `loginTitle` | Optional; trim; max 120 chars |
| `supportEmail` | Optional; valid email; max 254 chars |
| `name`, `slug` | Not editable via branding PATCH in Phase 2 (onboarding / future admin console) |

### Tenant isolation rules

1. Public lookup is keyed by slug only — no cross-tenant data in response.
2. Authenticated GET/PATCH always resolves org from JWT `organizationId` via `AccessPolicyService.getRequiredOrganizationId`.
3. Tenant A user cannot read or update Tenant B branding through any Phase 2 endpoint.
4. Inactive organizations (`isActive: false`) return 404 on public lookup.
5. Auth responses (`/auth/login`, `/auth/me`) continue to return minimal `OrganizationSummary` — not full branding (frontend fetches branding separately).

## Frontend contract

### Tenant slug resolution (pre-auth)

Priority order for login/register pages:

1. Route param: `/login/:tenantSlug` (preferred)
2. Query param: `/login?tenant=acme-parking`
3. Session storage key `smart-parking:tenant-slug` (set when user visits branded URL; cleared on logout)
4. Fallback: platform default branding (existing `/login` without slug)

Unknown slug: show default theme + non-blocking notice; do not crash.

### `TenantBrandingProvider`

Location: `frontend/src/providers/TenantBrandingProvider.tsx`

```typescript
interface TenantBranding {
  name: string;
  slug?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  loginTitle?: string | null;
  supportEmail?: string | null;
}

interface TenantBrandingContextValue {
  branding: TenantBranding;           // always merged with defaults
  isLoading: boolean;
  error: string | null;
  tenantSlug: string | null;
  setTenantSlug: (slug: string | null) => void;
  refreshBranding: () => Promise<void>;
}
```

**Behavior:**

- Pre-auth: fetch `GET /organizations/public-branding/:slug` when slug present
- Post-auth: fetch `GET /organizations/current/branding` when `organizationId` present; prefer over stale slug cache
- On logout: clear slug cache and reset to defaults
- On API failure: use defaults; set `error` for optional UI message
- Map branding → `ThemeBrandOverrides` + extended accent for `createAppTheme`

### Theme integration

- Extend `ThemeBrandOverrides` with `accent` if needed
- `ThemeModeProvider` (or wrapper) passes resolved overrides from `useTenantBranding()` into `createAppTheme(mode, overrides)`
- Preserve readable contrast — do not override text/background tokens from tenant colors in Phase 2

### UI surfaces (by loop)

| Loop | Surface |
|------|---------|
| 2C | Provider, API client, theme wiring, tests only — no visible redesign |
| 2D | Branded `LoginPage` / `AuthPageShell`; app shell sidebar/header logo + name |
| 2E | TENANT_ADMIN (and SUPER_ADMIN with org) branding settings form |

### Branding settings screen (2E)

- Route: `/admin/branding` (TENANT_ADMIN + SUPER_ADMIN with org)
- Nav item visible only to allowed roles
- Form fields match PATCH body; client-side hex validation
- On save success: `refreshBranding()` + toast
- No file upload

## Role access matrix

| Action | SUPER_ADMIN | TENANT_ADMIN | ADMIN | SECURITY | USER |
|--------|-------------|--------------|-------|----------|------|
| Public branding by slug | Yes | Yes | Yes | Yes | Yes |
| GET current branding | Yes* | Yes | Yes | Yes | Yes |
| PATCH branding | Yes* | Yes | No | No | No |
| Branding settings UI | Yes* | Yes | No | No | No |

\* SUPER_ADMIN without `organizationId` uses platform defaults; settings route hidden unless org context exists (consistent with Phase 1d).

## Acceptance criteria (Phase 2 exit)

| # | Criterion |
|---|-----------|
| 1 | Tenant A login/app shell shows Tenant A logo, name, colors |
| 2 | Tenant B login/app shell shows Tenant B branding (distinct from A) |
| 3 | Unknown tenant slug → safe fallback, no crash |
| 4 | Authenticated user never sees another tenant's branding |
| 5 | TENANT_ADMIN can update own org branding fields |
| 6 | SUPER_ADMIN can update per existing org-context rules |
| 7 | ADMIN, SECURITY, USER cannot update branding (API + UI) |
| 8 | Default demo org login and Cypress smoke still pass |
| 9 | Invalid colors rejected by API and client |
| 10 | No `passwordHash`, plan limits, or payment data in branding responses |

## Implementation loops

| Loop | Branch | Deliverable |
|------|--------|-------------|
| 2A | `docs/phase-2-whitelabel-branding-contract` | This contract |
| 2B | `feature/phase-2-backend-branding-api` | Schema migration, 3 endpoints, tests |
| 2C | `feature/phase-2-frontend-branding-provider` | Provider, hook, API client, theme |
| 2D | `feature/phase-2-branded-login-shell` | Login + app shell branding |
| 2E | `feature/phase-2-branding-settings-ui` | Admin settings form |
| FINAL | `verify/phase-2-whitelabel-acceptance` | Acceptance tests + report |

## Deferred (not Phase 2)

- Logo file upload / asset management
- Custom domain per tenant
- SUPER_ADMIN platform console for cross-tenant branding
- Subscription plan limits tied to branding
- Payment-service tenant linkage
- Phase 3+ dashboard, slot map, security gate

## Files referenced

- `backend/prisma/schema.prisma` — Organization model
- `backend/src/organizations/` — controller/service patterns
- `backend/src/common/access-policy.service.ts` — org scoping
- `frontend/src/providers/AuthProvider.tsx`
- `frontend/src/theme/tokens.ts`, `createAppTheme.ts`
- `frontend/src/pages/auth/LoginPage.tsx`, `AuthPageShell.tsx`
- `frontend/src/components/layout/AppLayout.tsx`
- `.grok/reports/phase-1-tenant-isolation-acceptance.md`