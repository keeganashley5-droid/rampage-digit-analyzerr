
import { useEffect, useState, type FormEvent } from 'react';

interface AdminUser {
  id: string;
  email: string;
  role: 'owner';
}

interface PartnerStatus {
  connected: boolean;
  scope?: string;
  connectedAt?: string | null;
  expiresAt?: string | null;
}

interface PlatformStrategyOverride {
  name?: string;
  description?: string;
  defaultBarrier?: number;
  maxRunsPerCycle?: number;
  martingaleEnabled?: boolean;
  consecutiveRequired?: number;
  matchesTargetMode?: 'second_most_frequent' | 'most_frequent' | 'custom_digit';
  matchesCustomDigit?: number;
  isEnabled?: boolean;
}

interface PlatformStrategyConfig {
  overrides: Record<string, PlatformStrategyOverride>;
}

const PLATFORM_STRATEGIES = [
  { id: 'matches', name: 'Matches' },
  { id: 'over5', name: 'Over 5' },
  { id: 'under5', name: 'Under 5' },
  { id: 'dual_bar_over3', name: 'Dual Bar Over 3' },
  { id: 'triple_tap_over3', name: 'Triple Tap Over 3' },
  { id: 'under6', name: 'Under 6' },
  { id: 'under7', name: 'Under 7' },
  { id: 'digit_frequency_switch', name: 'Digit Frequency Switch' },
] as const;
interface AuthResponse {
  authenticated: boolean;
  user?: AdminUser;
  error?: string;
}

