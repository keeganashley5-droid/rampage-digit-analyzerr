import type { NextFunction, Request, Response } from 'express';
import { sessionStore } from '../services/sessionStore.js';
import { sessionCookie } from './session.js';

export interface AuthenticatedRequest extends Request {
  serverSession?: {
    accessToken: string;
  };
}

export function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const sessionId = sessionCookie.read(req);

  if (!sessionId) {
    res.status(401).json({
      error: 'authentication_required',
      message: 'Please connect your Deriv account again.',
    });
    return;
  }

  const session = sessionStore.get(sessionId);

  if (!session) {
    sessionCookie.clear(res);
    res.status(401).json({
      error: 'session_expired',
      message: 'Your session has expired. Please reconnect your Deriv account.',
    });
    return;
  }

  (req as AuthenticatedRequest).serverSession = {
    accessToken: session.accessToken,
  };

  next();
}
