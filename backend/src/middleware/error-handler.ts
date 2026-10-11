import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[PulseChat Error]', err);

  const statusCode = (err as { status?: number }).status || 500;
  const message =
    ENV.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected internal error occurred'
      : err.message || 'Server error';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}
