const DERIV_API_BASE = 'https://api.derivws.com';

export interface DerivOptionsAccount {
  account_id: string;
  account_type: 'demo' | 'real' | string;
  currency: string;
  balance?: number;
  status?: string;
  group?: string;
}

interface DerivApiError {
  message?: unknown;
  code?: unknown;
}

interface DerivAccountsResponse {
  data?: unknown;
  errors?: DerivApiError[];
}

interface DerivOtpResponse {
  data?: {
    url?: unknown;
  };
  errors?: DerivApiError[];
}

function getSafeErrorMessage(data: DerivAccountsResponse | DerivOtpResponse): string {
  const message = data.errors?.[0]?.message;

  return typeof message === 'string'
    ? message
    : 'Deriv could not complete the account request.';
}

async function derivRequest<T>(
  path: string,
  accessToken: string,
  method: 'GET' | 'POST',
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${DERIV_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error('Could not reach the Deriv account service.');
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error('Deriv returned an invalid account-service response.');
  }

  if (!response.ok) {
    const errorData = data as DerivAccountsResponse;
    throw new Error(
      response.status === 401
        ? 'Your Deriv authorization has expired. Please reconnect.'
        : response.status === 403
          ? 'Your Deriv authorization does not have the required permission.'
          : getSafeErrorMessage(errorData),
    );
  }

  return data as T;
}

function isAccount(value: unknown): value is DerivOptionsAccount {
  if (!value || typeof value !== 'object') return false;

  const account = value as Record<string, unknown>;

  return (
    typeof account.account_id === 'string' &&
    account.account_id.length > 0 &&
    typeof account.account_type === 'string' &&
    typeof account.currency === 'string'
  );
}

export async function getOptionsAccounts(
  accessToken: string,
): Promise<DerivOptionsAccount[]> {
  const result = await derivRequest<DerivAccountsResponse>(
    '/trading/v1/options/accounts',
    accessToken,
    'GET',
  );

  const accounts = Array.isArray(result.data)
    ? result.data
    : result.data &&
        typeof result.data === 'object' &&
        Array.isArray((result.data as Record<string, unknown>).accounts)
      ? (result.data as { accounts: unknown[] }).accounts
      : [];

  return accounts.filter(isAccount).map((account) => ({
    account_id: account.account_id,
    account_type: account.account_type,
    currency: account.currency,
    ...(typeof account.balance === 'number' ? { balance: account.balance } : {}),
    ...(typeof account.status === 'string' ? { status: account.status } : {}),
    ...(typeof account.group === 'string' ? { group: account.group } : {}),
  }));
}

export async function getOptionsWebSocketUrl(
  accessToken: string,
  accountId: string,
): Promise<string> {
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(accountId)) {
    throw new Error('Invalid Deriv account ID.');
  }

  const result = await derivRequest<DerivOtpResponse>(
    `/trading/v1/options/accounts/${encodeURIComponent(accountId)}/otp`,
    accessToken,
    'POST',
  );

  const url = result.data?.url;

  if (typeof url !== 'string') {
    throw new Error('Deriv did not return an authenticated WebSocket URL.');
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Deriv returned an invalid WebSocket URL.');
  }

  if (
    parsed.protocol !== 'wss:' ||
    parsed.hostname !== 'api.derivws.com' ||
    !/^\/trading\/v1\/options\/ws\/(demo|real)$/.test(parsed.pathname) ||
    !parsed.searchParams.has('otp')
  ) {
    throw new Error('Deriv returned an unexpected WebSocket endpoint.');
  }

  return url;
}
