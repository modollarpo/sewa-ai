import { useState, useEffect } from 'react';

/**
 * Hook to resolve the current tenant from the subdomain.
 * e.g., 'alpha.sewa-ai.com' -> 'alpha'
 */
export function useTenant() {
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const hostname = window.location.hostname;
    // Development fallback (localhost:3000 -> default tenant or null)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const params = new URLSearchParams(window.location.search);
      setTenantSlug(params.get('tenant') || 'hospital-alpha');
      setIsLoaded(true);
      return;
    }

    const parts = hostname.split('.');
    // If we have at least 3 parts (tenant.domain.com), use the first part
    if (parts.length >= 3) {
      setTenantSlug(parts[0]);
    } else {
      setTenantSlug(null); // No subdomain
    }
    setIsLoaded(true);
  }, []);

  return { tenantSlug, isLoaded };
}
