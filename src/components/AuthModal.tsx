import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LogIn,
  LogOut,
  ShieldCheck,
  X,
} from 'lucide-react';
import { UserAccount } from '../types/deriv';
import type { DerivOAuthAccount } from '../services/derivOAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserAccount | null;
  oauthAccounts: DerivOAuthAccount[];
  onAuthorizeOAuth: (account: DerivOAuthAccount) => Promise<boolean>;
  onDisconnectAccount: () => void;
  onAuthorizeRealTrading: (authorized: boolean) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  account,
  oauthAccounts,
  onAuthorizeOAuth,
  onDisconnectAccount,
  onAuthorizeRealTrading,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedOAuthAccountId, setSelectedOAuthAccountId] = useState('');

  useEffect(() => {
    if (oauthAccounts.length === 0) {
      setSelectedOAuthAccountId('');
      return;
    }

    setSelectedOAuthAccountId((current) => {
      if (oauthAccounts.some((item) => item.account_id === current)) return current;
      const demo = oauthAccounts.find((item) => item.account_type === 'demo');
      return (demo || oauthAccounts[0]).account_id;
    });
  }, [oauthAccounts]);

  const selectedOAuthAccount = oauthAccounts.find(
    (item) => item.account_id === selectedOAuthAccountId
  );

  const handleConnectOAuthAccount = async () => {
    if (!selectedOAuthAccount || isLoading) return;

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const ok = await onAuthorizeOAuth(selectedOAuthAccount);
      if (ok) {
        setSuccessMsg('Successfully connected to your Deriv account.');
      } else {
        setErrorMsg('Could not connect to the selected Deriv account.');
      }
    } catch (error: unknown) {
      setErrorMsg(error instanceof Error ? error.message : 'Deriv account connection failed.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-200">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">Deriv Account Connection</h3>
              <p className="text-xs text-slate-400">Secure official Deriv OAuth authentication</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close account connection"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {account ? (
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {account.isVirtual ? 'DEMO ACCOUNT CONNECTED' : 'REAL ACCOUNT CONNECTED'}
                  </span>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  ID: {account.loginid}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase">Balance</div>
                  <div className="text-sm font-black text-white mt-0.5">
                    {account.currency} {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 uppercase">Account Type</div>
                  <div className="text-sm font-bold text-cyan-400 mt-0.5">
                    {account.isVirtual ? 'Virtual (Demo)' : 'Real Money'}
                  </div>
                </div>
              </div>

              {!account.isVirtual && (
                <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/40 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Explicit Real Money Authorization</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Real money purchases are disabled by default. You must explicitly authorize real execution.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input type="checkbox" checked={account.realTradingAuthorized}
                      onChange={(event) => onAuthorizeRealTrading(event.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-0" />
                    <span className="text-xs font-semibold text-slate-200">
                      I authorize Rampage Digit Analyzer to execute REAL trades on this account
                    </span>
                  </label>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button type="button" onClick={onDisconnectAccount}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect Account</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-b from-rose-950/25 via-slate-900/70 to-slate-900/60 border border-rose-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-rose-400 uppercase">
                  <LogIn className="w-4 h-4" />
                  <span>Connect securely with Deriv</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Sign in through Deriv's official authentication page. Your account credentials are entered only on Deriv.
                </p>
                <a href="/oauth/deriv/login"
                  className="w-full min-h-[46px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-500/25 transition-all">
                  <LogIn className="w-4 h-4" />
                  <span>Log in with Deriv</span>
                </a>
                <a href="https://t.deriv.link?t=DZT8UA7W4EJS" target="_blank" rel="noopener noreferrer"
                  className="block text-center text-xs text-slate-400 hover:text-rose-300 transition-colors py-1">
                  New to Deriv? Create an account
                </a>
              </div>

              {oauthAccounts.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs text-slate-300 font-mono" htmlFor="oauth-account-select">
                    SELECT DERIV ACCOUNT
                  </label>
                  <select id="oauth-account-select" value={selectedOAuthAccountId}
                    onChange={(event) => setSelectedOAuthAccountId(event.target.value)}
                    disabled={isLoading}
                    className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500">
                    {oauthAccounts.map((item) => (
                      <option key={item.account_id} value={item.account_id}>
                        {item.account_type.toUpperCase()} · {item.account_id} · {item.currency}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={handleConnectOAuthAccount}
                    disabled={!selectedOAuthAccount || isLoading}
                    className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-mono font-black uppercase tracking-wider transition-colors">
                    {isLoading ? 'Connecting...' : 'Connect Selected Account'}
                  </button>
                </div>
              )}

              {errorMsg && (
                <p role="alert" className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
                  {errorMsg}
                </p>
              )}
              {successMsg && (
                <p role="status" className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {successMsg}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};