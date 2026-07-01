// SEWA XAI — backend/src/middleware/requestId.ts
// Attaches a unique X-Request-ID to every request for distributed tracing.
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || randomUUID();
  req.requestId = id;
  req.startTime = Date.now();
  res.setHeader('X-Request-ID', id);
  // Note: Cannot set headers in 'finish' event. Response time is logged via Morgan/logger.
  next();
}
