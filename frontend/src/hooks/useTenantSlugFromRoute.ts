import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTenantBranding } from '../providers/TenantBrandingProvider';

export function useTenantSlugFromRoute() {
  const { tenantSlug: routeSlug } = useParams<{ tenantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const { setTenantSlug } = useTenantBranding();

  useEffect(() => {
    const slug = routeSlug?.trim() || searchParams.get('tenant')?.trim() || null;
    setTenantSlug(slug);
  }, [routeSlug, searchParams, setTenantSlug]);
}