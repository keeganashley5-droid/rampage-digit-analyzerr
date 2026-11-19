import React, { useState, useEffect } from 'react';
import {
  Bot,
  DollarSign,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { RiskConfig, RiskSessionStats, StrategyRuleMeta, StrategySignal } from '../types/deriv';

interface ExecutionControlsProps {
  strategyMeta: StrategyRuleMeta;
  currentStake: number;
  strategyProfit: number;
  riskConfig: RiskConfig;
  riskSession: RiskSessionStats;
  onUpdateRiskConfig: (updates: Partial<RiskConfig>) => void;
  executionMode: 'manual' | 'automatic';
  onSelectExecutionMode: (mode: 'manual' | 'automatic') => void;
  isAutomated: boolean;
  onToggleAutomated: (enabled: boolean) => void;
  onManualExecute: () => void;
  isExecuting: boolean;
  activeSignal: StrategySignal | null;
  onResetSessionStats: () => void;
}

export const ExecutionControls: React.FC<ExecutionControlsProps> = ({
  strategyMeta,
  currentStake,
  strategyProfit,
  riskConfig,
  riskSession,
  onUpdateRiskConfig,
  executionMode,
  onSelectExecutionMode,
  isAutomated,
  onToggleAutomated,
  onManualExecute,
  isExecuting,
  activeSignal,
  onResetSessionStats,
}) => {
  // Local input states to permit fluid typing and backspacing
  const [tpInput, setTpInput] = useState<string>(riskConfig.takeProfit > 0 ? String(riskConfig.takeProfit) : '10');
  const [slInput, setSlInput] = useState<string>(riskConfig.stopLoss > 0 ? String(riskConfig.stopLoss) : '20');
  const [stakeInput, setStakeInput] = useState<string>(String(riskConfig.initialStake));
  const [multiplierInput, setMultiplierInput] = useState<string>(String(riskConfig.martingaleMultiplier));
  const [maxStepsInput, setMaxStepsInput] = useState<string>(String(riskConfig.maxMartingaleSteps));

  // Sync inputs when props change externally
  useEffect(() => {
    if (riskConfig.takeProfit > 0) {
      setTpInput(String(riskConfig.takeProfit));
    }
  }, [riskConfig.takeProfit]);

  useEffect(() => {
    if (riskConfig.stopLoss > 0) {
      setSlInput(String(riskConfig.stopLoss));
    }
  }, [riskConfig.stopLoss]);

  useEffect(() => {
    setStakeInput(String(riskConfig.initialStake));
  }, [riskConfig.initialStake]);

  useEffect(() => { setMultiplierInput(String(riskConfig.martingaleMultiplier)); }, [riskConfig.martingaleMultiplier]);
  useEffect(() => { setMaxStepsInput(String(riskConfig.maxMartingaleSteps || 5)); }, [riskConfig.maxMartingaleSteps]);
// Stepper & Preset Helpers for TP
  const handleSetTp = (value: number) => {
    const validVal = Math.max(0, Math.round(value * 100) / 100);
    setTpInput(validVal > 0 ? String(validVal) : '0');
    onUpdateRiskConfig({ takeProfit: validVal });
  };

  const handleStepTp = (delta: number) => {
    const current = parseFloat(tpInput) || riskConfig.takeProfit || 10;
    handleSetTp(Math.max(1, current + delta));
  };

  const handleToggleTpUnlimited = () => {
    if (riskConfig.takeProfit > 0) {
      onUpdateRiskConfig({ takeProfit: 0 });
    } else {
      const restore = parseFloat(tpInput) > 0 ? parseFloat(tpInput) : 10;
      handleSetTp(restore);
    }
  };

  // Stepper & Preset Helpers for SL
  const handleSetSl = (value: number) => {
    const validVal = Math.max(0, Math.round(value * 100) / 100);
    setSlInput(validVal > 0 ? String(validVal) : '0');
    onUpdateRiskConfig({ stopLoss: validVal });
  };

  const handleStepSl = (delta: number) => {
    const current = parseFloat(slInput) || riskConfig.stopLoss || 20;
    handleSetSl(Math.max(1, current + delta));
  };

  const handleToggleSlUnlimited = () => {
    if (riskConfig.stopLoss > 0) {
      onUpdateRiskConfig({ stopLoss: 0 });
    } else {
      const restore = parseFloat(slInput) > 0 ? parseFloat(slInput) : 20;
      handleSetSl(restore);
    }
  };

  const canExecute = !riskConfig.isTradingPaused;

  // Progress metrics
  const tpProgressPct =
    riskConfig.takeProfit > 0
      ? Math.min(100, Math.max(0, (strategyProfit / riskConfig.takeProfit) * 100))
      : 0;

  const slLossPct =
    riskConfig.stopLoss > 0 && strategyProfit < 0
      ? Math.min(100, (Math.abs(Math.min(0, strategyProfit)) / riskConfig.stopLoss) * 100)
      : 0;

  return (
    <div className="bg-[#0f172a]/95 border border-slate-800/90 rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
              Execution & Risk Controls
            </h2>
            <p className="text-xs text-slate-400">
              Contract parameters, user-configurable Take Profit & Stop Loss barriers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 p-1">
          <button type="button" disabled={isAutomated} onClick={() => onSelectExecutionMode('manual')} className={`rounded-lg px-3 py-2 text-xs font-mono font-bold transition-colors ${executionMode === 'manual' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'} disabled:opacity-50`}>
            MANUAL
          </button>
          <button type="button" disabled={isAutomated} onClick={() => onSelectExecutionMode('automatic')} className={`rounded-lg px-3 py-2 text-xs font-mono font-bold transition-colors ${executionMode === 'automatic' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'} disabled:opacity-50`}>
            AUTOMATIC
          </button>
        </div>

        {executionMode === 'automatic' && (

        <div className="flex items-center gap-2">
          {isAutomated ? (
            <button
              type="button"
              onClick={() => onToggleAutomated(false)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-mono text-xs font-black tracking-wider uppercase transition-all shadow-lg shadow-rose-500/25 flex items-center gap-2 active:scale-95 animate-pulse"
              title="Stop Automated Execution Bot"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>STOP AUTOMATION BOT</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onToggleAutomated(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-mono text-xs font-black tracking-wider uppercase transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 active:scale-95"
              title="Start Automated Execution Bot (Executes on next tick after entry trigger)"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>START AUTOMATION BOT</span>
            </button>
          )}
        </div>
        )}
      </div>

      {/* Classy Bot Running / Stopped Status Banner */}
      {executionMode === 'automatic' && (isAutomated ? (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center justify-between text-xs font-mono text-emerald-300 shadow-md shadow-emerald-500/10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold text-white tracking-wide">BOT STATUS: RUNNING</span>
            <span className="text-emerald-400/90 hidden sm:inline">
              · Actively scanning {strategyMeta.name}. Purchases execute on the next tick after entry trigger.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            NEXT-TICK ARMED
          </span>
        </div>
      ) : (
        <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span>Automation Bot is STOPPED. Click "START AUTOMATION BOT" above to begin 1-tick automated executions.</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            IDLE
          </span>
        </div>
      ))}

      {/* Stake & Primary Execution Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Stake Setting */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
          <label htmlFor="stake-input" className="block text-xs text-slate-400 mb-1 font-medium font-mono">
            Next Contract Stake ($)
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">$</span>
              <input
                id="stake-input"
                type="number"
                step="0.1"
                min="0.35"
                value={stakeInput}
                onChange={(e) => {
                  setStakeInput(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed >= 0.35) {
                    onUpdateRiskConfig({ initialStake: parsed });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-6 pr-2 py-1.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            {currentStake !== riskConfig.initialStake && (
              <span className="text-[10px] font-mono px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                Martingale: ${currentStake.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Martingale Setting */}
        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="martingale-multiplier" className="text-xs text-slate-400 font-medium font-mono">
              Martingale Recovery
            </label>
            {!strategyMeta.supportsMartingale && (
              <span className="text-[10px] text-slate-500 font-mono">Disabled on Matches</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!strategyMeta.supportsMartingale}
              onClick={() => onUpdateRiskConfig({ martingaleEnabled: !riskConfig.martingaleEnabled })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                riskConfig.martingaleEnabled && strategyMeta.supportsMartingale
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-950 text-slate-400 border border-slate-700'
              }`}
            >
              {riskConfig.martingaleEnabled && strategyMeta.supportsMartingale ? 'ON' : 'OFF'}
            </button>
            <select
              id="martingale-multiplier"
              disabled={!strategyMeta.supportsMartingale || !riskConfig.martingaleEnabled}
              value={riskConfig.martingaleMultiplier}
              onChange={(e) => onUpdateRiskConfig({ martingaleMultiplier: parseFloat(e.target.value) })}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white disabled:opacity-40"
            >
              <option value="1.5">1.5x Multiplier</option>
              <option value="2.0">2.0x Multiplier</option>
              <option value="2.1">2.1x Multiplier</option>
              <option value="2.2">2.2x Multiplier</option>
            </select>
          </div>
        </div>

        {/* Primary Manual Execution Button */}
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={onManualExecute}
            disabled={isExecuting || !canExecute}
            className={`w-full py-2.5 px-4 rounded-xl font-mono text-xs uppercase font-extrabold tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
              activeSignal
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/25 ring-2 ring-emerald-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>
              {isExecuting
                ? 'Purchasing...'
                : activeSignal
                ? `Execute ${activeSignal.contractType} ${activeSignal.barrier}`
                : 'Manual Trade (1-Tick)'}
            </span>
          </button>
        </div>
      </div>

      {/* DEDICATED USER-CONFIGURABLE TAKE PROFIT & STOP LOSS PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* TAKE PROFIT (TP) CONFIGURATION */}
        <div
          className="rounded-2xl p-4 border transition-all bg-slate-900/90 border-slate-800"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  riskConfig.takeProfit > 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                  Take Profit (TP)
                </span>
                <span className="text-[10px] font-mono text-slate-400 block">
                  {riskConfig.takeProfit > 0
                    ? `Resets this strategy when profit reaches +$${riskConfig.takeProfit.toFixed(2)}`
                    : 'No profit reset limit'}
                </span>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <button
              type="button"
              onClick={handleToggleTpUnlimited}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                riskConfig.takeProfit > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {riskConfig.takeProfit > 0 ? 'ACTIVE' : 'UNLIMITED'}
            </button>
          </div>

          {/* Input & Stepper */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs font-bold">
                $
              </span>
              <input
                id="tp-input"
                type="number"
                step="1"
                min="0"
                disabled={riskConfig.takeProfit === 0}
                value={riskConfig.takeProfit === 0 ? '0' : tpInput}
                onChange={(e) => {
                  setTpInput(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed >= 0) {
                    onUpdateRiskConfig({ takeProfit: parsed });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-base font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 disabled:opacity-40"
                placeholder="Take Profit Target ($)"
              />
            </div>

            {/* Steppers */}
            <button
              type="button"
              disabled={riskConfig.takeProfit === 0}
              onClick={() => handleStepTp(-5)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
              title="Decrease TP by $5"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={riskConfig.takeProfit === 0}
              onClick={() => handleStepTp(5)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
              title="Increase TP by $5"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-[10px] font-mono text-slate-500 mr-1">Presets:</span>
            {[5, 10, 25, 50, 100].map((amt) => (
              <button
                key={`tp_preset_${amt}`}
                type="button"
                onClick={() => handleSetTp(amt)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  riskConfig.takeProfit === amt
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                    : 'bg-slate-950 text-slate-300 hover:text-emerald-400 border border-slate-800'
                }`}
              >
                ${amt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleStepTp(10)}
              className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-emerald-300 hover:bg-slate-700 transition-colors ml-auto"
            >
              + $10
            </button>
          </div>

          {/* Progress / Reached Banner */}
          {/* Progress / Reached Banner */}
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-400">Strategy Progress:</span>
              <span className="font-bold text-white">
                {strategyProfit >= 0 ? '+' : '-'}${Math.abs(strategyProfit).toFixed(2)}
                {riskConfig.takeProfit > 0 && ` / ${riskConfig.takeProfit.toFixed(2)}`}
              </span>
            </div>
            {riskConfig.takeProfit > 0 && (
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full transition-all duration-300" style={{ width: `${tpProgressPct}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* STOP LOSS (SL) CONFIGURATION */}
        <div
          className="rounded-2xl p-4 border transition-all bg-slate-900/90 border-slate-800"
        >
          {/* Card Header */}
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  riskConfig.stopLoss > 0
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-white uppercase flex items-center gap-1.5">
                  Stop Loss (SL)
                </span>
                <span className="text-[10px] font-mono text-slate-400 block">
                  {riskConfig.stopLoss > 0
                    ? `Resets this strategy if loss reaches -$${riskConfig.stopLoss.toFixed(2)}`
                    : 'No loss reset limit'}
                </span>
              </div>
            </div>

            {/* Enable/Disable Toggle */}
            <button
              type="button"
              onClick={handleToggleSlUnlimited}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all ${
                riskConfig.stopLoss > 0
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {riskConfig.stopLoss > 0 ? 'ACTIVE' : 'UNLIMITED'}
            </button>
          </div>

          {/* Input & Stepper */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs font-bold">
                $
              </span>
              <input
                id="sl-input"
                type="number"
                step="1"
                min="0"
                disabled={riskConfig.stopLoss === 0}
                value={riskConfig.stopLoss === 0 ? '0' : slInput}
                onChange={(e) => {
                  setSlInput(e.target.value);
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed >= 0) {
                    onUpdateRiskConfig({ stopLoss: parsed });
                  }
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-base font-mono font-bold text-rose-400 focus:outline-none focus:border-rose-500 disabled:opacity-40"
                placeholder="Stop Loss Floor ($)"
              />
            </div>

            {/* Steppers */}
            <button
              type="button"
              disabled={riskConfig.stopLoss === 0}
              onClick={() => handleStepSl(-10)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
              title="Decrease SL by $10"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={riskConfig.stopLoss === 0}
              onClick={() => handleStepSl(10)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors"
              title="Increase SL by $10"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-[10px] font-mono text-slate-500 mr-1">Presets:</span>
            {[10, 20, 50, 100, 200].map((amt) => (
              <button
                key={`sl_preset_${amt}`}
                type="button"
                onClick={() => handleSetSl(amt)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                  riskConfig.stopLoss === amt
                    ? 'bg-rose-500 text-slate-950 font-bold shadow-sm shadow-rose-500/20'
                    : 'bg-slate-950 text-slate-300 hover:text-rose-400 border border-slate-800'
                }`}
              >
                ${amt}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleStepSl(20)}
              className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-rose-300 hover:bg-slate-700 transition-colors ml-auto"
            >
              + $20
            </button>
          </div>

          {/* Strategy Stop Loss Progress */}
          <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
              <span className="text-slate-400">Strategy Drawdown:</span>
              <span className="font-bold text-white">
                {strategyProfit < 0 ? `-$${Math.abs(strategyProfit).toFixed(2)}` : '$0.00'}
                {riskConfig.stopLoss > 0 && ` / -$${riskConfig.stopLoss.toFixed(2)}`}
              </span>
            </div>
            {riskConfig.stopLoss > 0 && (
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-300"
                  style={{ width: `${slLossPct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Advanced Institutional Risk Limits (Always Fully Active) */}
      <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="font-bold text-white uppercase flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Execution Safeguards</span>
          </span>
          <span className="text-[10px] text-slate-400">Account-level execution controls</span>
        </div>

        <div className="grid grid-cols-1">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Trading Execution Status
            </label>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-300">
                {riskConfig.isTradingPaused ? 'Emergency Paused' : 'Active Execution Allowed'}
              </span>
              <button
                type="button"
                onClick={() => onUpdateRiskConfig({ isTradingPaused: !riskConfig.isTradingPaused })}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  riskConfig.isTradingPaused
                    ? 'bg-rose-500 text-white'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                }`}
              >
                {riskConfig.isTradingPaused ? 'RESUME TRADING' : 'PAUSE ALL'}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Instantly blocks or restores all manual and automated trade execution.
            </p>
          </div>
        </div>
      </div>

      {/* Session Stats Banner (Net Profit & Settled Counts — NO WIN RATE CARD!) */}
      <div className="grid grid-cols-1 gap-3 pt-1">
        {/* Session Net Profit / Loss */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Session Net P/L</div>
            <div
              className={`text-lg font-mono font-black ${
                riskSession.netProfit > 0
                  ? 'text-emerald-400'
                  : riskSession.netProfit < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {riskSession.netProfit >= 0 ? '+' : ''}${riskSession.netProfit.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={onResetSessionStats}
            title="Reset session stats to $0.00"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Won & Lost Trade Counts (No Win Rate Card!) */}
        <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-mono">Settled Trades</div>
            <div className="text-sm font-mono font-bold text-white flex items-center gap-2 mt-0.5">
              <span className="text-emerald-400">{riskSession.wonCount} Won</span>
              <span className="text-slate-600">/</span>
              <span className="text-rose-400">{riskSession.lostCount} Lost</span>
              <span className="text-slate-400">({riskSession.totalPurchases} Total)</span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            1-Tick Contracts
          </span>
        </div>
      </div>
    </div>
  );
};
