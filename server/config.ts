
const isProduction = process.env.NODE_ENV === 'production';

const appUrl = process.env.APP_URL?.trim() || 'http://localhost:3000';
const oauthClientId = process.env.DERIV_OAUTH_CLIENT_ID?.trim() || '';
const oauthRedirectUri = process.env.DERIV_OAUTH_REDIRECT_URI?.trim() || '';
const oauthScope = process.env.DERIV_OAUTH_SCOPE?.trim() || 'trade';
const partnerOAuthRedirectUri =
  process.env.DERIV_PARTNER_OAUTH_REDIRECT_URI?.trim() || '';

if (isProduction) {
  if (!oauthClientId) {
    throw new Error('DERIV_OAUTH_CLIENT_ID is required in production.');
  }

  let parsedAppUrl: URL;
  let parsedRedirectUri: URL;

  try {
    parsedAppUrl = new URL(appUrl);
    parsedRedirectUri = new URL(oauthRedirectUri);
  } catch {
    throw new Error('APP_URL and DERIV_OAUTH_REDIRECT_URI must be valid URLs.');
  }

  if (
    parsedAppUrl.protocol !== 'https:' ||
    parsedAppUrl.pathname !== '/' ||
    parsedAppUrl.search ||
    parsedAppUrl.hash ||
    parsedAppUrl.username ||
    parsedAppUrl.password
  ) {
    throw new Error('APP_URL must be a valid HTTPS origin.');
  }

  if (
    parsedRedirectUri.protocol !== 'https:' ||
    parsedRedirectUri.pathname !== '/oauth/callback' ||
    parsedRedirectUri.search ||
    parsedRedirectUri.hash ||
    parsedRedirectUri.username ||
    parsedRedirectUri.password
  ) {
    throw new Error(
      'DERIV_OAUTH_REDIRECT_URI must be an HTTPS URL ending in /oauth/callback.',
    );
  }

  if (parsedRedirectUri.origin !== parsedAppUrl.origin) {
    throw new Error(
      'The OAuth callback origin must match APP_URL.',
    );
  }

  let parsedPartnerRedirectUri: URL;

  try {
    parsedPartnerRedirectUri = new URL(partnerOAuthRedirectUri);
  } catch {
    throw new Error(
      'DERIV_PARTNER_OAUTH_REDIRECT_URI must be a valid URL.',
    );
  }

  if (
    parsedPartnerRedirectUri.protocol !== 'https:' ||
    parsedPartnerRedirectUri.pathname !== '/admin/oauth/callback' ||
    parsedPartnerRedirectUri.search ||
    parsedPartnerRedirectUri.hash ||
    parsedPartnerRedirectUri.username ||
    parsedPartnerRedirectUri.password
  ) {
    throw new Error(
      'DERIV_PARTNER_OAUTH_REDIRECT_URI must be an HTTPS URL ending in /admin/oauth/callback.',
    );
  }

  if (parsedPartnerRedirectUri.origin !== parsedAppUrl.origin) {
    throw new Error(
      'The Partner OAuth callback origin must match APP_URL.',
    );
  }

  const requestedScopes = [...new Set(oauthScope.split(/\s+/).filter(Boolean))];
  const allowedScopes = new Set(['trade', 'application_read']);

  if (
    !requestedScopes.includes('trade') ||
    requestedScopes.some((scope) => !allowedScopes.has(scope))
  ) {
    throw new Error(
      'DERIV_OAUTH_SCOPE must include trade and may include application_read only.',
    );
  }
}

export const config = Object.freeze({
  isProduction,
  port: Number(process.env.PORT) || 8787,
  appUrl,
  partnerOAuth: Object.freeze({
    clientId: oauthClientId,
    redirectUri: partnerOAuthRedirectUri,
  }),
  derivOAuth: Object.freeze({
    clientId: oauthClientId,
    redirectUri: oauthRedirectUri,
    scope: oauthScope,
    authorizationUrl: 'https://auth.deriv.com/oauth2/auth',
    tokenUrl: 'https://auth.deriv.com/oauth2/token',
  }),
});
