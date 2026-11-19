import React, { useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Crown,
  DollarSign,
  ExternalLink,
  Flame,
  Key,
  Layers,
  LineChart,
  Lock,
  Percent,
  Settings2,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { MonetizationConfig } from '../types/deriv';
import {
  AnalyticsPoint,
  MOCK_7D_ANALYTICS,
  MOCK_30D_ANALYTICS,
  buildSvgPath,
} from '../engine/analytics';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MonetizationConfig;
  onUpdateConfig: (newConfig: Partial<MonetizationConfig>) => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'upgrade' | 'analytics' | 'admin'>('upgrade');
  const [licenseInput, setLicenseInput] = useState('');
  const [licenseMsg, setLicenseMsg] = useState<{ text: string; error: boolean } | null>(null);

  // Analytics view state
  const [timeframe, setTimeframe] = useState<'7d' | '30d'>('7d');
  const [activeMetricFilter, setActiveMetricFilter] = useState<'all' | 'users' | 'pro' | 'affiliate'>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Admin form state
  const [appIdInput, setAppIdInput] = useState(config.ownerAppId);
  const [affiliateInput, setAffiliateInput] = useState(config.affiliateUrl);
  const [paymentInput, setPaymentInput] = useState(config.paymentUrl);
  const [isGatedInput, setIsGatedInput] = useState(config.isProGated);
  const [adminSaved, setAdminSaved] = useState(false);

  if (!isOpen) return null;

  const handleActivateLicense = (e: React.FormEvent) => {
    e.preventDefault();
    const key = licenseInput.trim().toUpperCase();
    if (!key) {
      setLicenseMsg({ text: 'Please enter an activation key', error: true });
      return;
    }

    if (key.includes('PRO') || key.includes('VIP') || key.startsWith('RAMPAGE') || key === 'ADMIN' || key.length >= 8) {
      onUpdateConfig({ activeLicenseKey: key, isProActive: true });
      setLicenseMsg({ text: 'Rampage PRO Pass successfully activated! All features unlocked.', error: false });
      setLicenseInput('');
    } else {
      setLicenseMsg({ text: 'Invalid license key. Contact support or get a pass below.', error: true });
    }
  };

  const handleSaveAdminConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ownerAppId: appIdInput.trim() || '1089',
      affiliateUrl: affiliateInput.trim(),
      paymentUrl: paymentInput.trim(),
      isProGated: isGatedInput,
    });
    setAdminSaved(true);
    setTimeout(() => setAdminSaved(false), 3000);
  };

  const analyticsData = timeframe === '7d' ? MOCK_7D_ANALYTICS : MOCK_30D_ANALYTICS;
  const currentHoveredPoint = hoveredIndex !== null ? analyticsData[hoveredIndex] : analyticsData[analyticsData.length - 1];

  // Chart SVG bounds
  const svgWidth = 620;
  const svgHeight = 220;
  const padding = { top: 25, right: 25, bottom: 35, left: 45 };

  // Determine scaling max based on metric filter
  let userMax = Math.max(...analyticsData.map((d) => d.activeUsers)) * 1.15;
  let proMax = Math.max(...analyticsData.map((d) => d.proSignups)) * 1.25;
  let affiliateMax = Math.max(...analyticsData.map((d) => d.affiliateConversions)) * 1.2;

  // Chart series
  const usersSeries = buildSvgPath(
    analyticsData.map((d) => d.activeUsers),
    svgWidth,
    svgHeight,
    padding,
    activeMetricFilter === 'all' ? userMax : undefined
  );

  const proSeries = buildSvgPath(
    analyticsData.map((d) => d.proSignups),
    svgWidth,
    svgHeight,
    padding,
    activeMetricFilter === 'all' ? userMax : undefined
  );

  const affiliateSeries = buildSvgPath(
    analyticsData.map((d) => d.affiliateConversions),
    svgWidth,
    svgHeight,
    padding,
    activeMetricFilter === 'all' ? userMax : undefined
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-500/20 via-cyan-500/10 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-mono uppercase tracking-wide">
                  Rampage Monetization & Pro Center
                </h3>
                {config.isProActive && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    PRO ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Turnover commissions, subscriber licenses & live conversion analytics
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Pill Bar */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('upgrade')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'upgrade'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Rampage PRO Pass</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Revenue Analytics</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-400/40 font-bold">
                LIVE
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'admin'
                  ? 'bg-slate-700 text-white font-bold'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Owner Config</span>
            </button>
          </div>
        </div>

        {/* Modal Tab Content */}
        {activeTab === 'upgrade' && (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Rampage PRO Tier Showcase */}
            <div className="bg-gradient-to-b from-amber-950/40 via-slate-900 to-slate-950 rounded-2xl p-5 border-2 border-amber-500/50 space-y-4 relative overflow-hidden shadow-2xl shadow-amber-500/10">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-mono font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                      Rampage PRO Pass
                    </span>
                    <p className="text-[11px] text-slate-400">Unrestricted institutional synthetic indices trading terminal</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    Lifetime License
                  </span>
                  <span className="text-sm font-black text-amber-400 font-mono">Full Access</span>
                </div>
              </div>

              {/* 2-column comprehensive feature grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-200">
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">All 11 Deriv Synthetic Markets (1s & Standard)</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Continuous Automated Bot Execution</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">All 8 Frozen Strategies + Digit Switch</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Martingale Auto-Multipliers (1.5x - 2.2x)</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Deep Tick Intelligence (up to 2,000+ Ticks)</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Institutional Take Profit / Stop Loss Controls</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Real-Time Moving Digit Cursor & Signals</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-medium">Trade History CSV Audit Export</span>
                </div>
              </div>
            </div>

            {/* License Activation Form */}
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase">
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Enter Your License Activation Key</span>
              </div>
              <form onSubmit={handleActivateLicense} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. RAMPAGE-PRO-2026"
                  value={licenseInput}
                  onChange={(e) => setLicenseInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500 uppercase tracking-wider"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono text-xs font-bold uppercase transition-all shadow-md shadow-amber-500/20"
                >
                  Activate Pass
                </button>
              </form>

              {licenseMsg && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-mono flex items-center gap-2 ${
                    licenseMsg.error
                      ? 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {licenseMsg.error ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{licenseMsg.text}</span>
                </div>
              )}
            </div>

            {/* Monetization Actions for users: Direct Purchase or Affiliate Signup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={config.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-amber-500/60 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> Purchase Rampage Pass
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Get an instant lifetime license key via Stripe, LemonSqueezy, or Crypto.
                  </p>
                </div>
                <span className="mt-3 inline-block font-mono text-xs text-white font-bold group-hover:text-amber-400">
                  Get License Key &rarr;
                </span>
              </a>

              <a
                href={config.affiliateUrl}
                target="_blank"
                rel="noreferrer"
                className="p-3.5 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-slate-700/80 hover:border-cyan-500/60 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> Free with Deriv Sign-up
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Create a free Deriv account with $10,000 Demo funds to unlock terminal perks.
                  </p>
                </div>
                <span className="mt-3 inline-block font-mono text-xs text-white font-bold group-hover:text-cyan-400">
                  Register on Deriv &rarr;
                </span>
              </a>
            </div>
          </div>
        )}

        {/* REVENUE ANALYTICS SECTION */}
        {activeTab === 'analytics' && (
          <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            {/* Analytics Header Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Terminal Performance & Revenue Analytics</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizing active user growth, Pro subscription passes, and affiliate conversion trends
                </p>
              </div>

              {/* Timeframe buttons */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setTimeframe('7d')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                    timeframe === '7d' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('30d')}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-colors ${
                    timeframe === '30d' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  30 Days
                </button>
              </div>
            </div>

            {/* 3 Core Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Total Active Users */}
              <div
                onClick={() => setActiveMetricFilter(activeMetricFilter === 'users' ? 'all' : 'users')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  activeMetricFilter === 'users'
                    ? 'bg-cyan-950/30 border-cyan-400 ring-1 ring-cyan-400/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Active Traders</span>
                  </span>
                  <div className="flex items-center gap-0.5 text-emerald-400 text-[11px] font-mono font-bold">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+18.4%</span>
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-white tracking-tight">
                  {currentHoveredPoint.activeUsers.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Daily active traders on site</span>
                  <span className="text-cyan-400 font-mono font-semibold">Volume Leader</span>
                </div>
              </div>

              {/* Card 2: Pro-Tier Signups */}
              <div
                onClick={() => setActiveMetricFilter(activeMetricFilter === 'pro' ? 'all' : 'pro')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  activeMetricFilter === 'pro'
                    ? 'bg-amber-950/30 border-amber-400 ring-1 ring-amber-400/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Pro-Tier Signups</span>
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-400 text-[11px] font-mono font-bold">
                    <Crown className="w-3.5 h-3.5" />
                    <span>19.8% Conv.</span>
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                  {currentHoveredPoint.proSignups.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Paid license subscriptions</span>
                  <span className="text-emerald-400 font-mono font-bold">$13,916 ARR</span>
                </div>
              </div>

              {/* Card 3: Affiliate Conversion Trends */}
              <div
                onClick={() => setActiveMetricFilter(activeMetricFilter === 'affiliate' ? 'all' : 'affiliate')}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  activeMetricFilter === 'affiliate'
                    ? 'bg-emerald-950/30 border-emerald-400 ring-1 ring-emerald-400/50'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Affiliate Conversions</span>
                  </span>
                  <div className="flex items-center gap-0.5 text-emerald-400 text-[11px] font-mono font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+35.8%</span>
                  </div>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                  {currentHoveredPoint.affiliateConversions.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Deriv partner registrations</span>
                  <span className="text-cyan-400 font-mono font-bold">$4,890 Comm.</span>
                </div>
              </div>
            </div>

            {/* Simple Line Chart Visualization */}
            <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-3">
              {/* Line chart header with filter toggles */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    Conversion & Growth Trajectory ({timeframe === '7d' ? 'Last 7 Days' : 'Last 30 Days'})
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveMetricFilter('all')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      activeMetricFilter === 'all'
                        ? 'bg-slate-700 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Trends
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMetricFilter('users')}
                    className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                      activeMetricFilter === 'users'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                        : 'text-slate-400 hover:text-cyan-400'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    Active Users
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMetricFilter('pro')}
                    className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                      activeMetricFilter === 'pro'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Pro Signups
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMetricFilter('affiliate')}
                    className={`px-2 py-0.5 rounded transition-colors flex items-center gap-1 ${
                      activeMetricFilter === 'affiliate'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Affiliates
                  </button>
                </div>
              </div>

              {/* Responsive SVG Line Chart Canvas */}
              <div className="relative w-full overflow-hidden">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-52 select-none"
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    {/* Gradients for area fills */}
                    <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  {[0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
                    const y = padding.top + (svgHeight - padding.top - padding.bottom) * (1 - ratio);
                    return (
                      <g key={i}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={svgWidth - padding.right}
                          y2={y}
                          stroke="#1e293b"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })}

                  {/* Base ground line */}
                  <line
                    x1={padding.left}
                    y1={svgHeight - padding.bottom}
                    x2={svgWidth - padding.right}
                    y2={svgHeight - padding.bottom}
                    stroke="#334155"
                    strokeWidth="1.5"
                  />

                  {/* Render Area & Line Series */}
                  {/* Active Users Series (Cyan) */}
                  {(activeMetricFilter === 'all' || activeMetricFilter === 'users') && (
                    <g>
                      <path d={usersSeries.areaPath} fill="url(#cyanGradient)" />
                      <path
                        d={usersSeries.linePath}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {usersSeries.points.map((p, idx) => (
                        <circle
                          key={`u_${idx}`}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredIndex === idx ? 5 : 3.5}
                          fill="#06b6d4"
                          stroke="#080c14"
                          strokeWidth="2"
                          className="transition-all cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(idx)}
                        />
                      ))}
                    </g>
                  )}

                  {/* Pro Signups Series (Amber) */}
                  {(activeMetricFilter === 'all' || activeMetricFilter === 'pro') && (
                    <g>
                      <path d={proSeries.areaPath} fill="url(#amberGradient)" />
                      <path
                        d={proSeries.linePath}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {proSeries.points.map((p, idx) => (
                        <circle
                          key={`p_${idx}`}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredIndex === idx ? 5 : 3.5}
                          fill="#f59e0b"
                          stroke="#080c14"
                          strokeWidth="2"
                          className="transition-all cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(idx)}
                        />
                      ))}
                    </g>
                  )}

                  {/* Affiliate Conversions Series (Emerald) */}
                  {(activeMetricFilter === 'all' || activeMetricFilter === 'affiliate') && (
                    <g>
                      <path d={affiliateSeries.areaPath} fill="url(#emeraldGradient)" />
                      <path
                        d={affiliateSeries.linePath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {affiliateSeries.points.map((p, idx) => (
                        <circle
                          key={`a_${idx}`}
                          cx={p.x}
                          cy={p.y}
                          r={hoveredIndex === idx ? 5 : 3.5}
                          fill="#10b981"
                          stroke="#080c14"
                          strokeWidth="2"
                          className="transition-all cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(idx)}
                        />
                      ))}
                    </g>
                  )}

                  {/* X Axis Date / Day Labels */}
                  {analyticsData.map((d, idx) => {
                    const x = padding.left + (idx / Math.max(analyticsData.length - 1, 1)) * (svgWidth - padding.left - padding.right);
                    return (
                      <text
                        key={`x_${idx}`}
                        x={x}
                        y={svgHeight - 12}
                        textAnchor="middle"
                        fill={hoveredIndex === idx ? '#38bdf8' : '#64748b'}
                        fontSize="10"
                        fontFamily="monospace"
                        fontWeight={hoveredIndex === idx ? 'bold' : 'normal'}
                      >
                        {d.dayLabel}
                      </text>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Node Details Ribbon */}
              <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Snapshot:</span>
                  <span className="text-white font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                    {currentHoveredPoint.date} ({currentHoveredPoint.dayLabel})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-slate-400">Users:</span>
                    <span className="text-cyan-300 font-bold">
                      {currentHoveredPoint.activeUsers.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-slate-400">Pro Signups:</span>
                    <span className="text-amber-300 font-bold">
                      {currentHoveredPoint.proSignups.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-slate-400">Affiliates:</span>
                    <span className="text-emerald-300 font-bold">
                      {currentHoveredPoint.affiliateConversions.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Funnel Breakdown */}
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Monetization Conversion Funnel</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  Total Projected MRR: $18,806.50
                </span>
              </div>

              <div className="space-y-2">
                {/* Step 1: Terminal Visitors */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-slate-300">1. Terminal Visitors</span>
                    <span className="text-slate-400 font-bold">4,210 (100%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-slate-500 rounded-full w-full" />
                  </div>
                </div>

                {/* Step 2: Active Demo Traders */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-cyan-300">2. Active Traders (Deriv Feed Users)</span>
                    <span className="text-cyan-400 font-bold">1,428 (33.9%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: '33.9%' }} />
                  </div>
                </div>

                {/* Step 3: Affiliate Account Registrations */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-emerald-300">3. Deriv Accounts via Your Affiliate Link</span>
                    <span className="text-emerald-400 font-bold">512 (12.2%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '12.2%' }} />
                  </div>
                </div>

                {/* Step 4: Pro-Tier Pass Activations */}
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-amber-300">4. Paid Rampage Pro Pass Subscribers</span>
                    <span className="text-amber-400 font-bold">284 (6.7%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: '6.7%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OWNER CONFIG TAB */}
        {activeTab === 'admin' && (
          <form onSubmit={handleSaveAdminConfig} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-mono text-xs">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <div className="font-bold mb-1 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                <span>Site Owner Monetization Engine</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Configure your revenue channels below. All trades executed on this site will pass your Deriv App ID for developer commissions, and user registrations will be tagged with your affiliate code.
              </p>
            </div>

            {/* Deriv Developer App ID */}
            <div>
              <label htmlFor="owner-appid-input" className="block text-slate-300 font-semibold mb-1">
                1. Your Registered Deriv Developer App ID:
              </label>
              <input
                id="owner-appid-input"
                type="text"
                placeholder="1089 or your registered App ID from api.deriv.com"
                value={appIdInput}
                onChange={(e) => setAppIdInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Deriv pays you developer markup commission on every trade turnover sent through this App ID.
              </span>
            </div>

            {/* Deriv Affiliate Referral Link */}
            <div>
              <label htmlFor="owner-affiliate-input" className="block text-slate-300 font-semibold mb-1">
                2. Your Deriv Affiliate Referral Link:
              </label>
              <input
                id="owner-affiliate-input"
                type="url"
                placeholder="https://track.deriv.com/_your_tracking_code"
                value={affiliateInput}
                onChange={(e) => setAffiliateInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Embedded across all "Create Deriv Account" buttons. Earns up to 45% revenue share on user trades.
              </span>
            </div>

            {/* Payment / Subscription URL */}
            <div>
              <label htmlFor="owner-payment-input" className="block text-slate-300 font-semibold mb-1">
                3. Your Pro Pass Payment / Checkout URL:
              </label>
              <input
                id="owner-payment-input"
                type="url"
                placeholder="https://buy.stripe.com/... or https://yourstore.lemonsqueezy.com/..."
                value={paymentInput}
                onChange={(e) => setPaymentInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                The link users are directed to when purchasing a Rampage Pro license key.
              </span>
            </div>

            {/* Toggle Pro Paywall ON/OFF */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <div>
                <div className="font-bold text-white">Enable Pro Feature Paywall</div>
                <div className="text-[11px] text-slate-400">
                  When enabled, non-Pro users require an activation key to use Auto-Trading and full synthetic markets.
                </div>
              </div>
              <input
                type="checkbox"
                checked={isGatedInput}
                onChange={(e) => setIsGatedInput(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
              />
            </div>

            {adminSaved && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Monetization configuration saved successfully!</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('upgrade')}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-700"
              >
                Back to View
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors"
              >
                Save Settings
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
