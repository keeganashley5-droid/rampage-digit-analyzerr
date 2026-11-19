import React, { useEffect, useRef, useState } from 'react';
import type { ContractType, DistributionAnalysis, MarketTick } from '../types/deriv';

export interface DirectTradeConfig {
  contractType: ContractType;
  barrier: number;
  stake: number;
  duration: number;
  durationUnit: 't' | 's' | 'm' | 'h' | 'd';
}

interface DirectTradingProps {
  distribution: DistributionAnalysis;
  currentTick: MarketTick | null;
  initialStake: number;
  canTrade: boolean;
  connectionStatus: string;
  accountLabel: string;
  executionContextKey: string;
  onExecute: (config: DirectTradeConfig, automated: boolean) => Promise<boolean>;
}

export function DirectTrading({
  distribution,
  currentTick,
  initialStake,
  canTrade,
  connectionStatus,
  accountLabel,
  executionContextKey,
  onExecute,
}: DirectTradingProps) {
  const [mode, setMode] = useState<'manual' | 'automatic'>('manual');
  const [contractType, setContractType] = useState<ContractType>('DIGITOVER');
  const [barrier, setBarrier] = useState(5);
  const [stake, setStake] = useState(String(initialStake));
  const [duration, setDuration] = useState('1');
  const [durationUnit, setDurationUnit] = useState<DirectTradeConfig['durationUnit']>('t');
  const [runs, setRuns] = useState('5');
  const [completedRuns, setCompletedRuns] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const stopRef = useRef(false);
  const runningRef = useRef(false);
  const canTradeRef = useRef(canTrade);
  canTradeRef.current = canTrade;
  const contextRef = useRef(executionContextKey);
  contextRef.current = executionContextKey;

  useEffect(() => {
    if (!isBuying && !isRunning) setStake(String(initialStake));
  }, [initialStake]);

  useEffect(() => () => {
    stopRef.current = true;
  }, []);

  useEffect(() => {
    if (!canTrade) stopRef.current = true;
  }, [canTrade, executionContextKey]);

  const parsedStake = Number(stake);
  const parsedDuration = Number(duration);
  const parsedRuns = Number(runs);
  const validConfig =
    Number.isFinite(parsedStake) && parsedStake >= 0.35 &&
    Number.isInteger(parsedDuration) && parsedDuration >= 1 &&
    Number.isInteger(barrier) && barrier >= 0 && barrier <= 9 &&
    (mode === 'manual' || (Number.isInteger(parsedRuns) && parsedRuns >= 1 && parsedRuns <= 1000));

  const config: DirectTradeConfig = {
    contractType,
    barrier,
    stake: parsedStake,
    duration: parsedDuration,
    durationUnit,
  };

  const executeOne = async (automated: boolean) => {
    if (!canTradeRef.current || !currentTick || !validConfig || runningRef.current && !automated) return false;
    setIsBuying(true);
    try {
      return await onExecute(config, automated);
    } finally {
      setIsBuying(false);
    }
  };

  const startAutomatic = async () => {
    if (runningRef.current || !canTradeRef.current || !validConfig) return;
    const startingContext = contextRef.current;
    stopRef.current = false;
    runningRef.current = true;
    setIsRunning(true);
    setCompletedRuns(0);
    try {
      for (let index = 0; index < parsedRuns; index += 1) {
        if (stopRef.current || !canTradeRef.current || contextRef.current !== startingContext) break;
        const success = await executeOne(true);
        if (!success) break;
        setCompletedRuns(index + 1);
      }
    } finally {
      runningRef.current = false;
      setIsRunning(false);
      setIsBuying(false);
    }
  };

  const stopAutomatic = () => {
    stopRef.current = true;
  };

  const digits = distribution.digits || [];

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/80">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-4 py-4">
        <div>
          <h2 className="text-sm font-bold tracking-wider text-white">DIRECT TRADING</h2>
          <p className="mt-1 text-xs text-slate-400">Place contracts directly through your connected Deriv account</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className={`h-2 w-2 rounded-full ${connectionStatus === 'authorized' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-slate-300">{accountLabel}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="mb-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: 10 }, (_, digit) => {
            const stat = digits.find((item) => item.digit === digit);
            const isCurrent = currentTick?.digit === digit;
            return (
              <div key={digit} className={`rounded-xl border p-2 text-center ${isCurrent ? 'border-amber-400 bg-amber-400/10' : 'border-slate-800 bg-slate-900'}`}>
                <div className="text-lg font-bold text-white">{digit}</div>
                <div className="text-[10px] font-mono text-slate-400">{stat ? `${stat.frequency.toFixed(1)}%` : '—'}</div>
                <div className="text-[10px] text-slate-500">{stat ? `${stat.count} ticks` : ''}</div>
              </div>
            );
          })}
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 p-1">
            <button type="button" disabled={isRunning || isBuying} onClick={() => setMode('manual')} className={`rounded-lg px-3 py-2 text-xs font-mono font-bold transition-colors ${mode === 'manual' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'} disabled:opacity-50`}>MANUAL</button>
            <button type="button" disabled={isRunning || isBuying} onClick={() => setMode('automatic')} className={`rounded-lg px-3 py-2 text-xs font-mono font-bold transition-colors ${mode === 'automatic' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'} disabled:opacity-50`}>AUTOMATIC</button>
          </div>
          <span className="text-xs font-mono text-slate-400">Cursor: {currentTick ? currentTick.digit : '—'}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="text-xs text-slate-400">
            Contract type
            <select value={contractType} disabled={isRunning || isBuying} onChange={(event) => setContractType(event.target.value as ContractType)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white">
              <option value="DIGITOVER">Digit Over</option>
              <option value="DIGITUNDER">Digit Under</option>
              <option value="DIGITDIFF">Differs</option>
              <option value="MATCHES">Matches</option>
              <option value="DIGITEVEN">Even</option>
              <option value="DIGITODD">Odd</option>
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Barrier / digit
            <input type="number" min="0" max="9" step="1" value={barrier} disabled={isRunning || isBuying || contractType === 'DIGITEVEN' || contractType === 'DIGITODD'} onChange={(event) => setBarrier(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40" />
          </label>
          <label className="text-xs text-slate-400">
            Stake ({'USD'})
            <input type="number" min="0.35" step="0.01" value={stake} disabled={isRunning || isBuying} onChange={(event) => setStake(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
          </label>
          <label className="text-xs text-slate-400">
            Duration
            <div className="mt-1 flex gap-1">
              <input type="number" min="1" step="1" value={duration} disabled={isRunning || isBuying} onChange={(event) => setDuration(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-2 text-sm text-white" />
              <select value={durationUnit} disabled={isRunning || isBuying} onChange={(event) => setDurationUnit(event.target.value as DirectTradeConfig['durationUnit'])} className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-1 py-2 text-sm text-white">
                <option value="t">Ticks</option>
                <option value="s">Sec</option>
                <option value="m">Min</option>
                <option value="h">Hours</option>
                <option value="d">Days</option>
              </select>
            </div>
          </label>
        </div>

        {mode === 'automatic' && (
          <div className="mt-3 max-w-xs">
            <label className="text-xs text-slate-400">
              Runs per cycle (1–1000)
              <input type="number" min="1" max="1000" step="1" value={runs} disabled={isRunning || isBuying} onChange={(event) => setRuns(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
            </label>
            {(isRunning || completedRuns > 0) && <p className="mt-2 text-xs font-mono text-slate-400">{completedRuns} / {parsedRuns} confirmed purchases</p>}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {mode === 'manual' ? (
            <button type="button" disabled={!canTrade || !currentTick || !validConfig || isBuying || isRunning} onClick={() => void executeOne(false)} className="rounded-xl bg-cyan-500 px-5 py-3 text-xs font-bold tracking-wider text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40">
              {isBuying ? 'PURCHASING…' : 'BUY ONE CONTRACT'}
            </button>
          ) : isRunning ? (
            <button type="button" onClick={stopAutomatic} className="rounded-xl bg-rose-500 px-5 py-3 text-xs font-bold tracking-wider text-white transition hover:bg-rose-400">STOP AUTOMATIC</button>
          ) : (
            <button type="button" disabled={!canTrade || !currentTick || !validConfig || isBuying} onClick={() => void startAutomatic()} className="rounded-xl bg-emerald-500 px-5 py-3 text-xs font-bold tracking-wider text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40">START AUTOMATIC</button>
          )}
          {!canTrade && <span className="text-xs text-amber-400">Connect and authorize a Deriv account, and check trading risk settings.</span>}
        </div>
      </div>
    </section>
  );
}


