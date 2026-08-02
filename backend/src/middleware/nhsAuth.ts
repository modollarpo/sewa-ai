// SEWA XAI — backend/src/middleware/nhsAuth.ts
// NHS CIS2 (Care Identity Service 2) OpenID Connect authentication middleware.
// Validates JWTs issued by NHS Digital's CIS2 service and maps identities to SEWA roles.

import axios from 'axios';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';
import { tenantStorage } from '../utils/prismaClient';
import { logger } from '../utils/logger';

// ── CIS2 OpenID Configuration ──────────────────────────────────
const CIS2_ISSUER = 'https://auth.cis2.nhs.uk';
const CIS2_JWKS_URI = `${CIS2_ISSUER}/.well-known/openid-configuration/jwks`;
const CIS2_OIDC_METADATA_URL = `${CIS2_ISSUER}/.well-known/openid-configuration`;

interface Cis2TokenPayload extends JwtPayload {
  sub: string;
  uid: string;
  nhsid_user_uid: string;
  given_name: string;
  family_name: string;
  email?: string;
  nhs_org_code?: string;
  nhs_org_name?: string;
  scp?: string[];
  roles?: Array<{
    code: string;
    org_code: string;
    org_name: string;
    role_name: string;
  }>;
  idassurance_level?: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface Cis2JwksResponse {
  keys: Array<{
    kty: string;
    kid: string;
    use: string;
    alg: string;
    n: string;
    e: string;
    x5c?: string[];
  }>;
}

const ROLE_MAP: Record<string, string> = {
  'R0001': 'doctor',
  'R0002': 'radiologist',
  'R0003': 'technician',
  'R0004': 'admin',
  'R0005': 'superadmin',
  'R0006': 'nurse',
  'R0007': 'midwife',
};

let cachedJwks: Cis2JwksResponse['keys'] | null = null;
let jwksCacheExpiry = 0;

async function fetchJwks(): Promise<Cis2JwksResponse['keys']> {
  if (cachedJwks && Date.now() < jwksCacheExpiry) return cachedJwks;
  const res = await axios.get<Cis2JwksResponse>(CIS2_JWKS_URI, { timeout: 10000 });
  cachedJwks = res.data.keys;
  jwksCacheExpiry = Date.now() + 3600000;
  return cachedJwks;
}

function findMatchingKey(keys: Cis2JwksResponse['keys'], kid: string) {
  return keys.find(k => k.kid === kid);
}

function mapCis2RoleToSewaRole(cis2Roles?: Cis2TokenPayload['roles']): string {
  if (!cis2Roles || cis2Roles.length === 0) return 'doctor';
  for (const r of cis2Roles) {
    const mapped = ROLE_MAP[r.code];
    if (mapped) return mapped;
  }
  return 'doctor';
}

export async function authenticateCis2(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError('Unauthorized', 401));

  const token = header.split(' ')[1];
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded.header.kid !== 'string') {
    return next(new AppError('Invalid NHS CIS2 token format', 401));
  }

  try {
    const keys = await fetchJwks();
    const key = findMatchingKey(keys, decoded.header.kid);
    if (!key) {
      return next(new AppError('NHS CIS2 signing key not found', 401));
    }

    const publicKey = `-----BEGIN CERTIFICATE-----\n${key.x5c?.[0]}\n-----END CERTIFICATE-----`;
    const payload = jwt.verify(token, publicKey, {
      issuer: CIS2_ISSUER,
      algorithms: ['RS256'],
    }) as Cis2TokenPayload;

    const nhsOrgCode = payload.nhs_org_code || payload.roles?.[0]?.org_code || 'unknown';
    const nhsOrgName = payload.nhs_org_name || payload.roles?.[0]?.org_name || 'NHS Organisation';
    const sewaRole = mapCis2RoleToSewaRole(payload.roles);
    const tenantId = `nhs-${nhsOrgCode}`;

    req.user = {
      id: payload.uid || payload.sub,
      tenantId,
      role: sewaRole,
      email: payload.email || `${payload.uid}@nhs.net`,
      firstName: payload.given_name,
      lastName: payload.family_name,
      orgCode: nhsOrgCode,
      orgName: nhsOrgName,
      assuranceLevel: payload.idassurance_level || 'LOW',
    };

    tenantStorage.run(tenantId, () => next());
  } catch (err: any) {
    logger.error(`[NHS CIS2] Auth failed: ${err.message}`);
    next(new AppError('NHS CIS2 authentication failed', 401));
  }
}

export { authenticateCis2 as authenticate };

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        role: string;
        email?: string;
        firstName?: string;
        lastName?: string;
        orgCode?: string;
        orgName?: string;
        assuranceLevel?: string;
      };
    }
  }
}
