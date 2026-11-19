import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Check,
  Flame,
  HelpCircle,
  RefreshCw,
  Sliders,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { DistributionAnalysis, MarketTick } from '../types/deriv';

interface DigitDistributionProps {
  distribution: DistributionAnalysis;
  currentTick: MarketTick | null;
  tickWindow: number;
  onUpdateTickWindow: (newWindow: number) => void;
  onRefreshHistory: () => void;
  isLoadingHistory: boolean;
}

export const DigitDistribution: React.FC<DigitDistributionProps> = ({
  distribution,
  currentTick,
  tickWindow,
  onUpdateTickWindow,
  onRefreshHistory,
  isLoadingHistory,
}) => {
  const [customInput, setCustomInput] = useState(tickWindow.toString());
  const [showConfig, setShowConfig] = useState(false);

  const { digits, totalTicks, mostFrequent, secondMostFrequent, leastFrequent, frequencyDiffTopTwo, hasTiedLeaders } =
    distribution;

  const currentDigit = currentTick ? currentTick.digit : null;

  const handleApplyWindow = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customInput, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      onUpdateTickWindow(parsed);
      setShowConfig(false);
    }
  };

  const presetWindows = [50, 250, 500, 1000, 2000];

  return (
    <div className="bg-[#0f172a]/95 border border-slate-800/90 rounded-xl p-4 shadow-xl">
      {/* Top Header bar with Tick Window configuration */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono flex items-center gap-2">
              Digit Frequency Intelligence
              <span className="text-[11px] font-normal text-slate-400 font-sans">
                ({totalTicks.toLocaleString()} ticks analyzed)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live probability distribution and moving cursor across digits 0–9
            </p>
          </div>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/60 rounded-lg p-1">
            {presetWindows.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setCustomInput(preset.toString());
                  onUpdateTickWindow(preset);
                }}
                className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors ${
                  tickWindow === preset
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center gap-1"
            title="Custom tick history count"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs hidden sm:inline">{tickWindow}</span>
          </button>

          <button
            type="button"
            onClick={onRefreshHistory}
            disabled={isLoadingHistory}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs disabled:opacity-50 transition-colors"
            title="Resync tick history from Deriv"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoadingHistory ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expandable Custom Window Input */}
      {showConfig && (
        <form onSubmit={handleApplyWindow} className="mb-4 p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center gap-3">
          <label htmlFor="tick-window-input" className="text-xs text-slate-300 font-medium">
            Enter exact tick count:
          </label>
          <input
            id="tick-window-input"
            type="number"
            min="10"
            max="5000"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white w-24 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs flex items-center gap-1"
          >
            <Check className="w-3 h-3" /> Apply
          </button>
          <span className="text-[11px] text-slate-500">
            Recommended: 100 to 2,000 genuine ticks
          </span>
        </form>
      )}

      {/* Central Digit Circular Grid (0 - 9) - Well arranged and sized circles */}
      <div className="grid grid-cols-2 xs:grid-cols-5 lg:grid-cols-10 gap-3 sm:gap-4 justify-items-center mb-5">
        {digits.map((item) => {
          const isCurrentCursor = currentDigit === item.digit;
          const isRank1 = mostFrequent && item.digit === mostFrequent.digit && !hasTiedLeaders;
          const isRank2 = secondMostFrequent && item.digit === secondMostFrequent.digit;
          const isLeast = leastFrequent && item.digit === leastFrequent.digit;

          // Color tokens
          let ringColor = 'stroke-slate-700/80';
          let ringBg = 'stroke-slate-800/40';
          let circleBg = 'bg-[#090d18]/90';
          let circleBorder = 'border-slate-800';
          let digitColor = 'text-slate-200';
          let roleTag = '';
          let glowClass = '';

          if (isRank1) {
            ringColor = 'stroke-emerald-400';
            ringBg = 'stroke-emerald-950/60';
            circleBg = 'bg-emerald-950/30';
            circleBorder = 'border-emerald-500/80';
            digitColor = 'text-emerald-300 font-black';
            roleTag = 'TOP #1 (GREEN)';
            glowClass = 'shadow-[0_0_18px_rgba(16,185,129,0.35)]';
          } else if (isRank2) {
            ringColor = 'stroke-cyan-400';
            ringBg = 'stroke-cyan-950/60';
            circleBg = 'bg-cyan-950/30';
            circleBorder = 'border-cyan-500/80';
            digitColor = 'text-cyan-300 font-black';
            roleTag = 'TOP #2 (BLUE)';
            glowClass = 'shadow-[0_0_18px_rgba(6,182,212,0.35)]';
          } else if (isLeast) {
            ringColor = 'stroke-rose-400';
            ringBg = 'stroke-rose-950/60';
            circleBg = 'bg-rose-950/30';
            circleBorder = 'border-rose-500/80';
            digitColor = 'text-rose-300 font-black';
            roleTag = 'LEAST (RED)';
            glowClass = 'shadow-[0_0_18px_rgba(244,63,94,0.35)]';
          }

          // SVG radial progress calculation
          const radius = 38;
          const circumference = 2 * Math.PI * radius;
          // Normal average frequency is 10%, max scale ~20%
          const fillRatio = Math.min(Math.max(item.frequency / 25, 0.05), 1);
          const strokeDashoffset = circumference - fillRatio * circumference;

          return (
            <div
              key={item.digit}
              className="flex flex-col items-center group transition-transform duration-200 hover:scale-105"
            >
              {/* Circular Gauge */}
              <div
                className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center border-2 transition-all ${circleBg} ${circleBorder} ${glowClass} ${
                  isCurrentCursor
                    ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_24px_rgba(251,191,36,0.6)] scale-105'
                    : ''
                }`}
              >
                {/* SVG Radial Frequency Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className={ringBg}
                    strokeWidth="5"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    className={`${ringColor} transition-all duration-500`}
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                {/* Floating Animated Cursor Pill */}
                {isCurrentCursor && (
                  <div className="absolute -top-3 bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-mono text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 z-20 animate-bounce">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
                    <span>CURSOR</span>
                  </div>
                )}

                {/* Digit Center Display */}
                <div className="relative z-10 flex flex-col items-center justify-center leading-none">
                  <span className={`text-xl sm:text-2xl font-mono tracking-tight font-black ${digitColor}`}>
                    {item.digit}
                  </span>
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-white mt-0.5">
                    {item.frequency.toFixed(1)}%
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 mt-0.5 opacity-90">
                    {item.count} hits
                  </span>
                </div>
              </div>

              {/* Sub-label Badge */}
              <div className="mt-1.5 flex items-center gap-1">
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
                    isRank1
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isRank2
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : isLeast
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}
                >
                  #{item.rank}
                  {item.isTied && <span className="opacity-75"> (T)</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Intelligence Summary Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
        {/* Most Frequent (Green) */}
        <div className="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-black text-sm border border-emerald-500/30">
              {mostFrequent ? mostFrequent.digit : '-'}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Green Bar (Top 1)
              </div>
              <div className="text-xs font-mono text-slate-300">
                {mostFrequent ? `${mostFrequent.frequency.toFixed(2)}% (${mostFrequent.count} hits)` : 'Tied Leader'}
              </div>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
        </div>

        {/* 2nd Most Frequent (Blue) */}
        <div className="bg-slate-900/80 border border-blue-500/30 rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono font-black text-sm border border-blue-500/30">
              {secondMostFrequent ? secondMostFrequent.digit : '-'}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                Blue Bar (Top 2)
              </div>
              <div className="text-xs font-mono text-slate-300">
                {secondMostFrequent ? `${secondMostFrequent.frequency.toFixed(2)}% (${secondMostFrequent.count} hits)` : '-'}
              </div>
            </div>
          </div>
          <TrendingUp className="w-4 h-4 text-blue-400" />
        </div>

        {/* Least Frequent (Red) */}
        <div className="bg-slate-900/80 border border-rose-500/30 rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center font-mono font-black text-sm border border-rose-500/30">
              {leastFrequent ? leastFrequent.digit : '-'}
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                Red Bar (Least)
              </div>
              <div className="text-xs font-mono text-slate-300">
                {leastFrequent ? `${leastFrequent.frequency.toFixed(2)}% (${leastFrequent.count} hits)` : 'Tied Least'}
              </div>
            </div>
          </div>
          <TrendingDown className="w-4 h-4 text-rose-400" />
        </div>

        {/* Top Two Frequency Difference */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Top 2 Delta (Diff)
            </div>
            <div className="text-sm font-mono font-extrabold text-white flex items-center gap-1.5">
              <span>{frequencyDiffTopTwo.toFixed(2)}%</span>
              {frequencyDiffTopTwo <= 0.3 && mostFrequent && secondMostFrequent ? (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Matches Target Valid
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-normal">
                  (Matches req: &le; 0.30%)
                </span>
              )}
            </div>
          </div>
          <div className="p-1 rounded bg-slate-800 text-slate-400">
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
