// SEWA AI — backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';
import { tenantStorage } from '../utils/prismaClient';

interface JWTPayload { sub: string; tenantId: string; role: string; }

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; tenantId: string; role: string; };
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError('Unauthorized', 401));
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JWTPayload;
    req.user = { id: payload.sub, tenantId: payload.tenantId, role: payload.role };
    // Run the rest of the request within the tenant context
    tenantStorage.run(payload.tenantId, () => {
      next();
    });
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

// Ensure request belongs to same tenant (apply to all routes that filter by tenantId)
export function sameTenant(req: Request, _res: Response, next: NextFunction) {
  const tid = req.headers['x-tenant-id'] as string;
  if (tid && req.user && tid !== req.user.tenantId) {
    return next(new AppError('Cross-tenant access denied', 403));
  }
  next();
}

/** @deprecated Use sameTenant (typo fix). Alias kept for backwards compat. */
export const sameTenat = sameTenant;
