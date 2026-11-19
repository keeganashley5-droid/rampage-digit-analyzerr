import React, { useEffect, useState } from 'react';
import { BullLogo } from './BullLogo';
import { ShieldCheck, Zap } from 'lucide-react';

interface SplashLoaderProps {
  onFinish: () => void;
  minDurationMs?: number;
}

export const SplashLoader: React.FC<SplashLoaderProps> = ({
  onFinish,
  minDurationMs = 4000,
}) => {
  const [progress, setProgress] = useState(0);
  const [telemetryIndex, setTelemetryIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const telemetrySteps = [
    'Establishing Direct Deriv WebSocket Connection...',
    'Syncing 0-9 Digit Distribution Matrix...',
    'Calibrating Quantitative Mathematical Models...',
    'Arming Institutional Circuit Breakers & Risk Rails...',
    'RAMPAGE DIGIT ANALYZER Primed.',
  ];

  const onFinishRef = React.useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const startTime = Date.now();
    let isDone = false;
    const interval = setInterval(() => {
      if (isDone) return;
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / minDurationMs) * 100));
      setProgress(pct);

      const stepIndex = Math.min(
        telemetrySteps.length - 1,
        Math.floor((pct / 100) * telemetrySteps.length)
      );
      setTelemetryIndex(stepIndex);

      if (pct >= 100) {
        isDone = true;
        clearInterval(interval);
        setIsFadingOut(true);
        setTimeout(() => {
          onFinishRef.current();
        }, 400);
      }
    }, 35);

    return () => clearInterval(interval);
  }, [minDurationMs]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#05070c] text-slate-100 transition-opacity duration-400 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Opulent Ambient Gold Radial Light */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_40%,rgba(245,158,11,0.18),rgba(5,7,12,0.98))] pointer-events-none" />

      {/* Subtle background candlestick watermark grid */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#d97706_1px,transparent_1px),linear-gradient(to_bottom,#d97706_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6 text-center space-y-7">
        {/* Official Gold Bull Medallion */}
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-tr from-amber-600/30 via-yellow-400/20 to-amber-700/30 blur-2xl rounded-full animate-pulse" />
          <div className="relative p-1.5 rounded-full bg-gradient-to-b from-amber-400 via-amber-700 to-yellow-600 shadow-[0_0_40px_rgba(245,158,11,0.4)]">
            <BullLogo size={118} className="w-28 h-28 sm:w-32 sm:h-32" glow={false} borderStyle="none" />
          </div>
        </div>

        {/* Brand Headline in Burnished Gold */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 font-mono">
            <span className="text-2xl sm:text-3xl font-black tracking-widest bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-sm">
              RAMPAGE
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-500/20">
              DIGIT ANALYZER
            </span>
          </div>
          <p className="text-[11px] font-mono tracking-widest text-amber-200/60 uppercase">
            Deriv Quantitative Synthetics Terminal
          </p>
        </div>

        {/* Liquid Gold Progress Bar & Telemetry */}
        <div className="w-full space-y-3 pt-1">
          {/* Progress Track */}
          <div className="w-full h-2 bg-slate-950/90 rounded-full overflow-hidden border border-amber-500/30 p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-200 rounded-full transition-all duration-75 shadow-[0_0_15px_rgba(250,204,21,0.85)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="truncate pr-2 text-amber-300/90 font-medium">
              {telemetrySteps[telemetryIndex]}
            </span>
            <span className="shrink-0 text-amber-400 font-bold">{progress}%</span>
          </div>
        </div>

        {/* Footer Hardware & Protocol Guarantees */}
        <div className="pt-3 flex items-center justify-center gap-4 text-[10px] font-mono text-amber-400/50 border-t border-amber-500/20 w-full">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> Direct Deriv WebSocket
          </span>
          <span className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" /> 1-Tick Fast Settlement
          </span>
        </div>
      </div>
    </div>
  );
};
