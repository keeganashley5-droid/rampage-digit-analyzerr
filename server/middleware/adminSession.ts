import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import {
  adminSessionStore,
  type AdminIdentity,
} from '../services/adminSessionStore.js';

const COOKIE_NAME = config.isProduction
  ? '__Host-rampage_admin_session'
  : 'rampage_admin_session';

const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function readAdminCookie(req: Request): string | undefined {
  const header = req.headers.cookie;

  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');

    if (separator < 0) continue;

    const name = part.slice(0, separator).trim();

    if (name !== COOKIE_NAME) continue;

    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export const adminSessionCookie = {
  name: COOKIE_NAME,

  read: readAdminCookie,

  set(res: Response, token: string): void {
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
    });
  },

  clear(res: Response): void {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'strict',
      path: '/',
    });
  },
};

export interface AdminAuthenticatedRequest extends Request {
  admin?: AdminIdentity;
  adminSessionId?: string;
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = adminSessionCookie.read(req);

    if (!token) {
      res.status(401).json({
        error: 'admin_authentication_required',
      });
      return;
    }

    const session = await adminSessionStore.find(token);

    if (!session) {
      adminSessionCookie.clear(res);

      res.status(401).json({
        error: 'admin_session_expired',
      });
      return;
    }

    const authenticatedReq = req as AdminAuthenticatedRequest;

    authenticatedReq.admin = session.user;
    authenticatedReq.adminSessionId = session.sessionId;

    next();
  } catch (error) {
    console.error(
      'Administrator session validation failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    res.status(500).json({
      error: 'admin_authentication_unavailable',
    });
  }
}
export async function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authenticatedReq = req as AdminAuthenticatedRequest;

  if (!authenticatedReq.admin) {
    res.status(401).json({
      error: 'admin_authentication_required',
    });
    return;
  }

  if (authenticatedReq.admin.role !== 'owner') {
    res.status(403).json({
      error: 'owner_access_required',
    });
    return;
  }

  next();
}
