export interface DerivOAuthAccount {
  account_id: string;
  account_type: 'demo' | 'real' | string;
  currency: string;
  balance?: number;
  status?: string;
  group?: string;
}

export interface DerivSession {
  connected: boolean;
  accounts: DerivOAuthAccount[];
}

export interface DerivOtpConnection {
  accountId: string;
  accountType: 'demo' | 'real' | string;
  url: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof result?.error === 'string'
        ? result.error
        : `Deriv authentication request failed (${response.status})`;

    throw new Error(message);
  }

  return result as T;
}

export async function getDerivSession(): Promise<DerivSession> {
  return request<DerivSession>('/api/deriv/session');
}

export async function getDerivAccounts(): Promise<DerivOAuthAccount[]> {
  const result = await request<{ accounts: DerivOAuthAccount[] }>(
    '/api/deriv/accounts'
  );

  return result.accounts;
}

export async function getDerivOtp(
  accountId: string
): Promise<DerivOtpConnection> {
  if (!accountId || !/^[A-Za-z0-9_-]{3,64}$/.test(accountId)) {
    throw new Error('Invalid Deriv account selection');
  }

  return request<DerivOtpConnection>(
    `/api/deriv/accounts/${encodeURIComponent(accountId)}/otp`,
    { method: 'POST' }
  );
}

export async function logoutDerivSession(): Promise<void> {
  await request<{ connected: boolean }>('/api/deriv/logout', {
    method: 'POST'
  });
}
