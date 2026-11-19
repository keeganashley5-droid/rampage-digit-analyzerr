import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ListFilter,
  Monitor,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { ContractTrade } from '../types/deriv';

interface TradeMonitorProps {
  activeTrades: ContractTrade[];
  settledTrades: ContractTrade[];
  onClearHistory: () => void;
}

export const TradeMonitor: React.FC<TradeMonitorProps> = ({
  activeTrades,
  settledTrades,
  onClearHistory,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'open' | 'settled'>('open');

  // Auto pop-up Live Trade Monitor when contracts are purchased
  useEffect(() => {
    if (activeTrades.length > 0) {
      setIsExpanded(true);
      setActiveTab('open');
    }
  }, [activeTrades.length]);

  const exportCSV = () => {
    const all = [...activeTrades, ...settledTrades];
    if (all.length === 0) return;

    const headers = [
      'ContractID',
      'Time',
      'Market',
      'Strategy',
      'ContractType',
      'Barrier',
      'Stake',
      'Payout',
      'EntryQuote',
      'EntryDigit',
      'ExitQuote',
      'ExitDigit',
      'Status',
      'Profit',
      'Mode',
      'Account',
    ];

    const rows = all.map((t) => [
      t.contractId,
      new Date(t.startTime).toISOString(),
      t.symbol,
      t.strategyName,
      t.contractType,
      t.barrier,
      t.stake,
      t.payout,
      t.entryTickQuote,
      t.entryDigit,
      t.exitTickQuote ?? '',
      t.exitDigit ?? '',
      t.status,
      t.profit,
      t.isAutomated ? 'Auto' : 'Manual',
      t.accountType,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rampage_trade_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[#0f172a]/95 border border-slate-800/90 rounded-xl shadow-2xl overflow-hidden transition-all duration-200">
      {/* Collapsible Header Banner */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Monitor className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
              Live Trade Monitor
            </h2>
            {/* Open Trade Count Badge (Always visible, even when collapsed!) */}
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${
                activeTrades.length > 0
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeTrades.length > 0 ? 'bg-cyan-400' : 'bg-slate-500'}`} />
              {activeTrades.length} Open Contract{activeTrades.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {settledTrades.length} Settled Records
          </span>
          <button
            type="button"
            className="p-1 text-slate-400 hover:text-white"
            aria-label={isExpanded ? 'Collapse Trade Monitor' : 'Expand Trade Monitor'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Sub-header tabs and actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('open')}
                className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'open'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Active Open ({activeTrades.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settled')}
                className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'settled'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Settled History ({settledTrades.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportCSV}
                disabled={activeTrades.length === 0 && settledTrades.length === 0}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono flex items-center gap-1 disabled:opacity-40 transition-colors"
                title="Export trade history to CSV"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
              {settledTrades.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 text-xs font-mono flex items-center gap-1 transition-colors"
                  title="Clear settled trades"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Active Trades Table */}
          {activeTab === 'open' && (
            <div>
              {activeTrades.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800/80 bg-slate-950/30">
                  <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-slate-300">No Open Contracts Currently</div>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    When trades execute manually or automatically on valid strategy triggers, 1-tick monitoring will display here live.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Contract ID</th>
                        <th className="py-2.5 px-3">Market</th>
                        <th className="py-2.5 px-3">Strategy</th>
                        <th className="py-2.5 px-3">Contract Type</th>
                        <th className="py-2.5 px-3">Barrier</th>
                        <th className="py-2.5 px-3">Stake</th>
                        <th className="py-2.5 px-3">Est. Payout</th>
                        <th className="py-2.5 px-3">Entry Quote</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {activeTrades.map((trade) => (
                        <tr key={trade.id} className="bg-slate-900/40 hover:bg-slate-900/80">
                          <td className="py-2.5 px-3 font-bold text-cyan-400">
                            #{trade.contractId}
                          </td>
                          <td className="py-2.5 px-3 text-white font-semibold">
                            {trade.symbol}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {trade.strategyName}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              {trade.contractType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-white font-bold">
                            {trade.barrier}
                          </td>
                          <td className="py-2.5 px-3 text-white">
                            ${trade.stake.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">
                            ${trade.payout.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {trade.entryTickQuote} [{trade.entryDigit}]
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Monitoring</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Settled History Table */}
          {activeTab === 'settled' && (
            <div>
              {settledTrades.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-800/80 bg-slate-950/30">
                  <ListFilter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <div className="text-sm font-medium text-slate-300">No Settled Trades Yet</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Your settled contract results and P/L records will be logged here and saved persistently.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Time</th>
                        <th className="py-2.5 px-3">Contract ID</th>
                        <th className="py-2.5 px-3">Market</th>
                        <th className="py-2.5 px-3">Strategy</th>
                        <th className="py-2.5 px-3">Contract</th>
                        <th className="py-2.5 px-3">Entry &rarr; Exit</th>
                        <th className="py-2.5 px-3">Stake</th>
                        <th className="py-2.5 px-3">Result</th>
                        <th className="py-2.5 px-3 text-right">Profit / Loss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {settledTrades.map((trade) => {
                        const isWon = trade.status === 'won';
                        return (
                          <tr key={trade.id} className="bg-slate-900/30 hover:bg-slate-900/60">
                            <td className="py-2 px-3 text-slate-400 text-[11px]">
                              {new Date(trade.startTime).toLocaleTimeString()}
                            </td>
                            <td className="py-2 px-3 text-slate-300 font-semibold">
                              #{trade.contractId}
                            </td>
                            <td className="py-2 px-3 text-white">
                              {trade.symbol}
                            </td>
                            <td className="py-2 px-3 text-slate-300">
                              {trade.strategyName}
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-[11px] text-slate-300">
                                {trade.contractType} {trade.barrier}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-400">
                              [{trade.entryDigit}] &rarr; [{trade.exitDigit ?? '-'}]
                            </td>
                            <td className="py-2 px-3 text-slate-300">
                              ${trade.stake.toFixed(2)}
                            </td>
                            <td className="py-2 px-3">
                              {isWon ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                  <CheckCircle className="w-3 h-3" /> WON
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                                  <XCircle className="w-3 h-3" /> LOST
                                </span>
                              )}
                            </td>
                            <td
                              className={`py-2 px-3 text-right font-bold text-sm ${
                                isWon ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
