import { Router, type Response } from 'express';
import { config } from '../config.js';
import { requireSession, type AuthenticatedRequest } from '../middleware/requireSession.js';
import { sessionCookie } from '../middleware/session.js';
import { sessionStore } from '../services/sessionStore.js';
import {
  getOptionsAccounts,
  getOptionsWebSocketUrl,
} from '../services/derivAccounts.js';

const router = Router();
const expectedOrigin = new URL(config.appUrl).origin;

router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'POST') {
    const origin = req.get('Origin');

    if (!origin || origin !== expectedOrigin) {
      res.status(403).json({
        error: 'origin_not_allowed',
        message: 'This request did not originate from the Rampage application.',
      });
      return;
    }
  }

  next();
});

function getAccessToken(req: AuthenticatedRequest): string | undefined {
  return req.serverSession?.accessToken;
}

function fail(res: Response, error: unknown): void {
  const message = error instanceof Error
    ? error.message
    : 'The Deriv account request failed.';

  res.status(502).json({
    error: 'deriv_request_failed',
    message,
  });
}

router.get('/session', requireSession, async (req, res) => {
  const token = getAccessToken(req as AuthenticatedRequest);

  if (!token) {
    res.status(401).json({ error: 'session_expired' });
    return;
  }

  try {
    const accounts = await getOptionsAccounts(token);
    res.json({ connected: true, accounts });
  } catch (error) {
    fail(res, error);
  }
});

router.get('/accounts', requireSession, async (req, res) => {
  const token = getAccessToken(req as AuthenticatedRequest);

  if (!token) {
    res.status(401).json({ error: 'session_expired' });
    return;
  }

  try {
    const accounts = await getOptionsAccounts(token);
    res.json({ accounts });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/accounts/:accountId/otp', requireSession, async (req, res) => {
  const token = getAccessToken(req as AuthenticatedRequest);
  const accountId = req.params.accountId;

  if (!token) {
    res.status(401).json({ error: 'session_expired' });
    return;
  }

  if (typeof accountId !== 'string' || !/^[A-Za-z0-9_-]{3,64}$/.test(accountId)) {
    res.status(400).json({ error: 'invalid_account_id' });
    return;
  }

  try {
    const accounts = await getOptionsAccounts(token);
    const account = accounts.find((item) => item.account_id === accountId);

    if (!account) {
      res.status(403).json({
        error: 'account_not_authorized',
        message: 'This account does not belong to your connected Deriv session.',
      });
      return;
    }

    const url = await getOptionsWebSocketUrl(token, accountId);

    res.json({
      accountId,
      accountType: account.account_type,
      url,
    });
  } catch (error) {
    fail(res, error);
  }
});

router.post('/logout', (req, res) => {
  const sessionId = sessionCookie.read(req);

  if (sessionId) {
    sessionStore.delete(sessionId);
  }

  sessionCookie.clear(res);
  res.status(200).json({ connected: false });
});

export default router;
