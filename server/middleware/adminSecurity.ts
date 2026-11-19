
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';

const DEVELOPMENT_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8787',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8787',
]);

function getAllowedOrigin(): string {
  return new URL(config.appUrl).origin;
}

export function requireAdminOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.get('origin');

  if (!origin) {
    res.status(403).json({ error: 'invalid_request_origin' });
    return;
  }

  let validOrigin = false;

  try {
    const parsedOrigin = new URL(origin);

    if (config.isProduction) {
      validOrigin = parsedOrigin.origin === getAllowedOrigin();
    } else {
      validOrigin = DEVELOPMENT_ORIGINS.has(parsedOrigin.origin);
    }
  } catch {
    validOrigin = false;
  }

  if (!validOrigin) {
    res.status(403).json({ error: 'invalid_request_origin' });
    return;
  }

  if (!req.is('application/json')) {
    res.status(415).json({ error: 'json_required' });
    return;
  }

  if (req.get('x-admin-request') !== '1') {
    res.status(403).json({ error: 'invalid_request_header' });
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  next();
}

export const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: 'too_many_login_attempts',
  },
  handler: (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(429).json({
      error: 'too_many_login_attempts',
      message: 'Too many login attempts. Please try again later.',
    });
  },
});
