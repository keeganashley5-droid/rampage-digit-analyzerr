import { config } from '../config.js';

export interface DerivTokenResult {
  accessToken: string;
  expiresAt: number | null;
  scope: string | null;
}

interface DerivTokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  error?: unknown;
}

export async function exchangeAuthorizationCode(
  code: string,
  codeVerifier: string,
): Promise<DerivTokenResult> {
  if (!config.derivOAuth.clientId || !config.derivOAuth.redirectUri) {
    throw new Error('Deriv OAuth is not configured.');
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.derivOAuth.clientId,
    code,
    code_verifier: codeVerifier,
    redirect_uri: config.derivOAuth.redirectUri,
  });

  let response: Response;

  try {
    response = await fetch(config.derivOAuth.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('Could not reach the Deriv OAuth token service.');
  }

  if (!response.ok) {
    throw new Error('Deriv rejected the OAuth authorization code.');
  }

  let data: DerivTokenResponse;

  try {
    data = await response.json() as DerivTokenResponse;
  } catch {
    throw new Error('Deriv returned an invalid OAuth response.');
  }

  if (typeof data.access_token !== 'string' || !data.access_token.trim()) {
    throw new Error('Deriv OAuth response did not contain a valid access token.');
  }

  const expiresIn =
    typeof data.expires_in === 'number' &&
    Number.isFinite(data.expires_in) &&
    data.expires_in > 0
      ? data.expires_in
      : null;

  return {
    accessToken: data.access_token,
    expiresAt: expiresIn === null
      ? null
      : Date.now() + expiresIn * 1000,
    scope: typeof data.scope === 'string' ? data.scope : null,
  };
}
