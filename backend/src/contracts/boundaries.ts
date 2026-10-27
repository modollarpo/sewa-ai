// SEWA XAI — backend/src/contracts/boundaries.ts
// Boundary resolver for the four live AI services.
//
// Single source of truth: backend/src/services/wire-contract.json. Base URLs are
// resolved from the contract's `baseUrlEnv` (falling back to `defaultBaseUrl`);
// paths come from `healthPath` / `request.path`. Nothing here is hard-coded, so
// this module cannot drift from the contract the way a hand-maintained copy did.
//
// Intentionally dependency-free (no config/env import): importing `config`
// requires DATABASE_URL/REDIS_URL/JWT secrets, which would make the boundary
// resolver unusable in DB-free contract tests.
import { serviceContract } from '../services/wireContract';

export type ServiceName = 'triage' | 'uncertainty' | 'vlm' | 'metacognition';

export const LIVE_SERVICES: readonly ServiceName[] = [
  'triage',
  'uncertainty',
  'vlm',
  'metacognition',
] as const;

export interface ResolvedBoundary {
  service: ServiceName;
  baseUrl: string;
  /** Env var the contract declares as backing {@link baseUrl}. */
  baseUrlEnv: string;
  /** True when the env var was present (production target), false when the local default was used. */
  fromEnv: boolean;
  healthPath: string;
  healthUrl: string;
  predictPath: string;
  predictUrl: string;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/** First non-empty env var among the contract's primary name and its fallbacks. */
function resolveBaseUrl(service: ServiceName): { url: string; fromEnv: boolean } {
  const contract = serviceContract(service);
  const names = [contract.baseUrlEnv, ...(contract.baseUrlEnvFallbacks ?? [])];
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.length > 0) {
      return { url: stripTrailingSlash(value), fromEnv: true };
    }
  }
  return { url: stripTrailingSlash(contract.defaultBaseUrl), fromEnv: false };
}

export function resolveBoundary(service: ServiceName): ResolvedBoundary {
  const contract = serviceContract(service);
  const { url: baseUrl, fromEnv } = resolveBaseUrl(service);
  if (!baseUrl) {
    throw new Error(`[boundaries] ${service}: no base URL from ${contract.baseUrlEnv} or defaultBaseUrl`);
  }
  return {
    service,
    baseUrl,
    baseUrlEnv: contract.baseUrlEnv,
    fromEnv,
    healthPath: contract.healthPath,
    healthUrl: `${baseUrl}${contract.healthPath}`,
    predictPath: contract.request.path,
    predictUrl: `${baseUrl}${contract.request.path}`,
  };
}

export function resolveAllBoundaries(): ResolvedBoundary[] {
  return LIVE_SERVICES.map(resolveBoundary);
}
