import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Copy,
  DollarSign,
  ExternalLink,
  Info,
  Layers,
  Percent,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  AffiliateHistoryPoint,
  buildSvgPath,
  calculateProjectedCommissions,
  computeAffiliateMetrics,
} from '../engine/analytics';

interface AffiliateCommissionsProps {
  affiliateUrl: string;
  onOpenOwnerConfig?: () => void;
}

type Timeframe = '7d' | '30d' | '90d';
type MetricType = 'earnings' | 'signups' | 'turnover';

export const AffiliateCommissions: React.FC<AffiliateCommissionsProps> = ({
  affiliateUrl,
  onOpenOwnerConfig,
}) => {
  // Collapsible state (saved in localStorage)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rampage_affiliate_expanded_v1');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [timeframe, setTimeframe] = useState<Timeframe>('7d');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('earnings');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);


  // Calculator projection states
  const [calcMonthlySignups, setCalcMonthlySignups] = useState<number>(60);
  const [calcDailyVolume, setCalcDailyVolume] = useState<number>(250);

  const toggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rampage_affiliate_expanded_v1', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(affiliateUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const rawData: AffiliateHistoryPoint[] = useMemo(() => [], []);

  // Overall summary metrics
  const metrics = useMemo(() => {
    return computeAffiliateMetrics(rawData, 0.35);
  }, [rawData]);

  // Chart data extraction based on selected metric
  const chartValues = useMemo(() => {
    switch (selectedMetric) {
      case 'earnings':
        return rawData.map((d) => d.estimatedEarnings);
      case 'signups':
        return rawData.map((d) => (timeframe === '7d' ? d.newSignups : d.signups));
      case 'turnover':
        return rawData.map((d) => d.turnoverVolume);
    }
  }, [rawData, selectedMetric, timeframe]);

  // SVG Chart Dimensions
  const svgWidth = 640;
  const svgHeight = 220;
  const chartPadding = { top: 20, right: 24, bottom: 36, left: 52 };

  const { linePath, areaPath, points } = useMemo(() => {
    return buildSvgPath(chartValues, svgWidth, svgHeight, chartPadding);
  }, [chartValues]);

  // Chart Color Scheme
  const chartTheme = useMemo(() => {
    switch (selectedMetric) {
      case 'earnings':
        return {
          stroke: '#f59e0b', // Amber 500
          glow: 'rgba(245, 158, 11, 0.5)',
          gradientFrom: 'rgba(245, 158, 11, 0.35)',
          gradientTo: 'rgba(245, 158, 11, 0.0)',
          badgeText: 'text-amber-400',
          badgeBg: 'bg-amber-500/15 border-amber-500/30',
          unitPrefix: '$',
          unitSuffix: '',
          title: 'Estimated Referral Earnings ($)',
        };
      case 'signups':
        return {
          stroke: '#10b981', // Emerald 500
          glow: 'rgba(16, 185, 129, 0.5)',
          gradientFrom: 'rgba(16, 185, 129, 0.35)',
          gradientTo: 'rgba(16, 185, 129, 0.0)',
          badgeText: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
          unitPrefix: '',
          unitSuffix: ' users',
          title: timeframe === '7d' ? 'New Daily Signups' : 'Cumulative User Signups',
        };
      case 'turnover':
        return {
          stroke: '#06b6d4', // Cyan 500
          glow: 'rgba(6, 182, 212, 0.5)',
          gradientFrom: 'rgba(6, 182, 212, 0.35)',
          gradientTo: 'rgba(6, 182, 212, 0.0)',
          badgeText: 'text-cyan-400',
          badgeBg: 'bg-cyan-500/15 border-cyan-500/30',
          unitPrefix: '$',
          unitSuffix: '',
          title: 'Client Traded Turnover Volume ($)',
        };
    }
  }, [selectedMetric, timeframe]);

  // Chart min/max/avg for summary row
  const chartStats = useMemo(() => {
    if (chartValues.length === 0) return { min: 0, max: 0, avg: 0, diffPercent: 0 };
    const min = Math.min(...chartValues);
    const max = Math.max(...chartValues);
    const avg = chartValues.reduce((s, v) => s + v, 0) / chartValues.length;
    const first = chartValues[0];
    const last = chartValues[chartValues.length - 1];
    const diffPercent = first > 0 ? ((last - first) / first) * 100 : 0;
    return { min, max, avg, diffPercent };
  }, [chartValues]);

  // Projected earnings calculator
  const projection = useMemo(() => {
    return calculateProjectedCommissions(calcMonthlySignups, calcDailyVolume, 0.35);
  }, [calcMonthlySignups, calcDailyVolume]);


  return (
    <section className="bg-[#0b111e] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-gradient-to-r from-[#0d1627] to-[#0a101d]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/30 border border-amber-500/40 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Coins className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white font-mono tracking-wide">
                AFFILIATE COMMISSIONS
              </h2>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>DERIV PARTNER ACTIVE</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Track user signups, client turnover, and estimated earnings from your affiliate link
            </p>
          </div>
        </div>

        {/* Action Controls & Collapse Toggle */}
        <div className="flex items-center gap-2">
          {/* Quick Copy Link Button */}
          <button
            type="button"
            onClick={handleCopyLink}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
              copiedLink
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-900 text-slate-300 border-slate-700/80 hover:border-amber-500/50 hover:text-white'
            }`}
            title="Copy your active Deriv affiliate link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
            <span>{copiedLink ? 'Copied Link!' : 'Copy Referral Link'}</span>
          </button>

          {/* Test Open Link */}
          <a
            href={affiliateUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-xl bg-slate-900 text-slate-300 border border-slate-700/80 hover:text-white hover:border-slate-600 transition-colors"
            title="Open affiliate sign-up URL in new tab"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
          </a>

          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={toggleExpand}
            className="p-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 transition-colors"
            title={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* EXPANDED CONTENT AREA */}
      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-6">
          {/* ACTIVE AFFILIATE LINK BAR */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 overflow-hidden w-full md:w-auto">
              <span className="text-slate-400 shrink-0 font-bold uppercase text-[10px] tracking-wider bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                Active Partner URL:
              </span>
              <span className="text-amber-300 font-medium truncate select-all">{affiliateUrl}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto text-[11px]">
              <span className="text-slate-400">Commission Model:</span>
              <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
                0.35% Turnover (Tier 2)
              </span>
            </div>
          </div>

          {/* 4 SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Card 1: Total User Signups */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-emerald-500/40 transition-all space-y-2 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-slate-400">Total User Signups</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                  {rawData.length ? metrics.totalSignups.toLocaleString() : 'Awaiting data'}
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  +{metrics.signupsToday} today
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span>Week additions:</span>
                <span className="text-slate-200 font-bold">+{metrics.signupsThisWeek} signups</span>
              </div>
            </div>

            {/* Card 2: Estimated Earnings ($) */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/40 transition-all space-y-2 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-slate-400">Estimated Earnings</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shadow-amber-500/10">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                  {rawData.length ? "$" + metrics.totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "Awaiting data"}
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-500/30">
                  {rawData.length ? "+" + ((metrics.earningsThisWeek / (metrics.totalEarnings || 1)) * 100).toFixed(1) + "% wk" : "Awaiting data"}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span>Recent 7-Day Net:</span>
                <span className="text-emerald-400 font-bold">{rawData.length ? "+$" + metrics.earningsThisWeek.toFixed(2) : "Awaiting data"}</span>
              </div>
            </div>

            {/* Card 3: Traded Turnover Volume */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-cyan-500/40 transition-all space-y-2 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-slate-400">Client Traded Turnover</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-cyan-200 font-mono">
                  {rawData.length ? "$" + (metrics.totalTurnover / 1000).toFixed(1) + "k" : "Awaiting data"}
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-400">
                  Awaiting verified data
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span>Turnover commission:</span>
                <span className="text-cyan-300 font-bold">{rawData.length ? "0.35% Net" : "Awaiting data"}</span>
              </div>
            </div>

            {/* Card 4: Active Traders & Pending Payout */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-purple-500/40 transition-all space-y-2 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-medium text-slate-400">Active Traders</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-purple-200 font-mono">
                  {rawData.length ? metrics.activeTraders : 'Awaiting data'}
                </span>
                <span className="text-[11px] font-mono font-bold text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/30">
                  {rawData.length ? metrics.conversionRate + '% active' : 'Awaiting data'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                <span>Est. Pending Payout:</span>
                <span className="text-purple-300 font-bold">{rawData.length ? "$" + metrics.pendingPayout.toFixed(2) : "Awaiting data"}</span>
              </div>
            </div>
          </div>

          {/* HISTORICAL TREND CHART SECTION */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-4">
            {/* Chart Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Metric Selector Pills */}
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedMetric('earnings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    selectedMetric === 'earnings'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Referral Earnings ($)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMetric('signups')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    selectedMetric === 'signups'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>User Signups</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedMetric('turnover')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    selectedMetric === 'turnover'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Traded Volume</span>
                </button>
              </div>

              {/* Timeframe Selector Pills & Live Simulation Test */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  {(['7d', '30d', '90d'] as Timeframe[]).map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all uppercase ${
                        timeframe === tf
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : '90 Days'}
                    </button>
                  ))}
                </div>

              </div>
            </div>

            {/* SVG Historical Chart Canvas */}
            <div className="relative pt-2">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-48 sm:h-56 overflow-visible"
              >
                <defs>
                  {/* Linear gradient fill for area under path */}
                  <linearGradient id="affiliateAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartTheme.gradientFrom} />
                    <stop offset="100%" stopColor={chartTheme.gradientTo} />
                  </linearGradient>
                  {/* Glow filter */}
                  <filter id="affiliateGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={chartTheme.glow} />
                  </filter>
                </defs>

                {/* Horizontal Guide Lines */}
                {[0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
                  const y = chartPadding.top + (svgHeight - chartPadding.top - chartPadding.bottom) * (1 - ratio);
                  return (
                    <line
                      key={i}
                      x1={chartPadding.left}
                      y1={y}
                      x2={svgWidth - chartPadding.right}
                      y2={y}
                      stroke="#1e293b"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Area under curve */}
                {areaPath && (
                  <path d={areaPath} fill="url(#affiliateAreaGrad)" />
                )}

                {/* Glowing Stroke line */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke={chartTheme.stroke}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#affiliateGlow)"
                  />
                )}

                {/* Interactive Points and Tooltips */}
                {points.map((pt, idx) => {
                  const isHovered = hoveredPointIndex === idx;
                  const item = rawData[idx];
                  return (
                    <g key={idx} className="cursor-pointer">
                      {/* Invisible hover target */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="14"
                        fill="transparent"
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                      />

                      {/* Visible circle marker */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : 3.5}
                        fill={chartTheme.stroke}
                        stroke="#0b111e"
                        strokeWidth="2"
                        className="transition-all"
                      />

                      {/* Floating tooltip on hover */}
                      {isHovered && item && (
                        <g transform={`translate(${Math.min(Math.max(pt.x, 80), svgWidth - 80)}, ${Math.max(pt.y - 45, 20)})`}>
                          <rect
                            x="-65"
                            y="-14"
                            width="130"
                            height="34"
                            rx="8"
                            fill="#070b14"
                            stroke="#334155"
                            strokeWidth="1"
                            filter="drop-shadow(0 4px 6px rgba(0,0,0,0.5))"
                          />
                          <text
                            x="0"
                            y="-1"
                            textAnchor="middle"
                            fill="#94a3b8"
                            fontSize="9"
                            fontFamily="monospace"
                          >
                            {item.date} ({item.label})
                          </text>
                          <text
                            x="0"
                            y="13"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {chartTheme.unitPrefix}
                            {pt.val.toLocaleString('en-US', {
                              maximumFractionDigits: selectedMetric === 'earnings' ? 2 : 0,
                            })}
                            {chartTheme.unitSuffix}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* X-Axis date labels */}
                {points.map((pt, idx) => {
                  const item = rawData[idx];
                  return (
                    <text
                      key={idx}
                      x={pt.x}
                      y={svgHeight - 12}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="500"
                    >
                      {item ? item.label : ''}
                    </text>
                  );
                })}
              </svg>
            </div>

            {/* Chart Min / Max / Average summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Lowest:</span>
                <span className="text-white font-bold">
                  {chartTheme.unitPrefix}
                  {chartStats.min.toLocaleString('en-US', {
                    maximumFractionDigits: selectedMetric === 'earnings' ? 2 : 0,
                  })}
                  {chartTheme.unitSuffix}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Peak / High:</span>
                <span className="text-emerald-400 font-bold">
                  {chartTheme.unitPrefix}
                  {chartStats.max.toLocaleString('en-US', {
                    maximumFractionDigits: selectedMetric === 'earnings' ? 2 : 0,
                  })}
                  {chartTheme.unitSuffix}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Period Average:</span>
                <span className="text-cyan-300 font-bold">
                  {chartTheme.unitPrefix}
                  {chartStats.avg.toLocaleString('en-US', {
                    maximumFractionDigits: selectedMetric === 'earnings' ? 2 : 0,
                  })}
                  {chartTheme.unitSuffix}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Trend Growth:</span>
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+{Math.abs(chartStats.diffPercent).toFixed(1)}%</span>
                </span>
              </div>
            </div>
          </div>

          {/* COMMISSION EARNINGS ESTIMATOR TOOL */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/20 via-slate-950 to-slate-950 border border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
                  Projected Commission Estimator
                </h3>
              </div>
              <span className="text-[10px] font-mono text-amber-300 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30">
                0.35% Turnover Rate
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* Sliders Input */}
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <div className="flex items-center justify-between text-slate-300 mb-1.5">
                    <span>Projected New Referrals / Month:</span>
                    <span className="text-amber-400 font-bold text-sm">{calcMonthlySignups} traders</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="5"
                    value={calcMonthlySignups}
                    onChange={(e) => setCalcMonthlySignups(Number(e.target.value))}
                    className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>10 referrals</span>
                    <span>150</span>
                    <span>300 referrals</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-slate-300 mb-1.5">
                    <span>Average Daily Turnover / Trader:</span>
                    <span className="text-cyan-400 font-bold text-sm">${calcDailyVolume}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1000"
                    step="25"
                    value={calcDailyVolume}
                    onChange={(e) => setCalcDailyVolume(Number(e.target.value))}
                    className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>$50/day</span>
                    <span>$500/day</span>
                    <span>$1,000/day</span>
                  </div>
                </div>
              </div>

              {/* Output Results Box */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 font-mono">
                <div className="text-[11px] text-slate-400 uppercase tracking-wide">
                  Projected Earnings Breakdown
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-300">Monthly Turnover:</span>
                  <span className="text-sm font-bold text-cyan-300">
                    ${projection.monthlyTurnover.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-xs font-bold text-amber-300">Est. Monthly Commission:</span>
                  <span className="text-lg font-black text-amber-400">
                    ${projection.monthlyEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-800/80 pt-2">
                  <span className="text-xs font-bold text-emerald-400">Annualized Earnings:</span>
                  <span className="text-base font-black text-emerald-300">
                    ${projection.annualEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })} / yr
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
