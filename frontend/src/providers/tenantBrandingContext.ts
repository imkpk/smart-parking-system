import { createContext, useContext } from 'react';
import { TenantBranding } from '../types/branding';

export interface TenantBrandingContextValue {
  branding: TenantBranding;
  isLoading: boolean;
  error: string | null;
  tenantSlug: string | null;
  setTenantSlug: (slug: string | null) => void;
  refreshBranding: () => Promise<void>;
}

export const TenantBrandingContext = createContext<TenantBrandingContextValue | undefined>(
  undefined,
);

export function useTenantBranding() {
  const context = useContext(TenantBrandingContext);

  if (!context) {
    throw new Error('useTenantBranding must be used within TenantBrandingProvider');
  }

  return context;
}