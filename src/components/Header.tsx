import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  LogIn,
  Settings,
  Shield,
  Wallet,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { AccountMode, SYNTHETIC_MARKETS, UserAccount } from '../types/deriv';
import { ConnectionStatus } from '../services/derivWs';
import { BullLogo } from './BullLogo';

interface HeaderProps {
  connectionStatus: ConnectionStatus;
  selectedMarket: string;
  onSelectMarket: (symbol: string) => void;
  account: UserAccount | null;
  accountMode: AccountMode;
  onToggleAccountMode: (mode: AccountMode) => void;
  onOpenAuthModal: () => void;
  currentTickQuote?: number;
  currentTickDigit?: number;
  appId?: string;
  isBrightAppearance: boolean;
  isAutomated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  selectedMarket,
  onSelectMarket,
  account,
  accountMode,
  onToggleAccountMode,
  onOpenAuthModal,
  currentTickQuote,
  currentTickDigit,
  appId = '1089',
  isBrightAppearance,
  isAutomated = false,
}) => {
  const isBright = isBrightAppearance;
  const currentMarketInfo = SYNTHETIC_MARKETS.find((m) => m.symbol === selectedMarket) || SYNTHETIC_MARKETS[0];


  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'authorized':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Deriv Live</span>
          </div>
        );
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-400/30 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Live Feed</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/25 text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
            <span>Connecting...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono font-medium">
            <WifiOff className="w-3 h-3" />
            <span>Disconnected</span>
          </div>
        );
    }
  };

  return (
    <header
      className={`border-b sticky top-0 z-40 px-3 sm:px-6 py-2.5 backdrop-blur-md transition-colors select-none ${
        isBright
          ? 'bg-[#faf8f5]/95 border-amber-200/80 text-slate-900 shadow-sm'
          : 'bg-[#050811]/95 border-amber-500/20 text-slate-100 shadow-lg'
      }`}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 items-center gap-2.5">
        {/* Left Column: Market Selector & Connection Status */}
        <div className="flex items-center gap-2.5 justify-start order-2 md:order-1">
          {/* Market Selector */}
          <div className="relative group">
            <label htmlFor="market-selector" className="sr-only">Select Synthetic Market</label>
            <div
              className={`flex items-center gap-1.5 border rounded-xl px-2.5 py-1.5 transition-colors ${
                isBright
                  ? 'bg-white border-amber-200 hover:border-amber-400 shadow-sm'
                  : 'bg-[#090d19] border-amber-500/30 hover:border-amber-400/60'
              }`}
            >
              <span className={`text-[11px] font-medium hidden sm:inline ${isBright ? 'text-slate-500' : 'text-amber-200/60'}`}>
                Market:
              </span>
              <select
                id="market-selector"
                value={selectedMarket}
                onChange={(e) => onSelectMarket(e.target.value)}
                className={`bg-transparent font-mono text-xs font-bold focus:outline-none cursor-pointer pr-4 appearance-none ${
                  isBright ? 'text-slate-900' : 'text-amber-300'
                }`}
              >
                <optgroup label="1-Second Synthetic Indices">
                  {SYNTHETIC_MARKETS.filter((m) => m.category === '1s').map((market) => (
                    <option key={market.symbol} value={market.symbol} className="bg-slate-950 text-white">
                      {market.displayName}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Standard Synthetic Indices">
                  {SYNTHETIC_MARKETS.filter((m) => m.category === 'standard').map((market) => (
                    <option key={market.symbol} value={market.symbol} className="bg-slate-950 text-white">
                      {market.displayName}
                    </option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400/70 pointer-events-none -ml-4" />
            </div>
          </div>

          {/* Connection Status Badge */}
          <div>
            {getStatusBadge()}
          </div>

          {/* Live Quote Display on Desktop */}
          {currentTickQuote !== undefined && (
            <div
              className={`hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-xl border font-mono text-xs ${
                isBright ? 'bg-white border-amber-200' : 'bg-[#090d19]/80 border-amber-500/25'
              }`}
            >
              <span className={isBright ? 'text-slate-500' : 'text-slate-400'}>Q:</span>
              <span className={`font-bold ${isBright ? 'text-slate-900' : 'text-white'}`}>
                {currentTickQuote.toFixed(currentMarketInfo.pipSize)}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                {currentTickDigit ?? 0}
              </span>
            </div>
          )}
        </div>

        {/* Center Column: App Name Centrally Positioned and Well Stated Professionally */}
        <div className="flex items-center justify-center order-1 md:order-2">
          <div
            className="flex items-center gap-3 group text-center"
            title="RAMPAGE DIGIT ANALYZER"
          >
            <BullLogo size={36} className="w-9 h-9 shrink-0" glow={true} borderStyle="gold" />
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-black text-sm sm:text-base tracking-widest uppercase font-mono ${
                    isBright
                      ? 'text-slate-950'
                      : 'bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent'
                  }`}
                >
                  RAMPAGE
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-400/40">
                  DIGIT ANALYZER
                </span>
              </div>
              <p className={`text-[10px] font-mono tracking-wider uppercase ${isBright ? 'text-slate-500' : 'text-amber-200/60'}`}>
                Deriv Quantitative Synthetics Terminal
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Account and Settings */}
        <div className="flex items-center justify-end gap-2 order-3">
          {/* 1-Tap Log in with Deriv when unauthenticated */}
          {!account ? (
            <a
              href="/oauth/deriv/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono text-xs font-bold transition-all shadow-md shadow-amber-500/20 active:scale-95"
              title="Authenticate directly with official Deriv OAuth"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Log in with Deriv</span>
            </a>
          ) : (
            <>
              {/* Account Mode Switcher (Demo / Real) */}
              <div
                className={`flex items-center p-0.5 rounded-xl border ${
                  isBright ? 'bg-slate-100 border-amber-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onToggleAccountMode('demo')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                    accountMode === 'demo'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Demo
                </button>
                <button
                  type="button"
                  onClick={() => onToggleAccountMode('real')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                    accountMode === 'real'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {account.realTradingAuthorized && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  Real
                </button>
              </div>

              {/* Real Balance Display (Only when logged in) */}
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
                  isBright ? 'bg-white border-amber-200' : 'bg-[#090d19] border-amber-500/25'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 text-amber-400 hidden sm:inline" />
                <div className="text-right font-mono">
                  <div className="text-[9px] text-slate-400 leading-none">
                    {account.loginid}
                  </div>
                  <div className={`text-xs font-bold leading-tight ${isBright ? 'text-slate-900' : 'text-amber-200'}`}>
                    {account.currency} {account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Account Settings Trigger */}
          <button
            type="button"
            onClick={onOpenAuthModal}
            aria-label="Account Settings"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
              isBright
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-amber-200'
                : 'bg-[#090d19] hover:bg-slate-800 text-slate-200 border-amber-500/25'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
