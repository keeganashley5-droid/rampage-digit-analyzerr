import { Router, type Request, type Response } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';
import {
  requireAdmin,
  requireOwner,
  type AdminAuthenticatedRequest,
} from '../middleware/adminSession.js';
import { requireAdminOrigin } from '../middleware/adminSecurity.js';
import {
  createPartnerTransaction,
  consumePartnerTransaction,
  exchangeAndStorePartnerToken,
  getPartnerConnectionStatus,
  disconnectPartnerIntegration,
} from '../services/partnerOAuthService.js';

const oauthRouter = Router();
const apiRouter = Router();

const COOKIE_NAME = config.isProduction
  ? '__Host-rampage_partner_oauth_state'
  : 'rampage_partner_oauth_state';

const COOKIE_MAX_AGE = 10 * 60 * 1000;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function readStateCookie(req: Request): string {
  const header = req.headers.cookie || '';
  const part = header.split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${COOKIE_NAME}=`));

  if (!part) return '';

  try {
    return decodeURIComponent(part.slice(COOKIE_NAME.length + 1));
  } catch {
    return '';
  }
}

function clearStateCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

function adminRedirect(res: Response, result: string): void {
  res.redirect(
    `${config.appUrl}/admin?partnerOAuth=${encodeURIComponent(result)}`,
  );
}

oauthRouter.get('/connect', requireAdmin, requireOwner, async (req, res) => {
  try {
    const admin = (req as AdminAuthenticatedRequest).admin;
    if (!admin) {
      res.status(401).send('Administrator authentication required.');
      return;
    }

    const transaction = await createPartnerTransaction(admin.id);

    res.cookie(COOKIE_NAME, transaction.state, {
      httpOnly: true,
      secure: config.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    });

    res.redirect(transaction.authorizationUrl);
  } catch (error) {
    console.error(
      'Partner OAuth initiation failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    adminRedirect(res, 'start_failed');
  }
});

oauthRouter.get('/callback', async (req, res) => {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const cookieState = readStateCookie(req);

  clearStateCookie(res);

  if (req.query.error) {
    adminRedirect(res, 'authorization_denied');
    return;
  }

  if (!state || !cookieState || !safeEqual(state, cookieState)) {
    adminRedirect(res, 'invalid_state');
    return;
  }

  if (!code || code.length > 4096) {
    adminRedirect(res, 'missing_code');
    return;
  }

  try {
    const transaction = await consumePartnerTransaction(state);

    if (!transaction) {
      adminRedirect(res, 'transaction_expired');
      return;
    }

    await exchangeAndStorePartnerToken(
      code,
      transaction.codeVerifier,
      transaction.ownerId,
    );

    adminRedirect(res, 'connected');
  } catch (error) {
    console.error(
      'Partner OAuth callback failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    adminRedirect(res, 'exchange_failed');
  }
});

apiRouter.get('/status', requireAdmin, requireOwner, async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(await getPartnerConnectionStatus());
  } catch {
    res.status(503).json({ error: 'partner_status_unavailable' });
  }
});

apiRouter.post(
  '/disconnect',
  requireAdminOrigin,
  requireAdmin,
  requireOwner,
  async (_req, res) => {
    try {
      res.setHeader('Cache-Control', 'no-store');
      await disconnectPartnerIntegration();
      res.status(200).json({ connected: false });
    } catch {
      res.status(503).json({ error: 'partner_disconnect_unavailable' });
    }
  },
);

export { oauthRouter as partnerOAuthRouter, apiRouter as partnerAdminApiRouter };