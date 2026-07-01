// SEWA XAI — backend/src/middleware/audit.ts
import { Request, Response, NextFunction } from 'express';
import { auditLog } from '../utils/audit';

const AUDITED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!AUDITED_METHODS.includes(req.method) || req.path === '/health') return next();
  res.on('finish', () => {
    if (res.statusCode < 400 && req.user) {
      auditLog({
        tenantId: req.user.tenantId,
        userId:   req.user.id,
        action:   `${req.method} ${req.path}`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: { status: res.statusCode },
      }).catch(() => {});
    }
  });
  next();
}
