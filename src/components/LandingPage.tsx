import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Flame,
  Key,
  Layers,
  Lock,
  LogIn,
  Moon,
  Play,
  Shield,
  ShieldCheck,
  Sun,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { UserAccount, SYNTHETIC_MARKETS } from '../types/deriv';
import { BullLogo } from './BullLogo';

interface LandingPageProps {
  onLaunchTerminal: () => void;
  onOpenAuthModal: () => void;
  affiliateUrl: string;
  userAccount: UserAccount | null;
  theme?: 'dark' | 'bright';
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLaunchTerminal,
  onOpenAuthModal,
  affiliateUrl,
  userAccount,
  theme = 'dark',
  onToggleTheme,
}) => {
  const isBright = theme === 'bright';


  // 8 Core Mathematical Strategies (Classy Institutional Descriptions)
  const strategies = [
    { id: 'matches', name: 'Matches', type: 'MATCHES', rule: 'Cursor strikes Green Digit when top diff <= 0.3%. Strike predicting 2nd-most appearing digit (Blue).', tag: 'Leader Strike' },
    { id: 'over5', name: 'Over 5', type: 'DIGITOVER (5)', rule: 'Digits 6-9 all >=10%, green bar >5, triggers on 4 consecutive taps on 0-4. Next tick execution.', tag: 'Momentum Run' },
    { id: 'under5', name: 'Under 5', type: 'DIGITUNDER (5)', rule: 'Digits 0-4 all >=10%, green bar <5, triggers on 4 consecutive taps on 6-9. Digit 5 resets sequence.', tag: 'Mean Reversion' },
    { id: 'dualBarOver3', name: 'Dual Bar – Over 3', type: 'DIGITOVER (3)', rule: 'Both Green & Red bars on odd digits >3 (5,7,9), cursor strikes digit 1.', tag: 'Odd Parity' },
    { id: 'tripleTapOver3', name: 'Triple Tap – Over 3', type: 'DIGITOVER (3)', rule: 'Green bar in 4-9, triggers after 3 consecutive hits on 0-3.', tag: 'Barrier Strike' },
    { id: 'under6', name: 'Under 6', type: 'DIGITUNDER (6)', rule: 'Green bar on 0-5, instant strike trigger when cursor hits digit 8.', tag: 'Barrier 6' },
    { id: 'under7', name: 'Under 7', type: 'DIGITUNDER (7)', rule: 'Green bar on 0-6, instant strike trigger when cursor hits digit 9.', tag: 'Barrier 7' },
    { id: 'digitSwitch', name: 'Frequency Switch', type: 'DYNAMIC', rule: 'Scans live 0-9 distribution arrays and routes to the highest-probability quantitative candidate.', tag: 'Adaptive Engine' },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 select-none ${
        isBright ? 'bg-[#faf8f5] text-slate-900' : 'bg-[#05070c] text-slate-100'
      }`}
    >
      {/* Top Navbar */}
      <header
        className={`sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-3 border-b backdrop-blur-md transition-colors ${
          isBright
            ? 'bg-[#faf8f5]/95 border-amber-200 shadow-sm'
            : 'bg-[#080c16]/95 border-amber-500/20 shadow-lg'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo & Brand Name */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <BullLogo size={36} className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" glow={true} borderStyle="gold" />
            <div>
              <div className="flex flex-wrap items-center gap-x-1.5 font-mono font-black text-[11px] sm:text-sm tracking-wide sm:tracking-wider leading-tight">
                <span className={isBright ? 'text-slate-950' : 'bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent'}>
                  RAMPAGE
                </span>
                <span className="text-amber-400 font-bold">DIGIT ANALYZER</span>
              </div>
              <p className={`hidden sm:block text-[10px] font-mono ${isBright ? 'text-slate-500' : 'text-amber-200/60'}`}>
                Deriv Synthetic Indices Intelligence
              </p>
            </div>
          </div>

          {/* Navigation Anchors */}
          <nav
            className={`hidden md:flex items-center gap-6 text-xs font-mono font-semibold ${
              isBright ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            <a href="#quick-start" className="hover:text-amber-400 transition-colors">
              Quick Setup
            </a>
            <a href="#strategies" className="hover:text-amber-400 transition-colors">
              8 Core Strategies
            </a>
            <a href="#markets" className="hover:text-amber-400 transition-colors">
              11 Synthetic Markets
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                type="button"
                onClick={onToggleTheme}
                className={`p-1.5 sm:p-2 rounded-xl border transition-all ${
                  isBright
                    ? 'bg-white hover:bg-slate-100 border-amber-200 text-slate-700'
                    : 'bg-[#090d19] hover:bg-slate-800 border-amber-500/25 text-amber-300'
                }`}
                title={isBright ? 'Switch to Dark Mode' : 'Switch to Bright Mode'}
              >
                {isBright ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
            )}

            {/* Log in with Deriv Button */}
            <button
              type="button"
              onClick={() => onOpenAuthModal()}
              className="flex items-center gap-1.5 px-2 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-amber-500/20 active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log in with Deriv</span>
              <span className="sm:hidden">Log In</span>
            </button>

            {/* Launch Terminal Button */}
            <button
              type="button"
              onClick={onLaunchTerminal}
              className={`flex items-center gap-1.5 px-2 sm:px-3.5 py-2 rounded-xl font-mono text-xs font-bold transition-all border ${
                isBright
                  ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-900'
                  : 'bg-[#090d19] hover:bg-slate-800 text-white border-amber-500/30'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
              <span className="hidden xs:inline">Terminal</span>
            </button>
          </div>
        </div>

        {/* Compact mobile navigation */}
        <nav
          aria-label="Mobile navigation"
          className={`md:hidden max-w-7xl mx-auto flex items-center justify-between gap-2 pt-3 mt-3 border-t text-[10px] sm:text-xs font-mono font-semibold ${
            isBright
              ? 'border-amber-200 text-slate-600'
              : 'border-amber-500/20 text-slate-400'
          }`}
        >
          <a href="#quick-start" className="py-1 hover:text-amber-400 transition-colors">
            Quick Setup
          </a>
          <a href="#strategies" className="py-1 hover:text-amber-400 transition-colors">
            Strategies
          </a>
          <a href="#markets" className="py-1 hover:text-amber-400 transition-colors">
            Markets
          </a>
        </nav>
      </header>

      {/* HERO SECTION: OPULENT OBSIDIAN & LIQUID GOLD */}
      <section
        className={`relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b ${
          isBright
            ? 'bg-gradient-to-b from-amber-50/50 via-[#faf8f5] to-amber-50/30 border-amber-200'
            : 'bg-gradient-to-b from-[#090d19] via-[#05070c] to-[#090d19] border-amber-500/20'
        }`}
      >
        {/* Ambient Gold Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_30%,rgba(245,158,11,0.14),rgba(0,0,0,0))] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          {/* Official Wall Street Gold Bull Medallion in Hero */}
          <div className="flex justify-center mb-2">
            <div className="relative">
              <div className="absolute -inset-3 bg-amber-500/25 blur-2xl rounded-full animate-pulse" />
              <div className="relative p-1.5 rounded-full bg-gradient-to-b from-amber-400 via-amber-700 to-yellow-500 shadow-[0_0_35px_rgba(245,158,11,0.35)]">
                <BullLogo size={96} className="w-24 h-24 sm:w-28 sm:h-28" glow={false} borderStyle="none" />
              </div>
            </div>
          </div>

          {/* Tagline */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-400/30 text-amber-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>REAL-TIME DERIV DIRECT WEBSOCKET · 1-TICK EXECUTION</span>
          </div>

          {/* Heading */}
          <h1
            className={`text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight ${
              isBright ? 'text-slate-950' : 'text-white'
            }`}
          >
            Quantitative Digit Intelligence for{' '}
            <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Deriv Synthetics
            </span>
          </h1>

          {/* Direct Value Proposition */}
          <p
            className={`text-sm sm:text-base max-w-2xl mx-auto leading-relaxed ${
              isBright ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            Monitor live tick streams, calculate real-time 0–9 probability distributions, and execute
            pre-calibrated mathematical entry models with client-side risk protection.
          </p>

          {/* DUAL ACTION CTAS */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-lg mx-auto">
            {/* Primary Action 1: Create Deriv Account */}
            <a
              href={affiliateUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono font-black uppercase text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span>Create Deriv Account</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Primary Action 2: Log in with Deriv */}
            <button
              type="button"
              onClick={() => onOpenAuthModal()}
              className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-xl bg-[#090d19] hover:bg-slate-800 text-white font-mono font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 border border-amber-500/30 shadow-md transition-all transform hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>Log in with Deriv</span>
            </button>
          </div>

          {/* Secondary Action: Terminal Launch */}
          <div className="pt-1">
            <button
              type="button"
              onClick={onLaunchTerminal}
              className={`text-xs font-mono font-medium transition-colors flex items-center gap-1.5 mx-auto hover:underline ${
                isBright ? 'text-slate-600 hover:text-slate-950' : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              <span>Open live market terminal immediately &rarr;</span>
            </button>
          </div>

          {/* Trust Highlights */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-3 gap-3 pt-6 max-w-2xl mx-auto text-xs font-mono ${
              isBright ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            <div
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${
                isBright ? 'bg-white border-amber-200' : 'bg-[#090d19]/80 border-amber-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Official Deriv Partner Integration</span>
            </div>
            <div
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${
                isBright ? 'bg-white border-amber-200' : 'bg-[#090d19]/80 border-amber-500/20'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span>100% Client-Side Direct WebSocket</span>
            </div>
            <div
              className={`p-3 rounded-xl border flex items-center justify-center gap-2 ${
                isBright ? 'bg-white border-amber-200' : 'bg-[#090d19]/80 border-amber-500/20'
              }`}
            >
              <Wallet className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Zero Custody of Funds</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3-STEP QUICK START */}
      <section
        id="quick-start"
        className={`py-12 px-4 sm:px-6 lg:px-8 border-b ${
          isBright ? 'bg-amber-50/30 border-amber-200' : 'bg-[#05070c] border-amber-500/20'
        }`}
      >
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
              Execution Architecture
            </span>
            <h2 className={`text-2xl font-black ${isBright ? 'text-slate-950' : 'text-white'}`}>
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${
                isBright ? 'bg-white border-amber-200 shadow-sm' : 'bg-[#090d19]/80 border-amber-500/20'
              }`}
            >
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-amber-400">01 / REGISTRATION</span>
                <h3 className={`text-sm font-bold font-mono ${isBright ? 'text-slate-950' : 'text-white'}`}>
                  Create Deriv Account
                </h3>
                <p className={`text-xs leading-relaxed ${isBright ? 'text-slate-600' : 'text-slate-400'}`}>
                  Register via our official partner portal to unlock genuine tick streams across all 11 Volatility indices.
                </p>
              </div>
              <a
                href={affiliateUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-amber-500/20 active:scale-95"
              >
                <span>Create Account</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Step 2 */}
            <div
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${
                isBright ? 'bg-white border-amber-200 shadow-sm' : 'bg-[#090d19]/80 border-amber-500/20'
              }`}
            >
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-amber-400">02 / AUTHENTICATION</span>
                <h3 className={`text-sm font-bold font-mono ${isBright ? 'text-slate-950' : 'text-white'}`}>
                  Connect via OAuth or Token
                </h3>
                <p className={`text-xs leading-relaxed ${isBright ? 'text-slate-600' : 'text-slate-400'}`}>
                  Use official 1-tap Deriv OAuth 2.0 login or paste your secure personal API token directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenAuthModal()}
                className="w-full py-2 px-3 rounded-xl bg-[#0b1020] hover:bg-slate-800 text-white border border-amber-500/30 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Account</span>
              </button>
            </div>

            {/* Step 3 */}
            <div
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-3 ${
                isBright ? 'bg-white border-amber-200 shadow-sm' : 'bg-[#090d19]/80 border-amber-500/20'
              }`}
            >
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-amber-400">03 / DEPLOYMENT</span>
                <h3 className={`text-sm font-bold font-mono ${isBright ? 'text-slate-950' : 'text-white'}`}>
                  Deploy Strategies & Risk Rules
                </h3>
                <p className={`text-xs leading-relaxed ${isBright ? 'text-slate-600' : 'text-slate-400'}`}>
                  Configure custom cycle limits, toggle Martingale on/off, set Take Profit / Stop Loss, and deploy.
                </p>
              </div>
              <button
                type="button"
                onClick={onLaunchTerminal}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-amber-500/20 active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Terminal</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 8 CORE STRATEGIES GRID */}
      <section
        id="strategies"
        className={`py-12 px-4 sm:px-6 lg:px-8 border-b ${
          isBright ? 'bg-white border-amber-200' : 'bg-[#080c16] border-amber-500/20'
        }`}
      >
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                Quantitative Engine
              </span>
              <h2 className={`text-2xl font-black ${isBright ? 'text-slate-950' : 'text-white'}`}>
                8 Core Mathematical Strategies
              </h2>
            </div>
            <button
              type="button"
              onClick={onLaunchTerminal}
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 hover:underline"
            >
              <span>Test In Terminal &rarr;</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {strategies.map((strat) => (
              <div
                key={strat.id}
                className={`p-4 rounded-xl border transition-all ${
                  isBright
                    ? 'bg-slate-50 border-amber-200 hover:border-amber-400 shadow-sm'
                    : 'bg-[#090d19] border-amber-500/20 hover:border-amber-400/50'
                }`}
              >
                <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
                  <span className={`text-xs font-mono font-bold uppercase ${isBright ? 'text-slate-950' : 'text-amber-200'}`}>
                    {strat.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-bold border border-amber-400/30">
                    {strat.type}
                  </span>
                </div>
                <p className={`text-[11px] font-mono mt-2 leading-relaxed ${isBright ? 'text-slate-600' : 'text-slate-400'}`}>
                  {strat.rule}
                </p>
                <div className="mt-3 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">1-Tick Settle</span>
                  <span className="text-amber-400 font-bold">{strat.tag}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11 SYNTHETIC MARKETS CHIPS */}
      <section
        id="markets"
        className={`py-10 px-4 sm:px-6 lg:px-8 border-b ${
          isBright ? 'bg-amber-50/20 border-amber-200' : 'bg-[#05070c] border-amber-500/20'
        }`}
      >
        <div className="max-w-5xl mx-auto space-y-4 text-center">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
            24/7/365 Continuous Feed
          </span>
          <h2 className={`text-xl font-black ${isBright ? 'text-slate-950' : 'text-white'}`}>
            Supported Deriv Synthetic Indices
          </h2>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {SYNTHETIC_MARKETS.map((m) => (
              <button
                key={m.symbol}
                type="button"
                onClick={onLaunchTerminal}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all ${
                  isBright
                    ? 'bg-white border-amber-200 text-slate-800 hover:border-amber-400'
                    : 'bg-[#090d19] border-amber-500/25 text-amber-200 hover:border-amber-400/60'
                }`}
              >
                <span>{m.displayName}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className={`py-6 px-4 sm:px-6 lg:px-8 border-t text-xs font-mono transition-colors ${
          isBright ? 'bg-slate-100 border-amber-200 text-slate-500' : 'bg-[#04060a] border-amber-500/20 text-slate-500'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div
            className="flex items-center gap-2 select-none"
            title="RAMPAGE DIGIT ANALYZER"
          >
            <BullLogo size={20} className="w-5 h-5" glow={false} borderStyle="subtle" />
            <span className={`font-bold ${isBright ? 'text-slate-800' : 'text-amber-200'}`}>
              RAMPAGE DIGIT ANALYZER
            </span>{' '}
            &copy; 2026. All rights reserved.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a href={affiliateUrl} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
              Deriv Partner
            </a>
            <button type="button" onClick={() => onOpenAuthModal()} className="hover:underline">
              Log In
            </button>
            <button type="button" onClick={onLaunchTerminal} className="hover:underline">
              Terminal
            </button>
          </div>
        </div>
      </footer>


    </div>
  );
};
