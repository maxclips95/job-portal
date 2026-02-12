import { NextFunction, Request, Response } from 'express';
import rateLimit, { Options as RateLimitOptions } from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

const defaultRateLimitOptions: Partial<RateLimitOptions> = {
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
};

export const globalApiRateLimit = rateLimit({
  ...defaultRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 600 : 2000,
});

export const authRateLimit = rateLimit({
  ...defaultRateLimitOptions,
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 30 : 100,
});

export const otpRateLimit = rateLimit({
  ...defaultRateLimitOptions,
  windowMs: 10 * 60 * 1000,
  max: isProduction ? 8 : 30,
});

const sanitizeString = (value: string): string => {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      output[key] = sanitizeValue(nested);
    }
    return output;
  }
  return value;
};

export const sanitizeRequestInputs = (req: Request, _res: Response, next: NextFunction): void => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query) as Request['query'];
  req.params = sanitizeValue(req.params) as Request['params'];
  next();
};

export const setSecurityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};
