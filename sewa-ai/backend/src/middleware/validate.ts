import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

export const validate = (schema: AnyZodObject) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = await schema.parseAsync(req.body);
    req.body = validated;
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return next(new AppError(`Validation failed: ${messages}`, 400));
    }
    next(err);
  }
};
