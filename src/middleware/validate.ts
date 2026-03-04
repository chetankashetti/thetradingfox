import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        code: 'INVALID_PAYLOAD',
        errors: result.error.flatten()
      });
    }
    req.body = result.data as any;
    next();
  };
}

