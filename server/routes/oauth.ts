import { timingSafeEqual } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { config } from '../config.js';
import { exchangeAuthorizationCode } from '../services/derivOAuth.js';
import { oauthState } from '../services/oauthState.js';
import { sessionStore } from '../services/sessionStore.js';
import { sessionCookie } from '../middleware/session.js';

const router = Router();

const STATE_COOKIE = config.isProduction
  ? '__Host-rampage_oauth_state'
  : 'rampage_oauth_state';

const STATE_COOKIE_MAX_AGE = 10 * 60 * 1000;
const REFERRAL_TOKEN = 'DZT8UA7W4EJS';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  return a.length === b.length && timingSafeEqual(a, b);
}

function readStateCookie(req: Request): string {
  const header = req.headers.cookie || '';

  const value = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  if (!value) return '';

  try {
    return decodeURIComponent(value);
  } catch {
    return '';
  }
}

function clearStateCookie(res: Response): void {
  res.clearCookie(STATE_COOKIE, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

function redirectWithError(res: Response, error: string): void {
  res.redirect(`${config.appUrl}/?authError=${encodeURIComponent(error)}`);
}

function beginOAuth(res: Response, registration: boolean): void {
  if (!config.derivOAuth.clientId || !config.derivOAuth.redirectUri) {
    redirectWithError(res, 'oauth_not_configured');
    return;
  }

  const transaction = oauthState.create();

  res.cookie(STATE_COOKIE, transaction.state, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: STATE_COOKIE_MAX_AGE,
  });

  const authorizationUrl = new URL(config.derivOAuth.authorizationUrl);

  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', config.derivOAuth.clientId);
  authorizationUrl.searchParams.set('redirect_uri', config.derivOAuth.redirectUri);
  authorizationUrl.searchParams.set('scope', config.derivOAuth.scope);
  authorizationUrl.searchParams.set('state', transaction.state);
  authorizationUrl.searchParams.set('code_challenge', transaction.codeChallenge);
  authorizationUrl.searchParams.set('code_challenge_method', 'S256');

  if (registration) {
    authorizationUrl.searchParams.set('prompt', 'registration');
    authorizationUrl.searchParams.set('t', REFERRAL_TOKEN);
  }

  res.redirect(authorizationUrl.toString());
}

router.get('/deriv/login', (_req: Request, res: Response) => {
  beginOAuth(res, false);
});

router.get('/deriv/register', (_req: Request, res: Response) => {
  beginOAuth(res, true);
});

router.get('/callback', async (req: Request, res: Response) => {
  const state = typeof req.query.state === 'string' ? req.query.state : '';
  const code = typeof req.query.code === 'string' ? req.query.code : '';
  const cookieState = readStateCookie(req);

  clearStateCookie(res);

  if (req.query.error) {
    redirectWithError(res, 'deriv_authorization_denied');
    return;
  }

  if (!state || !cookieState || !safeEqual(state, cookieState)) {
    redirectWithError(res, 'oauth_state_invalid');
    return;
  }

  if (!code || code.length > 4096) {
    redirectWithError(res, 'oauth_code_missing');
    return;
  }

  const codeVerifier = oauthState.consume(state);

  if (!codeVerifier) {
    redirectWithError(res, 'oauth_transaction_expired');
    return;
  }

  try {
    const token = await exchangeAuthorizationCode(code, codeVerifier);

    const sessionId = sessionStore.create(
      token.accessToken,
      token.expiresAt,
    );

    sessionCookie.set(res, sessionId);
    res.redirect(config.appUrl);
  } catch {
    redirectWithError(res, 'oauth_exchange_failed');
  }
});

export default router;
