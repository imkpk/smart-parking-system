# Phase 2 Frontend Branding Provider

**Status:** In progress (LOOP 2C)
**Branch:** `feature/phase-2-frontend-branding-provider`
**Scope:** Tenant branding context, API client, theme integration

## Summary

Added `TenantBrandingProvider` and `useTenantBranding` hook to load public or authenticated organization branding, merge safe defaults, and apply tenant theme overrides through existing `createAppTheme()`.

## Provider architecture

```text
QueryClientProvider
  ThemeModeProvider (color mode only)
    AuthProvider
      TenantBrandingProvider (branding + MUI ThemeProvider)
        Router
```

## Key files

- `frontend/src/providers/TenantBrandingProvider.tsx`
- `frontend/src/api/organizationsApi.ts`
- `frontend/src/types/branding.ts`
- `frontend/src/constants/defaultBranding.ts`
- `frontend/src/lib/branding.ts`
- `frontend/src/lib/tenantSlugStorage.ts`
- `frontend/src/theme/tokens.ts` (accent override support)

## Behavior

- Pre-auth: fetches `GET /organizations/public-branding/:slug` when `tenantSlug` is set
- Post-auth: fetches `GET /organizations/current/branding` for user's organization
- API failures fall back to `DEFAULT_BRANDING` without crashing
- Logout clears tenant slug storage and authenticated branding cache
- `setTenantSlug()` persists slug in session storage for login flows (LOOP 2D)

## Tests

- `frontend/src/test/providers/TenantBrandingProvider.test.tsx`
- `frontend/src/test/api/organizationsApi.test.ts`
- `frontend/src/test/lib/branding.test.ts`
- Updated `renderWithProviders` test harness

## Validation

```bash
cd frontend
npm run build
npm run test:run
```