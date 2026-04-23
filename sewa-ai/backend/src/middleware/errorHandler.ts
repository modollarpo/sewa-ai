// SEWA AI — backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status  = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Internal server error';
  const isProd  = process.env.NODE_ENV === 'production';

  if (status >= 500) logger.error(`${req.method} ${req.path} → ${status}`, err);

  res.status(status).json({
    success: false,
    message,
    ...(err.code ? { code: err.code } : {}),
    // Never expose stack traces in production
    ...(!isProd && err.stack ? { stack: err.stack } : {}),
  });
}