async function adminRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api/admin/${endpoint}`, {
    method,
    credentials: 'same-origin',
    headers: {
      ...(method !== 'GET' ? {
        'Content-Type': 'application/json',
        'X-Admin-Request': '1',
      } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      'Administrator request failed.',
    );
  }

  return data as T;
}

export default function AdminApp() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [partnerStatus, setPartnerStatus] = useState<PartnerStatus | null>(null);
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerBusy, setPartnerBusy] = useState(false);
  const [partnerMessage, setPartnerMessage] = useState('');
  const [partnerError, setPartnerError] = useState('');
  const [strategyConfig, setStrategyConfig] = useState<PlatformStrategyConfig>({ overrides: {} });
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [strategySaving, setStrategySaving] = useState(false);
  const [strategyMessage, setStrategyMessage] = useState('');
  const [strategyError, setStrategyError] = useState('');

  useEffect(() => {
    let active = true;

    adminRequest<AuthResponse>('me')
      .then((result) => {
        if (active && result.authenticated && result.user) {
          setUser(result.user);
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('partnerOAuth');

    if (outcome) {
      const messages: Record<string, string> = {
        connected: 'Deriv Partner authorization completed.',
        start_failed: 'Could not start Partner authorization.',
        authorization_denied: 'Partner authorization was denied.',
        invalid_state: 'Authorization state was invalid.',
        missing_code: 'Authorization code was missing.',
        transaction_expired: 'Authorization session expired.',
        exchange_failed: 'Could not complete the token exchange.',
      };

      if (outcome === 'connected') {
        setPartnerMessage(messages[outcome]);
        setPartnerError('');
      } else {
        setPartnerError(messages[outcome] || 'Partner authorization failed.');
        setPartnerMessage('');
      }

      params.delete('partnerOAuth');
      const query = params.toString();
      window.history.replaceState(
        {},
        '',
        window.location.pathname + (query ? `?${query}` : '') + window.location.hash,
      );
    }

    if (user.role !== 'owner') {
      setPartnerStatus(null);
      return;
    }

    let active = true;
    setPartnerLoading(true);

    adminRequest<PartnerStatus>('partner/status')
      .then((result) => {
        if (active) setPartnerStatus(result);
      })
      .catch((err) => {
        if (active) {
          setPartnerError(err instanceof Error ? err.message : 'Could not load Partner status.');
        }
      })
      .finally(() => {
        if (active) setPartnerLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  function handlePartnerConnect() {
    setPartnerError('');
    setPartnerMessage('Redirecting to Deriv Partner authorization...');
    window.location.assign('/admin/oauth/connect');
  }

  async function handlePartnerDisconnect() {
    setPartnerBusy(true);
    setPartnerError('');
    setPartnerMessage('');

    try {
      await adminRequest<{ connected: boolean }>('partner/disconnect', 'POST', {});
      setPartnerStatus({ connected: false });
      setPartnerMessage('Deriv Partner connection disconnected.');
    } catch (err) {
      setPartnerError(err instanceof Error ? err.message : 'Could not disconnect Partner integration.');
    } finally {
      setPartnerBusy(false);
    }
  }
  function updatePlatformStrategy(
    strategyId: string,
    field: keyof PlatformStrategyOverride,
    value: string | number | boolean,
  ) {
    setStrategyConfig((current) => ({
      ...current,
      overrides: {
        ...current.overrides,
        [strategyId]: {
          ...current.overrides[strategyId],
          [field]: value,
        },
      },
    }));
    setStrategyMessage('');
    setStrategyError('');
  }

  async function handleSaveStrategies() {
    setStrategySaving(true);
    setStrategyMessage('');
    setStrategyError('');

    try {
      const result = await adminRequest<PlatformStrategyConfig>(
        'strategies',
        'PUT',
        strategyConfig,
      );
      setStrategyConfig(result);
      setStrategyMessage('Platform strategy settings saved.');
    } catch (err) {
      setStrategyError(err instanceof Error ? err.message : 'Could not save platform strategy settings.');
    } finally {
      setStrategySaving(false);
    }
  }
  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await adminRequest<AuthResponse>(
        'login',
        'POST',
        { email, password },
      );

      if (!result.authenticated || !result.user) {
        throw new Error('Unable to establish administrator session.');
      }

      setUser(result.user);
      setPassword('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Login failed. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setError('');

    try {
      await adminRequest<AuthResponse>('logout', 'POST', {});
      setUser(null);
      setPassword('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Logout failed.',
      );
    }
  }

  if (loading || checkingSession) {
    return (
      <main className="admin-loading">
        <div className="admin-spinner" />
        <p>Securing administrator session...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <div className="admin-brand-mark">R</div>

          <p className="admin-eyebrow">PRIVATE ADMINISTRATION</p>
          <h1>Administrator Portal</h1>
          <p className="admin-subtitle">
            Sign in to manage Rampage Digit Analyzer.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="admin-email">Email address</label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              maxLength={254}
              required
            />

            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              maxLength={128}
              required
            />

            {error && (
              <div className="admin-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="admin-login-button"
            >
              {submitting ? 'Authenticating...' : 'Secure Sign In'}
            </button>
          </form>

          <div className="admin-security-note">
            <span>â—</span> Protected administrator access
          </div>
        </section>

        <footer className="admin-footer">
          RAMPAGE DIGIT ANALYZER Â· PRIVATE PORTAL
        </footer>
      </main>
    );
  }

  return (
    <main className="admin-dashboard">
      <header className="admin-topbar">
        <div>
          <p className="admin-eyebrow">RAMPAGE DIGIT ANALYZER</p>
          <h1>Administration</h1>
        </div>

        <div className="admin-account">
          <div>
            <strong>{user.email}</strong>
            <span>{user.role.toUpperCase()}</span>
          </div>
          <button onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      {error && (
        <div className="admin-error" role="alert">
          {error}
        </div>
      )}

      <section className="admin-welcome">
        <p className="admin-eyebrow">SECURE SESSION ACTIVE</p>
        <h2>Welcome to your administration portal.</h2>
        <p>
          Your administrator authentication is working.
          Management modules will be connected here next.
        </p>
      </section>

      <section className="admin-module-grid">
        <article className="admin-module-card admin-strategy-card">
          <span>01</span>
          <h3>Strategy Management</h3>
          <p>Platform-wide settings for all built-in trading strategies.</p>

          {strategyLoading ? (
            <p>Loading platform strategy settings...</p>
          ) : (
            <div className="admin-strategy-list">
              {PLATFORM_STRATEGIES.map((strategy) => {
                const config = strategyConfig.overrides[strategy.id] || {};
                return (
                  <section className="admin-strategy-item" key={strategy.id}>
                    <div className="admin-strategy-heading">
                      <strong>{strategy.name}</strong>
                      <label className="admin-strategy-toggle">
                        <input
                          type="checkbox"
                          checked={config.isEnabled !== false}
                          onChange={(event) => updatePlatformStrategy(strategy.id, 'isEnabled', event.target.checked)}
                        />
                        Enabled
                      </label>
                    </div>

                    <div className="admin-strategy-fields">
                      <label>
                        Display name
                        <input
                          type="text"
                          maxLength={60}
                          value={config.name ?? ''}
                          placeholder={strategy.name}
                          onChange={(event) => updatePlatformStrategy(strategy.id, 'name', event.target.value)}
                        />
                      </label>

                      <label>
                        Default barrier (0–9)
                        <input
                          type="number"
                          min={0}
                          max={9}
                          value={config.defaultBarrier ?? ''}
                          placeholder="Use strategy default"
                          onChange={(event) => updatePlatformStrategy(strategy.id, 'defaultBarrier', Number(event.target.value))}
                        />
                      </label>

                      <label>
                        Maximum runs per cycle
                        <input
                          type="number"
                          min={1}
                          max={1000}
                          value={config.maxRunsPerCycle ?? ''}
                          placeholder="Use strategy default"
                          onChange={(event) => updatePlatformStrategy(strategy.id, 'maxRunsPerCycle', Number(event.target.value))}
                        />
                      </label>

                      <label className="admin-strategy-toggle">
                        <input
                          type="checkbox"
                          checked={config.martingaleEnabled ?? false}
                          onChange={(event) => updatePlatformStrategy(strategy.id, 'martingaleEnabled', event.target.checked)}
                        />
                        Martingale enabled
                      </label>

                      {(strategy.id === 'over5' || strategy.id === 'under5' || strategy.id === 'triple_tap_over3') && (
                        <label>
                          Consecutive confirmations
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={config.consecutiveRequired ?? ''}
                            placeholder="Use strategy default"
                            onChange={(event) => updatePlatformStrategy(strategy.id, 'consecutiveRequired', Number(event.target.value))}
                          />
                        </label>
                      )}

                      {strategy.id === 'matches' && (
                        <>
                          <label>
                            Matches target
                            <select
                              value={config.matchesTargetMode ?? 'second_most_frequent'}
                              onChange={(event) => updatePlatformStrategy(strategy.id, 'matchesTargetMode', event.target.value)}
                            >
                              <option value="second_most_frequent">Second most frequent</option>
                              <option value="most_frequent">Most frequent</option>
                              <option value="custom_digit">Custom digit</option>
                            </select>
                          </label>
                          {config.matchesTargetMode === 'custom_digit' && (
                            <label>
                              Custom digit
                              <input
                                type="number"
                                min={0}
                                max={9}
                                value={config.matchesCustomDigit ?? ''}
                                onChange={(event) => updatePlatformStrategy(strategy.id, 'matchesCustomDigit', Number(event.target.value))}
                              />
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {strategyError && <p className="admin-error" role="alert">{strategyError}</p>}
          {strategyMessage && <p className="admin-partner-message">{strategyMessage}</p>}
          <button
            className="admin-partner-button"
            onClick={handleSaveStrategies}
            disabled={strategyLoading || strategySaving}
          >
            {strategySaving ? 'SAVING...' : 'Save Platform Strategy Settings'}
          </button>
        </article>

        <article className="admin-module-card">
          <span>02</span>
          <h3>Revenue</h3>
          <p>Verified affiliate reporting and revenue analytics.</p>
          <small>MODULE PENDING</small>
        </article>

                <article className="admin-module-card admin-partner-card">
          <span>03</span>
          <h3>Partner</h3>
          <p>Manage the secure Deriv Partner authorization.</p>

          {user.role === 'owner' ? (
            <div className="admin-partner-controls">
              <div className="admin-partner-status">
                <span className={partnerStatus?.connected ? 'status-connected' : 'status-disconnected'}>
                  {partnerLoading ? 'CHECKING...' : partnerStatus?.connected ? 'CONNECTED' : 'NOT CONNECTED'}
                </span>
                {partnerStatus?.connected && partnerStatus.scope && (
                  <small>Permissions: {partnerStatus.scope}</small>
                )}
              </div>

              {partnerStatus?.connected && (
                <div>
                  {partnerStatus.connectedAt && (
                    <small>Connected: {new Date(partnerStatus.connectedAt).toLocaleString()}</small>
                  )}
                  {partnerStatus.expiresAt && (
                    <small>Token expiry: {new Date(partnerStatus.expiresAt).toLocaleString()}</small>
                  )}
                </div>
              )}

              <button
                className={partnerStatus?.connected ? 'admin-partner-button admin-partner-disconnect' : 'admin-partner-button'}
                onClick={partnerStatus?.connected ? handlePartnerDisconnect : handlePartnerConnect}
                disabled={partnerLoading || partnerBusy}
              >
                {partnerBusy ? 'PLEASE WAIT...' : partnerStatus?.connected ? 'Disconnect Partner' : 'Connect Deriv Partner'}
              </button>

              {partnerMessage && <p className="admin-partner-message">{partnerMessage}</p>}
              {partnerError && <p className="admin-error" role="alert">{partnerError}</p>}
            </div>
          ) : (
            <small>OWNER ACCESS REQUIRED</small>
          )}
        </article>

        <article className="admin-module-card">
          <span>04</span>
          <h3>Security</h3>
          <p>Administrator accounts, passwords and sessions.</p>
          <small>MODULE PENDING</small>
        </article>
      </section>
    </main>
  );
}




