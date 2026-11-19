import type { Request, Response } from 'express';
import { config } from '../config.js';

const COOKIE_NAME = config.isProduction
  ? '__Host-rampage_session'
  : 'rampage_session';

const COOKIE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;

  if (!header) {
    return undefined;
  }

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');

    if (separator < 0) {
      continue;
    }

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (key === name) {
      try {
        return decodeURIComponent(value);
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

export const sessionCookie = Object.freeze({
  name: COOKIE_NAME,

  read(req: Request): string | undefined {
    return readCookie(req, COOKIE_NAME);
  },

  set(res: Response, sessionId: string): void {
    res.cookie(COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE_MS,
    });
  },

  clear(res: Response): void {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  },
});
