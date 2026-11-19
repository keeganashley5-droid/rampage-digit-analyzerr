import React, { useState } from 'react';
import {
  AlertCircle,
  Archive,
  Check,
  CheckCircle2,
  ChevronDown,
  Cpu,
  Flame,
  Info,
  Layers,
  Radio,
  RotateCcw,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import {
  CustomStrategy,
  RiskConfig,
  StrategyId,
  StrategyOverride,
  StrategyRuntimeState,
  StrategySignal,
} from '../types/deriv';
import { STRATEGY_METAS } from '../engine/strategies';

interface StrategyCenterProps {
  selectedStrategy: StrategyId;
  onSelectStrategy: (id: StrategyId) => void;
  runtimeState: StrategyRuntimeState;
  isAutomated: boolean;
  executionMode: 'manual' | 'automatic';
  conditionStatus: {
    ruleDescription: string;
    items: { label: string; met: boolean; detail?: string }[];
  };
  activeSignal: StrategySignal | null;
  onResetCycle: () => void;
  customStrategies?: CustomStrategy[];
  strategyOverrides?: Record<string, StrategyOverride>;
  onUpdateRunsPerCycle?: (runs: number) => void;
  onToggleMatchesMartingale?: (enabled: boolean) => void;
  theme?: 'dark' | 'bright';
  archivedStrategies?: string[];
  onDeleteStrategy?: (id: string) => void;
  onRestoreStrategy?: (id: string) => void;
  riskConfig?: RiskConfig;
}

export const StrategyCenter: React.FC<StrategyCenterProps> = ({
  selectedStrategy,
  onSelectStrategy,
  runtimeState,
  isAutomated,
  executionMode,
  conditionStatus,
  activeSignal,
  onResetCycle,
  customStrategies = [],
  strategyOverrides = {},
  onUpdateRunsPerCycle,
  onToggleMatchesMartingale,
  theme = 'dark',
  archivedStrategies = [],
  onDeleteStrategy,
  onRestoreStrategy,
  riskConfig,
}) => {
  const isBright = theme === 'bright';
  const frozenMeta = STRATEGY_METAS[selectedStrategy];
  const customMeta = customStrategies.find((c) => c.id === selectedStrategy);
  const override = strategyOverrides[selectedStrategy];

  const currentMetaName = override?.name || customMeta?.name || frozenMeta?.name || 'Strategy';
  const currentMetaDesc = override?.description || customMeta?.description || frozenMeta?.description || '';

  // Filter out archived/deleted strategies and admin disabled strategies
  const strategyKeys = (Object.keys(STRATEGY_METAS) as StrategyId[]).filter((id) => {
    if (archivedStrategies.includes(id)) return false;
    return strategyOverrides[id]?.isEnabled !== false;
  });

  const activeCustomStrategies = customStrategies.filter(
    (s) => s.isActive && !archivedStrategies.includes(s.id)
  );

  // Retrieve modal state
  const [isRetrieveModalOpen, setIsRetrieveModalOpen] = useState(false);

  // User-configurable Runs per Cycle
  const defaultLimit = override?.maxRunsPerCycle
    ? override.maxRunsPerCycle
    : customMeta
    ? customMeta.maxRunsPerCycle
    : typeof frozenMeta?.cycleLimit === 'number'
    ? frozenMeta.cycleLimit
    : 10;
  const currentMaxRuns = runtimeState.maxRunsPerCycle || defaultLimit;
  const isMatches = selectedStrategy === 'matches';
  const isMartingaleOn = isMatches ? (runtimeState.martingaleEnabled ?? false) : false;

  const [isCustomRunInput, setIsCustomRunInput] = useState(false);
  const [customRunVal, setCustomRunVal] = useState(String(currentMaxRuns));

  const handleRunSelectChange = (val: string) => {
    if (val === 'custom') {
      setIsCustomRunInput(true);
    } else {
      setIsCustomRunInput(false);
      const parsed = parseInt(val, 10);
      if (onUpdateRunsPerCycle && Number.isFinite(parsed)) {
        onUpdateRunsPerCycle(parsed);
      }
    }
  };

  const handleCustomRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customRunVal, 10);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 500) {
      if (onUpdateRunsPerCycle) onUpdateRunsPerCycle(parsed);
      setIsCustomRunInput(false);
    }
  };

  // Cycle limits and progress calculations
  const cycleNet = runtimeState.cycleProfit ?? 0;
  const lastCycleNet = runtimeState.lastCycleProfit;
  const cycleTp = riskConfig?.takeProfit ?? 10;
  const cycleSl = riskConfig?.stopLoss ?? 20;
  const cycleRunsProgress = Math.min(100, Math.round((runtimeState.cycleTradeIndex / currentMaxRuns) * 100));

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-xl transition-colors ${
        isBright
          ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200/60'
          : 'bg-[#0b1120]/95 border-slate-800 text-slate-100 shadow-black/40'
      }`}
    >
      {/* Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-3 mb-4 pb-3.5 border-b ${
          isBright ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border flex items-center justify-center ${
              isBright
                ? 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-sm'
                : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
            }`}
          >
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                className={`text-sm font-bold tracking-wider uppercase font-mono ${
                  isBright ? 'text-slate-950' : 'text-white'
                }`}
              >
                Strategy Intelligence Engine
              </h2>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${
                  isBright
                    ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm shadow-cyan-500/15'
                }`}
              >
                {customMeta ? 'CUSTOM RULE' : override?.name ? 'CUSTOMIZED' : 'QUANTITATIVE'}
              </span>
            </div>
            <p className={`text-xs ${isBright ? 'text-slate-500' : 'text-slate-400'}`}>
              Select active entry model, manage strategies, and configure cycle-level parameters
            </p>
          </div>
        </div>

        {/* User Configurable Cycle & Runs Controls + Retrieve Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Retrieve Strategies Button (if any archived or for easy management) */}
          {archivedStrategies.length > 0 && (
            <button
              type="button"
              onClick={() => setIsRetrieveModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
                isBright
                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 shadow-sm'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-400/40 shadow-md shadow-amber-500/10'
              }`}
              title="View and restore deleted strategies"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Retrieve Strategies ({archivedStrategies.length})</span>
            </button>
          )}

          {/* User-configurable Runs per cycle */}
          {executionMode === 'automatic' && (!isCustomRunInput ? (
            <div
              className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl text-xs font-mono ${
                isBright ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <div className="flex items-center gap-1.5">
                <span className={isBright ? 'text-slate-500' : 'text-slate-400'}>Cycle Runs:</span>
                <select
                  value={[1, 2, 3, 5, 10, 20, 50].includes(currentMaxRuns) ? currentMaxRuns : 'custom'}
                  onChange={(e) => handleRunSelectChange(e.target.value)}
                  className={`bg-transparent font-bold focus:outline-none cursor-pointer ${
                    isBright ? 'text-slate-900' : 'text-cyan-300'
                  }`}
                >
                  <option value={1} className="bg-slate-950 text-white">1 run</option>
                  <option value={2} className="bg-slate-950 text-white">2 runs</option>
                  <option value={3} className="bg-slate-950 text-white">3 runs</option>
                  <option value={5} className="bg-slate-950 text-white">5 runs</option>
                  <option value={10} className="bg-slate-950 text-white">10 runs</option>
                  <option value={20} className="bg-slate-950 text-white">20 runs</option>
                  <option value={50} className="bg-slate-950 text-white">50 runs</option>
                  <option value="custom" className="bg-slate-950 text-white">
                    {[1, 2, 3, 5, 10, 20, 50].includes(currentMaxRuns) ? 'Custom...' : `Custom (${currentMaxRuns})`}
                  </option>
                </select>
              </div>
              <span className="text-[10px] text-cyan-400 font-bold">
                ({runtimeState.cycleTradeIndex}/{currentMaxRuns})
              </span>
            </div>
          ) : (
            <form onSubmit={handleCustomRunSubmit} className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={500}
                value={customRunVal}
                onChange={(e) => setCustomRunVal(e.target.value)}
                autoFocus
                className="w-16 py-1 px-2 rounded-lg bg-slate-950 border border-cyan-400 text-cyan-300 text-xs font-mono font-bold text-center focus:outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-bold"
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => setIsCustomRunInput(false)}
                className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 font-mono text-xs"
              >
                Cancel
              </button>
            </form>
          ))}

          <button
            type="button"
            onClick={onResetCycle}
            title="Reset active strategy cycle and initial stake"
            className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition-colors ${
              isBright
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline font-mono">Reset Cycle</span>
          </button>
        </div>
      </div>

      {/* Strategy Selector Pills (Core + Overrides + Custom) with Delete Actions */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {strategyKeys.map((id) => {
            const meta = STRATEGY_METAS[id];
            const ov = strategyOverrides[id];
            const displayName = ov?.name || meta.name;
            const isSelected = selectedStrategy === id;

            return (
              <div
                key={id}
                className={`group relative flex items-center rounded-xl border transition-all ${
                  isSelected
                    ? isBright
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-600/25 ring-2 ring-cyan-500/20'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black border-cyan-400 shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                    : isBright
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                    : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectStrategy(id)}
                  className="px-3 py-2 text-xs font-mono font-semibold flex items-center gap-1.5 focus:outline-none"
                >
                  <span>{displayName}</span>
                  {meta.id === 'digit_frequency_switch' && (
                    <Sparkles className={`w-3 h-3 ${isSelected ? 'text-slate-950' : 'text-cyan-400'}`} />
                  )}
                </button>

                {/* Delete / Archive Strategy Button */}
                {strategyKeys.length > 1 && onDeleteStrategy && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStrategy(id);
                    }}
                    title={`Delete / Archive "${displayName}"`}
                    className={`pr-2 pl-0.5 py-1 text-slate-400 hover:text-rose-400 opacity-60 hover:opacity-100 transition-opacity ${
                      isSelected ? 'text-slate-950 hover:text-rose-900' : ''
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Custom Admin Strategies */}
          {activeCustomStrategies.map((custom) => {
            const isSelected = selectedStrategy === custom.id;
            return (
              <div
                key={custom.id}
                className={`group relative flex items-center rounded-xl border transition-all ${
                  isSelected
                    ? isBright
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-md ring-2 ring-cyan-500/20'
                      : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black border-cyan-400 shadow-lg shadow-cyan-500/25'
                    : isBright
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
                    : 'bg-slate-900 text-amber-300 hover:text-white hover:bg-slate-800 border-amber-500/35'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectStrategy(custom.id)}
                  className="px-3 py-2 text-xs font-mono font-semibold flex items-center gap-1.5 focus:outline-none"
                >
                  <Wrench className="w-3 h-3" />
                  <span>{custom.name}</span>
                </button>

                {onDeleteStrategy && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteStrategy(custom.id);
                    }}
                    title={`Delete / Archive "${custom.name}"`}
                    className="pr-2 pl-0.5 py-1 text-slate-400 hover:text-rose-400 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Strategy Details & Cycle-Level Risk Card */}
      <div
        className={`mb-4 p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-mono ${
          isBright ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/80 border-slate-800'
        }`}
      >
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-cyan-400">{currentMetaName}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                isBright ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {customMeta ? customMeta.contractType : frozenMeta?.contractType}
            </span>
          </div>
          <p className={`text-xs ${isBright ? 'text-slate-600' : 'text-slate-400'}`}>
            {currentMetaDesc}
          </p>

          {/* Cycle Progress Bar */}
          <div className="pt-2 max-w-md">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className={isBright ? 'text-slate-600' : 'text-slate-400'}>
                Cycle Progress ({runtimeState.cycleTradeIndex}/{currentMaxRuns} runs):
              </span>
              <span className="font-bold text-cyan-400">{cycleRunsProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full overflow-hidden bg-slate-950 p-0.5 border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${cycleRunsProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cycle Limits Telemetry Box (TP / SL / Cycle P/L) */}
        <div
          className={`p-3 rounded-xl border flex flex-col gap-2 min-w-[240px] text-xs ${
            isBright ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-1.5 border-slate-800/60">
            <span className="text-[11px] text-slate-400">Cycle Net P/L:</span>
            <span
              className={`font-black text-sm flex items-center gap-1 ${
                cycleNet > 0 ? 'text-emerald-400' : cycleNet < 0 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {cycleNet > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : cycleNet < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
              {cycleNet >= 0 ? '+' : ''}${cycleNet.toFixed(2)}
            </span>
          </div>
          {lastCycleNet !== undefined && (
            <div className="flex items-center justify-between text-[11px] border-b border-slate-800/60 pb-1.5">
              <span className="text-slate-400">Last Completed Cycle:</span>
              <span className={`font-bold ${lastCycleNet > 0 ? 'text-emerald-400' : lastCycleNet < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {lastCycleNet >= 0 ? '+' : '-'}${Math.abs(lastCycleNet).toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Take Profit:</span>
            <span className="font-bold text-emerald-400">+${cycleTp.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Stop Loss:</span>
            <span className="font-bold text-rose-400">-${cycleSl.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* MATCHES STRATEGY USER CONTROLS (MARTINGALE OPTION) */}
      {isMatches && (
        <div
          className={`mb-4 p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono ${
            isBright ? 'bg-cyan-50/70 border-cyan-200' : 'bg-cyan-950/20 border-cyan-500/30'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-400 uppercase">Matches Execution Mode:</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-400/30 font-bold">
                Standard Mathematical Strike
              </span>
            </div>
            <p className={`text-[11px] ${isBright ? 'text-slate-600' : 'text-slate-400'}`}>
              Triggers when live cursor strikes Green digit (Top #1) with top frequency diff ≤ 0.30%, predicting Blue digit (Top #2).
            </p>
          </div>

          {/* Martingale Toggle for Matches */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className={`text-[11px] ${isBright ? 'text-slate-700' : 'text-slate-300'}`}>
              Martingale:
            </span>
            <button
              type="button"
              onClick={() => onToggleMatchesMartingale && onToggleMatchesMartingale(!isMartingaleOn)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border font-bold transition-all ${
                isMartingaleOn
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 border-cyan-400 shadow-sm'
                  : isBright
                  ? 'bg-white text-slate-600 border-slate-300'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              {isMartingaleOn ? <ToggleRight className="w-4 h-4 text-slate-950" /> : <ToggleLeft className="w-4 h-4 text-slate-500" />}
              <span>{isMartingaleOn ? 'ENABLED (2x)' : 'FLAT STAKE'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Signal Banner */}
      {activeSignal ? (
        <div className="mb-4 p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/80 via-slate-950/90 to-cyan-950/80 border-2 border-emerald-400/80 shadow-xl shadow-emerald-500/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 flex items-center justify-center font-black">
              <Zap className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-emerald-300">
                  ACTIVE ENTRY SIGNAL DETECTED
                </span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500 text-slate-950 font-mono text-[10px] font-black animate-bounce">
                  STRIKE READY
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono mt-0.5">{activeSignal.reason}</p>
            </div>
          </div>
          <div className="text-right font-mono self-end sm:self-center shrink-0">
            <div className="text-[10px] text-slate-400">Target Contract</div>
            <div className="text-sm font-black text-emerald-400">
              {activeSignal.contractType} {activeSignal.barrier}
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`mb-4 p-3 rounded-xl border flex items-center justify-between text-xs font-mono ${
            isBright ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-900/50 border-slate-800/80 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse shrink-0" />
            <span>Scanning live incoming digits for {currentMetaName} mathematical entry criteria...</span>
          </div>
          <span className="text-[11px] text-cyan-400 hidden sm:inline">1-Tick Duration</span>
        </div>
      )}

      {/* Strategy Rule Checklist & Conditions */}
      <div
        className={`p-3.5 rounded-xl border ${
          isBright ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/40 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/60 text-xs font-mono">
          <span className="font-bold flex items-center gap-1.5 text-cyan-400">
            <Info className="w-3.5 h-3.5" />
            <span>Live Rule Validation Checklist</span>
          </span>
          <span className={isBright ? 'text-slate-600' : 'text-slate-400'}>{conditionStatus.ruleDescription}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {conditionStatus.items.map((item, index) => (
            <div
              key={index}
              className={`p-2.5 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                item.met
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : isBright
                  ? 'bg-white border-slate-200 text-slate-600'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
              }`}
            >
              {item.met ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 overflow-hidden">
                <div className={`font-semibold ${item.met ? 'text-emerald-300' : isBright ? 'text-slate-800' : 'text-slate-300'}`}>
                  {item.label}
                </div>
                {item.detail && <div className="text-[10px] opacity-80 truncate">{item.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Retrieve / Restore Deleted Strategies */}
      {isRetrieveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`max-w-md w-full rounded-2xl border p-5 shadow-2xl space-y-4 ${
              isBright ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0f172a] border-slate-700 text-white'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm uppercase font-mono">Retrieved Strategies</h3>
                  <p className="text-xs text-slate-400">Restore archived strategies to your active terminal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRetrieveModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {archivedStrategies.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-mono">
                  No strategies are currently archived. All strategies are active.
                </div>
              ) : (
                archivedStrategies.map((archivedId) => {
                  const meta = STRATEGY_METAS[archivedId as StrategyId];
                  const custom = customStrategies.find((c) => c.id === archivedId);
                  const ov = strategyOverrides[archivedId];
                  const title = ov?.name || custom?.name || meta?.name || archivedId;
                  const contract = custom?.contractType || meta?.contractType || 'CONTRACT';

                  return (
                    <div
                      key={archivedId}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between gap-3 font-mono"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {contract}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {ov?.description || custom?.description || meta?.description || ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (onRestoreStrategy) onRestoreStrategy(archivedId);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-all shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Restore</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsRetrieveModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
