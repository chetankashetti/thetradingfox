import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../domain/errors';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof DomainError) {
    return res.status(err.status).json({
      code: err.code,
      message: err.message
    });
  }

  console.error(err);
  return res.status(500).json({
    code: 'INTERNAL_ERROR',
    message: 'Unexpected error'
  });
}

