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
    // Development fallback — return null so LoginPage uses email-domain derivation
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      const params = new URLSearchParams(window.location.search);
      // Allow ?tenant=royal-london override for testing specific tenants
      setTenantSlug(params.get('tenant') || null);
      setIsLoaded(true);
      return;
    }

    const parts = hostname.split('.');
    // If we have at least 3 parts (tenant.domain.com) and it's not a static app, use the first part
    if (parts.length >= 3 && !hostname.includes('azurestaticapps.net')) {
      setTenantSlug(parts[0]);
    } else {
      setTenantSlug(null); // No subdomain or is a static app
    }
    setIsLoaded(true);
  }, []);

  return { tenantSlug, isLoaded };
}
