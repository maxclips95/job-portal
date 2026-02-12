import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { ApiResponse } from '@/types/common';
import { ZodError } from 'zod';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

const inferStatusCode = (message: string): number => {
  const lower = message.toLowerCase();
  if (lower.includes('invalid email or password')) return 401;
  if (lower.includes('invalid otp')) return 400;
  if (lower.includes('otp expired') || lower.includes('expired')) return 410;
  if (lower.includes('already registered')) return 409;
  if (lower.includes('not found')) return 404;
  if (lower.includes('forbidden') || lower.includes('access')) return 403;
  if (lower.includes('validation')) return 400;
  return 500;
};

export const errorHandler = (
  err: CustomError | ZodError | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  logger.error('Error occurred', err);

  // Zod validation error
  if (err instanceof ZodError) {
    const response: ApiResponse = {
      success: false,
      message: 'Validation error',
      error: err.issues[0]?.message || 'Invalid request payload',
      timestamp: new Date(),
    };
    res.status(400).json(response);
    return;
  }

  // Custom error with status code
  if (err instanceof Error) {
    const explicitCode = (err as CustomError).statusCode;
    const statusCode = explicitCode || inferStatusCode(err.message || '');
    const shouldExpose = statusCode < 500 && !isProduction;
    const message = shouldExpose ? err.message || 'Request failed' : 'Internal server error';

    const response: ApiResponse = {
      success: false,
      message,
      error: message,
      timestamp: new Date(),
    };

    res.status(statusCode).json(response);
    return;
  }

  // Unknown error
  const response: ApiResponse = {
    success: false,
    message: 'Internal server error',
    error: 'An unexpected error occurred',
    timestamp: new Date(),
  };

  res.status(500).json(response);
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
