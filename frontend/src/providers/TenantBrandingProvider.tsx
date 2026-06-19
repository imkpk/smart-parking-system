import { CssBaseline, ThemeProvider } from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { getCurrentBranding, getPublicBranding } from '../api/organizationsApi';
import { DEFAULT_BRANDING } from '../constants/defaultBranding';
import { mergeTenantBranding, toThemeBrandOverrides } from '../lib/branding';
import { tenantSlugStorage } from '../lib/tenantSlugStorage';
import { createAppTheme } from '../theme';
import { useAuth } from './AuthProvider';
import { useThemeMode } from './ThemeModeProvider';
import {
  TenantBrandingContext,
  type TenantBrandingContextValue,
} from './tenantBrandingContext';

export type { TenantBrandingContextValue } from './tenantBrandingContext';
export { useTenantBranding } from './tenantBrandingContext';

export function TenantBrandingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { isAuthenticated, organizationId } = useAuth();
  const { mode } = useThemeMode();
  const [tenantSlug, setTenantSlugState] = useState<string | null>(() =>
    tenantSlugStorage.get(),
  );

  const setTenantSlug = useCallback((slug: string | null) => {
    const normalized = slug?.trim().toLowerCase() || null;
    tenantSlugStorage.set(normalized);
    setTenantSlugState(normalized);
  }, []);

  const publicBrandingQuery = useQuery({
    queryKey: ['branding', 'public', tenantSlug],
    queryFn: () => getPublicBranding(tenantSlug!),
    enabled: Boolean(tenantSlug) && !isAuthenticated,
    retry: false,
  });

  const currentBrandingQuery = useQuery({
    queryKey: ['branding', 'current', organizationId],
    queryFn: getCurrentBranding,
    enabled: isAuthenticated && organizationId != null,
    retry: false,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.removeQueries({ queryKey: ['branding', 'current'] });
      tenantSlugStorage.clear();
      setTenantSlugState(null);
    }
  }, [isAuthenticated, queryClient]);

  const branding = useMemo(() => {
    if (isAuthenticated && currentBrandingQuery.data) {
      return mergeTenantBranding(currentBrandingQuery.data);
    }

    if (tenantSlug && publicBrandingQuery.data) {
      return mergeTenantBranding(publicBrandingQuery.data);
    }

    return DEFAULT_BRANDING;
  }, [
    currentBrandingQuery.data,
    isAuthenticated,
    publicBrandingQuery.data,
    tenantSlug,
  ]);

  const error = useMemo(() => {
    if (isAuthenticated) {
      return currentBrandingQuery.error ? 'Unable to load organization branding.' : null;
    }

    if (tenantSlug && publicBrandingQuery.isError) {
      return 'Unable to load tenant branding.';
    }

    return null;
  }, [
    currentBrandingQuery.error,
    isAuthenticated,
    publicBrandingQuery.isError,
    tenantSlug,
  ]);

  const isLoading =
    (Boolean(tenantSlug) && !isAuthenticated && publicBrandingQuery.isLoading) ||
    (isAuthenticated && organizationId != null && currentBrandingQuery.isLoading);

  const refreshBranding = useCallback(async () => {
    if (isAuthenticated && organizationId != null) {
      await currentBrandingQuery.refetch();
      return;
    }

    if (tenantSlug) {
      await publicBrandingQuery.refetch();
    }
  }, [
    currentBrandingQuery,
    isAuthenticated,
    organizationId,
    publicBrandingQuery,
    tenantSlug,
  ]);

  const brandOverrides = useMemo(() => toThemeBrandOverrides(branding), [branding]);
  const theme = useMemo(() => createAppTheme(mode, brandOverrides), [brandOverrides, mode]);

  const value = useMemo<TenantBrandingContextValue>(
    () => ({
      branding,
      isLoading,
      error,
      tenantSlug,
      setTenantSlug,
      refreshBranding,
    }),
    [branding, error, isLoading, refreshBranding, setTenantSlug, tenantSlug],
  );

  return (
    <TenantBrandingContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </TenantBrandingContext.Provider>
  );
}