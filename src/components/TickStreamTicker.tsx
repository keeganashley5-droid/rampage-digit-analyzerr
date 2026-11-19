import React from 'react';
import { Activity, ArrowDown, ArrowUp } from 'lucide-react';
import { MarketTick } from '../types/deriv';

interface TickStreamTickerProps {
  ticks: MarketTick[];
}

export const TickStreamTicker: React.FC<TickStreamTickerProps> = ({ ticks }) => {
  // Take last 14 ticks
  const recent = ticks.slice(-14).reverse();

  if (recent.length === 0) return null;

  return (
    <div className="bg-[#0b101b] border border-slate-800/80 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
        <span className="text-xs font-mono font-bold text-slate-300 uppercase">Live Tick Stream:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto w-full scrollbar-none py-1">
        {recent.map((tick, i) => {
          const isLatest = i === 0;
          return (
            <div
              key={`${tick.epoch}_${i}`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono shrink-0 transition-all ${
                isLatest
                  ? 'bg-cyan-950/80 border-cyan-400 text-white font-bold ring-1 ring-cyan-400 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400'
              }`}
            >
              <span className="text-[11px] text-slate-300">{tick.quote.toFixed(2)}</span>
              <span
                className={`px-1.5 py-0.2 rounded font-extrabold ${
                  isLatest ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-cyan-300'
                }`}
              >
                {tick.digit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
