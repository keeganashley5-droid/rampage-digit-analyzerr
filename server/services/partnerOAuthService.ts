import { createHash, randomBytes } from 'node:crypto';
import { database } from './database.js';
import { config } from '../config.js';
import { encryptPartnerToken } from './partnerTokenEncryption.js';

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export async function createPartnerTransaction(ownerId: string) {
  if (!config.partnerOAuth.redirectUri || !config.partnerOAuth.clientId) {
    throw new Error('Partner OAuth is not configured.');
  }

  const state = randomBytes(32).toString('hex');
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256')
    .update(verifier)
    .digest('base64url');

  await database.query(
    'DELETE FROM admin_oauth_transactions WHERE expires_at <= NOW()',
  );

  await database.query(
    `INSERT INTO admin_oauth_transactions
       (state_hash, code_verifier, admin_user_id, expires_at)
     VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes')`,
    [hash(state), verifier, ownerId],
  );

  const url = new URL(config.derivOAuth.authorizationUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.partnerOAuth.clientId);
  url.searchParams.set('redirect_uri', config.partnerOAuth.redirectUri);
  url.searchParams.set('scope', 'application_read');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return { state, authorizationUrl: url.toString() };
}

export async function consumePartnerTransaction(state: string) {
  const result = await database.query<{
    code_verifier: string;
    admin_user_id: string;
  }>(
    `DELETE FROM admin_oauth_transactions
     WHERE state_hash = $1 AND expires_at > NOW()
     RETURNING code_verifier, admin_user_id`,
    [hash(state)],
  );

  const transaction = result.rows[0];
  if (!transaction) return null;

  return {
    codeVerifier: transaction.code_verifier,
    ownerId: transaction.admin_user_id,
  };
}

interface TokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  error?: unknown;
}

export async function exchangeAndStorePartnerToken(
  code: string,
  verifier: string,
  ownerId: string,
): Promise<void> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.partnerOAuth.clientId,
    code,
    code_verifier: verifier,
    redirect_uri: config.partnerOAuth.redirectUri,
  });

  const response = await fetch(config.derivOAuth.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error('Partner OAuth token exchange was rejected.');
  }

  const data = await response.json() as TokenResponse;

  if (
    typeof data.access_token !== 'string' ||
    !data.access_token.trim() ||
    data.access_token.length > 16384
  ) {
    throw new Error('Partner OAuth returned an invalid access token.');
  }

  if (typeof data.scope !== 'string' || !data.scope.trim()) {
    throw new Error('Partner OAuth did not confirm the granted permission scope.');
  }

  const scope = data.scope.trim();
  const scopes = scope.split(/\s+/).filter(Boolean);

  if (scopes.length !== 1 || scopes[0] !== 'application_read') {
    throw new Error('Partner OAuth returned an unexpected permission scope.');
  }

  const expiresIn =
    typeof data.expires_in === 'number' &&
    Number.isFinite(data.expires_in) &&
    data.expires_in > 0
      ? data.expires_in
      : null;

  const expiresAt = expiresIn === null
    ? null
    : new Date(Date.now() + expiresIn * 1000);

  const encrypted = encryptPartnerToken(data.access_token);

  await database.query(
    `INSERT INTO admin_integrations (
       provider, encrypted_access_token, encryption_iv,
       encryption_auth_tag, token_expires_at, granted_scope,
       status, connected_by, connected_at, updated_at
     )
     VALUES (
       'deriv_partner', $1, $2, $3, $4, $5,
       'connected', $6, NOW(), NOW()
     )
     ON CONFLICT (provider) DO UPDATE SET
       encrypted_access_token = EXCLUDED.encrypted_access_token,
       encryption_iv = EXCLUDED.encryption_iv,
       encryption_auth_tag = EXCLUDED.encryption_auth_tag,
       token_expires_at = EXCLUDED.token_expires_at,
       granted_scope = EXCLUDED.granted_scope,
       status = 'connected',
       connected_by = EXCLUDED.connected_by,
       connected_at = NOW(),
       updated_at = NOW()`,
    [
      encrypted.encryptedAccessToken,
      encrypted.encryptionIv,
      encrypted.encryptionAuthTag,
      expiresAt,
      scope,
      ownerId,
    ],
  );
}

export async function getPartnerConnectionStatus() {
  const result = await database.query<{
    status: string;
    granted_scope: string;
    token_expires_at: Date | null;
    connected_at: Date;
  }>(
    `SELECT status, granted_scope, token_expires_at, connected_at
     FROM admin_integrations
     WHERE provider = 'deriv_partner'
     LIMIT 1`,
  );

  const row = result.rows[0];

  if (!row) return { connected: false };

  return {
    connected: row.status === 'connected',
    scope: row.granted_scope,
    expiresAt: row.token_expires_at?.toISOString() ?? null,
    connectedAt: row.connected_at.toISOString(),
  };
}

export async function disconnectPartnerIntegration(): Promise<void> {
  await database.query(
    `DELETE FROM admin_integrations WHERE provider = 'deriv_partner'`,
  );
}