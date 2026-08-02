// SEWA XAI — backend/src/middleware/auth.ts
// Unified authentication: NHS CIS2 (production) | JWT (local/dev/fallback)

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';
import { tenantStorage } from '../utils/prismaClient';
import { authenticateCis2 } from './nhsAuth';

interface JwtPayload { sub: string; tenantId: string; role: string; }

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

const NHS_AUTH_ENABLED = config.NODE_ENV === 'production' && !!config.NHS_CIS2_ENABLED;

export function authenticate(req: Request, res: Response, next: NextFunction) {
  if (NHS_AUTH_ENABLED) {
    return authenticateCis2(req, res, next);
  }

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError('Unauthorized', 401));
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, tenantId: payload.tenantId, role: payload.role };
    tenantStorage.run(payload.tenantId, () => next());
  } catch {
    next(new AppError('Token invalid or expired', 401));
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError('Unauthorized', 401));
    if (!roles.includes(req.user.role)) return next(new AppError('Forbidden', 403));
    next();
  };
}

export function sameTenant(req: Request, _res: Response, next: NextFunction) {
  const tid = req.headers['x-tenant-id'] as string | undefined;
  if (tid && req.user && tid !== req.user.tenantId) {
    return next(new AppError('Cross-tenant access denied', 403));
  }
  next();
}

export const sameTenat = sameTenant;
