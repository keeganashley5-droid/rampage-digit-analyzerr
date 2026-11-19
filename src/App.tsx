import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DerivOAuthAccount } from './services/derivOAuth';
import { getDerivSession, getDerivAccounts, logoutDerivSession } from './services/derivOAuth';
import { Header } from './components/Header';
import { DigitDistribution } from './components/DigitDistribution';
import { DirectTrading, type DirectTradeConfig } from './components/DirectTrading';
import { StrategyCenter } from './components/StrategyCenter';
import { ExecutionControls } from './components/ExecutionControls';
import { TradeMonitor } from './components/TradeMonitor';
import { AuthModal } from './components/AuthModal';
import { ThemeCustomizerModal } from './components/ThemeCustomizerModal';
import { TickStreamTicker } from './components/TickStreamTicker';
import { LandingPage } from './components/LandingPage';
import { SplashLoader } from './components/SplashLoader';
import {
  AccountMode,
  ContractTrade,
  CustomStrategy,
  DistributionAnalysis,
  MarketTick,
  MonetizationConfig,
  RampageThemeConfig,
  RiskConfig,
  RiskSessionStats,
  StrategyId,
  StrategyOverride,
  StrategyRuntimeState,
  StrategySignal,
  SYNTHETIC_MARKETS,
  UserAccount,
} from './types/deriv';
import { calculateDistribution } from './engine/digits';
import {
  createInitialRuntimeState,
  evaluateStrategy,
  STRATEGY_METAS,
} from './engine/strategies';
import { ConnectionStatus, derivWs } from './services/derivWs';
import { executionEngine } from './engine/executionEngine';
import { StorageService } from './services/storage';
import { AlertCircle, CheckCircle2, ShieldAlert, Zap, Square } from 'lucide-react';

export default function App() {
  // Navigation View: landing page or live terminal
  const [currentView, setCurrentView] = useState<'landing' | 'terminal'>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('autostart') === '1' || urlParams.get('view') === 'terminal') {
        return 'terminal';
      }
    } catch {
      // fallback
    }
    return 'landing';
  });

  // Persistent Settings
  const [selectedMarket, setSelectedMarket] = useState<string>(() => StorageService.getSelectedMarket());
  const [tickWindow, setTickWindow] = useState<number>(() => StorageService.getTickWindow());
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>(() => StorageService.getSelectedStrategy() as StrategyId);
  const [accountMode, setAccountMode] = useState<AccountMode>('demo');
  const [userAccount, setUserAccount] = useState<UserAccount | null>(null);
  const [oauthAccounts, setOauthAccounts] = useState<DerivOAuthAccount[]>([]);
  // Monetization Config (Admin-only)
  const [monetizationConfig, setMonetizationConfig] = useState<MonetizationConfig>(() => StorageService.getMonetizationConfig());

  // Rampage Visual Theme Collections, Contrast & Gradients
  const [themeConfig, setThemeConfig] = useState<RampageThemeConfig>(() => StorageService.getThemeConfig());
  const [isThemeModalOpen, setIsThemeModalOpen] = useState<boolean>(false);

  const handleUpdateThemeConfig = useCallback((updates: Partial<RampageThemeConfig>) => {
    const next = StorageService.saveThemeConfig(updates);
    setThemeConfig({ ...next });
  }, []);

  // Connection & Data
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [ticks, setTicks] = useState<MarketTick[]>([]);
  const [currentTick, setCurrentTick] = useState<MarketTick | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Classy Splash Introductory Session
  const [showSplash, setShowSplash] = useState<boolean>(true);


  // Admin Strategy Overrides (Modify existing built-in strategies)
  const [strategyOverrides, setStrategyOverrides] = useState<Record<string, StrategyOverride>>(() =>
    StorageService.getStrategyOverrides()
  );
  const strategyOverridesRef = useRef(strategyOverrides);
  strategyOverridesRef.current = strategyOverrides;

  // Custom Strategies created via Visual Rule Builder
  const [customStrategies, setCustomStrategies] = useState<CustomStrategy[]>(() =>
    StorageService.getCustomStrategies()
  );

  // Matches specific configurable settings
  const [matchesConfig, setMatchesConfig] = useState(() => StorageService.getMatchesConfig());
  const [strategyCycleRuns, setStrategyCycleRuns] = useState<Record<string, number>>(() =>
    StorageService.getStrategyCycleRuns()
  );

  // Keep independent strategy runtime states for Demo and Real accounts.
  const createRuntimeMapForMode = (mode: AccountMode): Map<StrategyId, StrategyRuntimeState> => {
    const map = new Map<StrategyId, StrategyRuntimeState>();
    const initialStake = StorageService.getRiskConfig(mode).initialStake;
    const storedCycleRuns = StorageService.getStrategyCycleRuns();
    const storedMatches = StorageService.getMatchesConfig();
    const storedOverrides = StorageService.getStrategyOverrides();

    (Object.keys(STRATEGY_METAS) as StrategyId[]).forEach((id) => {
      const s = createInitialRuntimeState(id, initialStake);
      const ov = storedOverrides[id];
      if (ov?.maxRunsPerCycle) s.maxRunsPerCycle = ov.maxRunsPerCycle;
      else if (storedCycleRuns[id]) s.maxRunsPerCycle = storedCycleRuns[id];

      if (id === 'matches') {
        s.martingaleEnabled = typeof ov?.martingaleEnabled === 'boolean' ? ov.martingaleEnabled : storedMatches.martingaleEnabled;
        s.maxRunsPerCycle = ov?.maxRunsPerCycle || storedMatches.maxRuns;
      }
      map.set(id, s);
    });

    const customs = StorageService.getCustomStrategies();
    customs.forEach((c) => {
      const s = createInitialRuntimeState(c.id, initialStake);
      s.maxRunsPerCycle = c.maxRunsPerCycle || 10;
      map.set(c.id, s);
    });

    return map;
  };

  const [runtimeMapsByMode, setRuntimeMapsByMode] = useState<Record<AccountMode, Map<StrategyId, StrategyRuntimeState>>>(() => ({
    demo: createRuntimeMapForMode('demo'),
    real: createRuntimeMapForMode('real'),
  }));
  const runtimeStateMap = runtimeMapsByMode[accountMode];
  const [activeSignal, setActiveSignal] = useState<StrategySignal | null>(null);

  // Trades & Risk
  const [activeTrades, setActiveTrades] = useState<ContractTrade[]>(() => StorageService.getActiveTrades());
  const [settledTrades, setSettledTrades] = useState<ContractTrade[]>(() =>
    StorageService.getTrades().filter((t) => t.status === 'won' || t.status === 'lost')
  );
  const [riskConfig, setRiskConfig] = useState<RiskConfig>(() => executionEngine.getRiskConfig());
  const [riskSession, setRiskSession] = useState<RiskSessionStats>(() => executionEngine.getRiskSession());

  // Automated Execution & Next-Tick Execution Engine
  const [isAutomated, setIsAutomated] = useState<boolean>(false);
  const [selectedExecutionMode, setSelectedExecutionMode] = useState<'manual' | 'automatic'>('manual');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [armedSignal, setArmedSignal] = useState<StrategySignal | null>(null);
  const armedSignalRef = useRef<StrategySignal | null>(null);
  armedSignalRef.current = armedSignal;
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const realTradeConfirmedRef = useRef(false);

  // Refs for callbacks to avoid stale closures in listeners
  const ticksRef = useRef<MarketTick[]>(ticks);
  ticksRef.current = ticks;
  const runtimeMapsByModeRef = useRef(runtimeMapsByMode);
  runtimeMapsByModeRef.current = runtimeMapsByMode;

  const updateRuntimeMapForMode = (
    mode: AccountMode,
    updater: (map: Map<StrategyId, StrategyRuntimeState>) => void
  ) => {
    const nextMap = new Map(runtimeMapsByModeRef.current[mode]);
    updater(nextMap);
    const nextMaps = { ...runtimeMapsByModeRef.current, [mode]: nextMap };
    runtimeMapsByModeRef.current = nextMaps;
    setRuntimeMapsByMode(nextMaps);
  };
  const isAutomatedRef = useRef(isAutomated);
  isAutomatedRef.current = isAutomated;
  const activeSignalRef = useRef(activeSignal);
  activeSignalRef.current = activeSignal;
  const isExecutingRef = useRef(isExecuting);
  isExecutingRef.current = isExecuting;
  const selectedStrategyRef = useRef(selectedStrategy);
  selectedStrategyRef.current = selectedStrategy;
  const selectedMarketRef = useRef(selectedMarket);
  selectedMarketRef.current = selectedMarket;
  const accountRef = useRef(userAccount);
  accountRef.current = userAccount;
  const accountModeRef = useRef(accountMode);
  accountModeRef.current = accountMode;
  const tickWindowRef = useRef(tickWindow);
  tickWindowRef.current = tickWindow;

  const currentTickRef = useRef<MarketTick | null>(currentTick);
  currentTickRef.current = currentTick;
  const customStrategiesRef = useRef(customStrategies);
  customStrategiesRef.current = customStrategies;

  // Calculate digit distribution
  const distribution: DistributionAnalysis = useMemo(() => {
    return calculateDistribution(ticks);
  }, [ticks]);


  // Current strategy runtime & condition status
  const currentRuntimeState = useMemo(() => {
    return runtimeStateMap.get(selectedStrategy) || createInitialRuntimeState(selectedStrategy, riskConfig.initialStake);
  }, [runtimeStateMap, selectedStrategy, riskConfig.initialStake]);

  const conditionStatus = useMemo(() => {
    if (!currentTick) {
      return { ruleDescription: 'Awaiting market ticks...', items: [] };
    }
    const evalRes = evaluateStrategy(
      selectedStrategy,
      distribution,
      currentTick,
      currentRuntimeState,
      selectedMarket,
      customStrategies,
      strategyOverrides
    );
    return evalRes.conditionStatus;
  }, [selectedStrategy, distribution, currentTick, currentRuntimeState, selectedMarket, customStrategies, strategyOverrides]);

  // Stable Toast notification helper
  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ message, type });
    window.setTimeout(() => setNotification(null), 4500);
  }, []);

  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  // Stable Handle Trade Execution
  const handleExecuteTrade = useCallback(async (overrideSignal?: StrategySignal, automatedExecution = false) => {
    const tick = currentTickRef.current;
    const signalToUse =
      overrideSignal ||
      activeSignalRef.current || {
        strategyId: selectedStrategyRef.current,
        strategyName: strategyOverridesRef.current[selectedStrategyRef.current]?.name || STRATEGY_METAS[selectedStrategyRef.current].name,
        symbol: selectedMarketRef.current,
        contractType: STRATEGY_METAS[selectedStrategyRef.current].contractType,
        barrier: typeof strategyOverridesRef.current[selectedStrategyRef.current]?.defaultBarrier === 'number'
          ? strategyOverridesRef.current[selectedStrategyRef.current].defaultBarrier!
          : STRATEGY_METAS[selectedStrategyRef.current].defaultBarrier,
        triggerDigit: tick ? tick.digit : 0,
        reason: 'Manual trade execution triggered by user',
        timestamp: Date.now(),
      };

    const executionMode = accountModeRef.current;
    const currRuntime = runtimeMapsByModeRef.current[executionMode].get(signalToUse.strategyId) ||
      createInitialRuntimeState(signalToUse.strategyId, executionEngine.getRiskConfig(executionMode).initialStake);

    if (
      accountModeRef.current === 'real' &&
      accountRef.current &&
      !accountRef.current.isVirtual &&
      !realTradeConfirmedRef.current
    ) {
      const confirmed = window.confirm(
        'FIRST REAL PURCHASE CONFIRMATION\n\nYou are about to allow Rampage Terminal to place a REAL MONEY trade using your Deriv account.\n\nThis purchase can result in financial loss. Do you want to proceed?'
      );
      if (!confirmed) {
        if (automatedExecution) {
          setIsAutomated(false);
          isAutomatedRef.current = false;
          setArmedSignal(null);
          armedSignalRef.current = null;
        }
        showToastRef.current(automatedExecution ? 'First Real purchase cancelled. Automation stopped.' : 'Real purchase cancelled.', 'info');
        return;
      }
    }

    setIsExecuting(true);
    const res = await executionEngine.executeTrade({
      signal: signalToUse,
      runtimeState: currRuntime,
      account: accountRef.current,
      accountMode: executionMode,
      isAutomated: automatedExecution,
      currentTickQuote: tick?.quote || 0,
      currentDigit: tick?.digit || 0,
    });
    setIsExecuting(false);

    if (res.success && res.trade) {
      if (accountModeRef.current === 'real' && accountRef.current && !accountRef.current.isVirtual) {
        realTradeConfirmedRef.current = true;
      }
      setActiveTrades((prev) => [res.trade!, ...prev.filter((t) => t.id !== res.trade!.id)]);
      showToastRef.current(`Trade placed: ${res.trade.contractType} ${res.trade.barrier} (Stake: $${res.trade.stake.toFixed(2)})`, 'success');
    } else if (res.error) {
      showToastRef.current(res.error, 'error');
    }
  }, []);

  const handleExecuteTradeRef = useRef(handleExecuteTrade);
  handleExecuteTradeRef.current = handleExecuteTrade;

  // Independent Direct Trading execution handler
  const handleDirectTrade = async (config: DirectTradeConfig, automated: boolean): Promise<boolean> => {
    const tick = currentTickRef.current;
    const account = accountRef.current;
    const mode = accountModeRef.current;

    if (!account || derivWs.status !== 'authorized') {
      showToastRef.current('Connect and authorize your Deriv account first.', 'error');
      return false;
    }

    if (!tick || tick.symbol !== selectedMarketRef.current) {
      showToastRef.current('Waiting for a current tick from the selected market.', 'error');
      return false;
    }

    if (riskConfig.isTradingPaused) {
      showToastRef.current('Trading is paused by the risk controls.', 'error');
      return false;
    }

    if (mode === 'real' && (account.isVirtual || !account.realTradingAuthorized)) {
      showToastRef.current('Real trading is locked. Authorize Real trading first.', 'error');
      return false;
    }

    if (mode === 'real' && !realTradeConfirmedRef.current) {
      const confirmed = window.confirm(
        'FIRST REAL PURCHASE CONFIRMATION\n\nYou are about to purchase a REAL MONEY Deriv contract.\n\nThis trade can result in financial loss. Continue?'
      );
      if (!confirmed) {
        showToastRef.current('Real purchase cancelled.', 'info');
        return false;
      }
    }

    setIsExecuting(true);
    try {
      const requiresBarrier = !['DIGITEVEN', 'DIGITODD'].includes(config.contractType);
      const result = await executionEngine.executeDirectTrade({
        symbol: selectedMarketRef.current,
        contractType: config.contractType,
        ...(requiresBarrier ? { barrier: config.barrier } : {}),
        stake: config.stake,
        duration: config.duration,
        durationUnit: config.durationUnit,
        account,
        accountMode: mode,
        isAutomated: automated,
        currentTickQuote: tick.quote,
        currentDigit: tick.digit,
      });

      if (!result.success || !result.trade) {
        showToastRef.current(result.error || 'Direct Trading purchase failed.', 'error');
        return false;
      }

      if (mode === 'real' && !account.isVirtual) {
        realTradeConfirmedRef.current = true;
      }

      setActiveTrades((previous) => [
        result.trade!,
        ...previous.filter((trade) => trade.id !== result.trade!.id),
      ]);
      showToastRef.current(
        `Direct contract purchased: ${result.trade.contractType} (Stake: $${result.trade.stake.toFixed(2)})`,
        'success'
      );
      return true;
    } catch (error) {
      showToastRef.current(
        error instanceof Error ? error.message : 'Direct Trading execution failed.',
        'error'
      );
      return false;
    } finally {
      setIsExecuting(false);
    }
  };
  // Initialize Deriv WebSocket client
  useEffect(() => {
    const unsubStatus = derivWs.onStatus((status, msg) => {
      setConnectionStatus(status);
      if (status === 'error' && msg) {
        showToast(msg, 'error');
      }
    });

    const unsubHistory = derivWs.onHistory((historyTicks) => {
      setIsLoadingHistory(false);
      setTicks(historyTicks);
      if (historyTicks.length > 0) {
        setCurrentTick(historyTicks[historyTicks.length - 1]);
      }
    });

    const unsubTick = derivWs.onTick((newTick) => {
      setCurrentTick(newTick);
      setTicks((prev) => {
        const next = [...prev, newTick];
        const maxWindow = tickWindowRef.current;
        return next.length > maxWindow ? next.slice(next.length - maxWindow) : next;
      });

      // 1. Next-Tick Execution Engine:
      // If a trade signal was armed on the PREVIOUS tick, execute contract purchase NOW on this new tick!
      if (armedSignalRef.current && isAutomatedRef.current && !isExecutingRef.current) {
        const signalToExecute = armedSignalRef.current;
        armedSignalRef.current = null;
        setArmedSignal(null);
        handleExecuteTradeRef.current(signalToExecute, true);
      }

      // 2. Evaluate active strategy on the current tick
      const currDist = calculateDistribution([...ticksRef.current, newTick]);
      const tickAccountMode = accountModeRef.current;
      const currState = runtimeMapsByModeRef.current[tickAccountMode].get(selectedStrategyRef.current) ||
        createInitialRuntimeState(selectedStrategyRef.current, executionEngine.getRiskConfig(tickAccountMode).initialStake);

      const evalRes = evaluateStrategy(
        selectedStrategyRef.current,
        currDist,
        newTick,
        currState,
        selectedMarketRef.current,
        customStrategiesRef.current,
        strategyOverridesRef.current
      );

      // Update only the runtime state belonging to the active account.
      updateRuntimeMapForMode(tickAccountMode, (nextMap) => {
        nextMap.set(selectedStrategyRef.current, evalRes.runtimeState);
      });

      setActiveSignal(evalRes.signal);

      // 3. If an entry condition fired on this tick T, ARM it for execution on the NEXT tick T+1
      if (evalRes.signal && isAutomatedRef.current) {
        armedSignalRef.current = evalRes.signal;
        setArmedSignal(evalRes.signal);
      }
    });

    const unsubSettlement = derivWs.onSettlement((settledTrade) => {
      const settlementMode: AccountMode = settledTrade.accountType === 'real' ? 'real' : 'demo';
      const settlementRuntimeMap = new Map(runtimeMapsByModeRef.current[settlementMode]);
      const res = executionEngine.processSettlement(settledTrade, settlementRuntimeMap);
      if (res) {
        // Apply settlement changes only to the account that purchased the contract.
        updateRuntimeMapForMode(settlementMode, (nextMap) => {
          settlementRuntimeMap.forEach((state, strategyId) => nextMap.set(strategyId, state));
        });

        setActiveTrades(StorageService.getActiveTrades());
        setSettledTrades(StorageService.getTrades().filter((t) => t.status === 'won' || t.status === 'lost'));
        if (settlementMode === accountModeRef.current) {
          setRiskSession({ ...executionEngine.getRiskSession(settlementMode) });
        }

        const isWon = res.updatedTrade.status === 'won';
        showToastRef.current(
          `Contract settled: ${res.updatedTrade.status.toUpperCase()} (${isWon ? '+' : ''}$${res.updatedTrade.profit.toFixed(2)})`,
          isWon ? 'success' : 'error'
        );
      }
    });

    const unsubBalance = derivWs.onBalance((balance, currency) => {
      setUserAccount((prev) => {
        if (!prev) return null;
        const updated = { ...prev, balance, currency };
        StorageService.saveAccount(updated);
        return updated;
      });
    });

    // Connect to Deriv and subscribe to chosen market
    derivWs.connect().then(() => {
      setIsLoadingHistory(true);
      derivWs.subscribeMarket(selectedMarket, tickWindowRef.current);
    });

    return () => {
      unsubStatus();
      unsubHistory();
      unsubTick();
      unsubSettlement();
      unsubBalance();
    };
  }, [selectedMarket]);

  // Market change handler
  const handleSelectMarket = (symbol: string) => {
    setSelectedMarket(symbol);
    StorageService.saveSelectedMarket(symbol);
    setTicks([]);
    setCurrentTick(null);
    setActiveSignal(null);
    setIsLoadingHistory(true);
    derivWs.subscribeMarket(symbol, tickWindow);
  };

  // Strategy change handler
  const handleSelectStrategy = (stratId: StrategyId) => {
    setSelectedStrategy(stratId);
    StorageService.saveSelectedStrategy(stratId);
    setActiveSignal(null);
  };

  // Tick window update
  const handleUpdateTickWindow = (newWindow: number) => {
    setTickWindow(newWindow);
    StorageService.saveTickWindow(newWindow);
    setIsLoadingHistory(true);
    derivWs.subscribeMarket(selectedMarket, newWindow);
  };

  // Resync History
  const handleRefreshHistory = () => {
    setIsLoadingHistory(true);
    derivWs.subscribeMarket(selectedMarket, tickWindow);
  };

  // Reset cycle for selected strategy
  const handleResetCycle = () => {
    const mode = accountModeRef.current;
    const targetMeta = customStrategies.find((c) => c.id === selectedStrategy);
    const stratName = targetMeta ? targetMeta.name : (STRATEGY_METAS[selectedStrategy]?.name || 'Strategy');
    updateRuntimeMapForMode(mode, (next) => {
      next.set(selectedStrategy, createInitialRuntimeState(selectedStrategy, executionEngine.getRiskConfig(mode).initialStake));
    });
    showToast('Cycle reset to initial stake', 'info');
  };

  // User-configurable runs per cycle
  const handleUpdateRunsPerCycle = (runs: number) => {
    const mode = accountModeRef.current;
    updateRuntimeMapForMode(mode, (next) => {
      const curr = next.get(selectedStrategy) || createInitialRuntimeState(selectedStrategy, executionEngine.getRiskConfig(mode).initialStake);
      curr.maxRunsPerCycle = runs;
      next.set(selectedStrategy, { ...curr });
    });

    const updatedRuns = { ...strategyCycleRuns, [selectedStrategy]: runs };
    setStrategyCycleRuns(updatedRuns);
    StorageService.saveStrategyCycleRuns(updatedRuns);

    if (selectedStrategy === 'matches') {
      const updatedMatches = { ...matchesConfig, maxRuns: runs };
      setMatchesConfig(updatedMatches);
      StorageService.saveMatchesConfig(updatedMatches);
    }

    showToast(`Runs per cycle set to ${runs}`, 'info');
  };

  // User toggle for Matches Martingale (ON/OFF)
  const handleToggleMatchesMartingale = (enabled: boolean) => {
    const mode = accountModeRef.current;
    updateRuntimeMapForMode(mode, (next) => {
      const curr = next.get('matches') || createInitialRuntimeState('matches', executionEngine.getRiskConfig(mode).initialStake);
      curr.martingaleEnabled = enabled;
      next.set('matches', { ...curr });
    });

    const updated = { ...matchesConfig, martingaleEnabled: enabled };
    setMatchesConfig(updated);
    StorageService.saveMatchesConfig(updated);
    showToast(enabled ? 'Matches Martingale enabled' : 'Matches Martingale disabled (Flat stake)', 'info');
  };

  // Risk configuration update
  const handleUpdateRiskConfig = (updates: Partial<RiskConfig>) => {
    const mode = accountModeRef.current;
    const updated = executionEngine.updateRiskConfig(updates, mode);
    setRiskConfig({ ...updated });
    setRiskSession({ ...executionEngine.getRiskSession(mode) });

    if (updates.takeProfit !== undefined) {
      showToast(
        updates.takeProfit > 0
          ? `Take Profit set to $${updates.takeProfit.toFixed(2)}`
          : 'Take Profit disabled (Unlimited run)',
        'info'
      );
    } else if (updates.stopLoss !== undefined) {
      showToast(
        updates.stopLoss > 0
          ? `Stop Loss set to $${updates.stopLoss.toFixed(2)}`
          : 'Stop Loss disabled (Unlimited floor)',
        'info'
      );
} else {
      showToast('Risk settings updated', 'info');
    }
  };



  // Reset session stats
  const handleResetSessionStats = () => {
    const mode = accountModeRef.current;
    executionEngine.resetRiskSession(userAccount?.balance || 1000, mode);
    setRiskSession({ ...executionEngine.getRiskSession(mode) });
    showToast('Session P/L stats reset to zero', 'info');
  };

  // Restore the server-side Deriv OAuth session without auto-connecting an account.
  useEffect(() => {
    let active = true;

    const restoreOAuthSession = async () => {
      try {
        const session = await getDerivSession();
        if (!active || !session.connected) return;

        const accounts = await getDerivAccounts();
        if (!active) return;

        setOauthAccounts(accounts);
        setCurrentView('terminal');
        const preferredAccount = accounts.find((item) => item.account_type === 'demo') || accounts[0];
        if (!preferredAccount) {
          showToast('No Deriv accounts were returned. Please sign in again.', 'error');
          return;
        }
        await handleAuthorizeOAuth(preferredAccount);
      } catch {
        // No active OAuth session is normal before the user logs in.
      }
    };

    const params = new URLSearchParams(window.location.search);
    if (params.has('authError')) {
      showToast('Deriv login could not be completed. Please try again.', 'error');
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    void restoreOAuthSession();

    return () => {
      active = false;
    };
  }, []);
  // Connect the Deriv account explicitly selected by the user.
  const handleAuthorizeOAuth = async (account: DerivOAuthAccount): Promise<boolean> => {
    realTradeConfirmedRef.current = false;

    try {
      const previousAccount = accountRef.current;
      const acc = await derivWs.authorizeOAuth(account);
      accountRef.current = acc;
      setUserAccount(acc);
      StorageService.saveAccount(acc, true);
      const nextMode: AccountMode = acc.isVirtual ? 'demo' : 'real';
      executionEngine.setAccountMode(nextMode);
      setAccountMode(nextMode);
      setRiskConfig({ ...executionEngine.getRiskConfig(nextMode) });
      setRiskSession({ ...executionEngine.getRiskSession(nextMode) });
      setCurrentView('terminal');
      const accountType = acc.isVirtual ? 'DEMO' : 'REAL';
      const accountChanged = previousAccount?.authType === 'oauth' && previousAccount.accountId !== acc.accountId;
      const action = accountChanged ? 'Switched to' : 'Connected to';
      showToast(`${action} Deriv ${accountType} account (${acc.loginid}). Loading live balance...`, 'success');
      return true;
    } catch (e: any) {
      showToast(e.message || 'Deriv account connection failed', 'error');
      return false;
    }
  };
  // Disconnect Account
  const handleDisconnectAccount = async () => {
  const wasOAuthAccount = accountRef.current?.authType === 'oauth';
  if (wasOAuthAccount) {
    try {
      await logoutDerivSession();
    } catch (error) {
      console.warn('Deriv logout failed:', error);
    }
  }

  setOauthAccounts([]);
  setIsAutomated(false);
  isAutomatedRef.current = false;

  setArmedSignal(null);
  armedSignalRef.current = null;

  setActiveSignal(null);
  activeSignalRef.current = null;

  realTradeConfirmedRef.current = false;
  accountRef.current = null;

  derivWs.disconnectAccount();
  setUserAccount(null);
  StorageService.saveAccount(null);

  showToast('Account disconnected. Automation stopped.', 'info');
};

  // Authorize Real Trading
  const handleAuthorizeRealTrading = (authorized: boolean) => {
    if (!authorized) realTradeConfirmedRef.current = false;
    setUserAccount((prev) => {
      if (!prev) return null;
      const updated = { ...prev, realTradingAuthorized: authorized };
      StorageService.saveAccount(updated, true);
      return updated;
    });
    showToast(
      authorized ? 'Real money trading authorized' : 'Real money trading locked for safety',
      authorized ? 'success' : 'info'
    );
  };


  // Automated Trading Toggle with clear user notification
  const handleToggleAutomated = (enabled: boolean) => {
    if (enabled && selectedExecutionMode !== 'automatic') {
      showToast('Select Automatic mode before starting automation.', 'info');
      return;
    }
    setIsAutomated(enabled);
    if (enabled) {
      const currentMeta = customStrategies.find((c) => c.id === selectedStrategy) || STRATEGY_METAS[selectedStrategy];
      const name = strategyOverrides[selectedStrategy]?.name || currentMeta?.name || 'Selected Strategy';
      showToast(`Automation active: ${name}`, 'success');
    } else {
      armedSignalRef.current = null;
      setArmedSignal(null);
      showToast('RAMPAGE AUTOMATION BOT STOPPED ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â Trade execution disarmed.', 'info');
    }
  };

  const isBrightTheme = themeConfig.appearance === 'light';

  const themeWrapperClass = isBrightTheme
    ? 'bg-[#F3EBDD] text-[#171717]'
    : 'bg-[#171717] text-[#F3EBDD]';

  const handleFinishSplash = useCallback(() => setShowSplash(false), []);

  return (
    <>
      {/* Classy Introductory Splash Loader (4.0s duration) */}
      {showSplash && <SplashLoader onFinish={handleFinishSplash} />}

      <div
        data-appearance={isBrightTheme ? "light" : "dark"}
        className={`min-h-screen flex flex-col font-sans transition-colors duration-200 selection:bg-[#B9572B] selection:text-[#F3EBDD] ${themeWrapperClass}`}
      >
        {/* Toast Notification Alert */}
        {notification && (
          <div className="fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-50 pointer-events-none">
            <div
              className={`w-full sm:w-auto sm:max-w-md px-4 py-3 rounded-xl shadow-2xl border flex items-start gap-2.5 text-xs font-mono font-medium break-words ${
                notification.type === 'success'
                  ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50'
                  : notification.type === 'error'
                  ? 'bg-rose-950/90 text-rose-200 border-rose-500/50'
                  : 'bg-sky-950/90 text-sky-200 border-sky-500/50'
              }`}
            >
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : notification.type === 'error' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
              )}
              <span className="min-w-0 flex-1 whitespace-normal break-words">{notification.message}</span>
            </div>
          </div>
        )}

        {currentView === 'landing' ? (
          <LandingPage
            onLaunchTerminal={() => setCurrentView('terminal')}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            affiliateUrl={monetizationConfig.affiliateUrl}
            userAccount={userAccount}
            theme={isBrightTheme ? 'bright' : 'dark'}
            onToggleTheme={() =>
              handleUpdateThemeConfig({
                appearance: isBrightTheme ? 'dark' : 'light',
              })
            }
          />
        ) : (
          <>
            {/* Main Terminal Header - Centered Rampage Digit Analyzer branding */}
            <Header
              connectionStatus={connectionStatus}
              selectedMarket={selectedMarket}
              onSelectMarket={handleSelectMarket}
              account={userAccount}
              accountMode={accountMode}
              onToggleAccountMode={async (mode) => {
                if (userAccount?.authType === 'oauth' && oauthAccounts.length > 0) {
                  const targetAccount = oauthAccounts.find(
                    (item) => (item.account_type === 'real' ? 'real' : 'demo') === mode
                  );
                  if (!targetAccount) {
                    showToast(`No ${mode.toUpperCase()} Deriv account is available.`, 'info');
                    return;
                  }
                  if (targetAccount.account_id === userAccount.accountId) return;
                  if (isExecuting) {
                    showToast('Wait for the current purchase request to finish before switching accounts.', 'info');
                    return;
                  }
                  if (activeTrades.some((trade) => trade.status === 'pending' || trade.status === 'open')) {
                    showToast('Wait for all open contracts to settle before switching accounts.', 'info');
                    return;
                  }
                  setIsAutomated(false);
                  isAutomatedRef.current = false;
                  setArmedSignal(null);
                  armedSignalRef.current = null;
                  setActiveSignal(null);
                  activeSignalRef.current = null;
                  await handleAuthorizeOAuth(targetAccount);
                  return;
                }
                if (mode === 'real' && (!userAccount || userAccount.isVirtual)) {
                  setIsAuthModalOpen(true);
                  showToast('Connect a Real Deriv account first', 'info');
                  return;
                }
                executionEngine.setAccountMode(mode);
                setAccountMode(mode);
                setRiskConfig({ ...executionEngine.getRiskConfig(mode) });
                setRiskSession({ ...executionEngine.getRiskSession(mode) });
              }}
              onOpenAuthModal={() => setIsAuthModalOpen(true)}


              currentTickQuote={currentTick?.quote}
              currentTickDigit={currentTick?.digit}
              isBrightAppearance={isBrightTheme}
              isAutomated={isAutomated}
            />

            {/* Main Content Dashboard */}
            <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 space-y-4">
              {/* Live Automation Bot Status Banner */}
              {isAutomated && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-emerald-950/80 border border-emerald-500/40 shadow-xl shadow-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-white tracking-wide">RAMPAGE AUTOMATION BOT IS RUNNING</span>
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                          NEXT-TICK EXECUTION
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Active Strategy:{' '}
                        <strong className="text-amber-300">
                          {strategyOverrides[selectedStrategy]?.name ||
                            customStrategies.find((c) => c.id === selectedStrategy)?.name ||
                            STRATEGY_METAS[selectedStrategy]?.name}
                        </strong>
                        {armedSignal ? (
                          <span className="ml-2 text-yellow-300 font-bold animate-pulse">
                            ÃƒÆ’Ã‚Â¢Ãƒâ€¦Ã‚Â¡Ãƒâ€šÃ‚Â¡ ENTRY TRIGGER CONFIRMED! PURCHASING ON NEXT TICK...
                          </span>
                        ) : (
                          <span className="ml-2 text-slate-400">
                            Monitoring tick stream for entry pattern...
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleAutomated(false)}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 transition-all shadow-md shadow-rose-600/20 shrink-0"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Stop Bot</span>
                  </button>
                </div>
              )}

              {/* Real Money Safety Warning Banner */}
              {accountMode === 'real' && (!userAccount || !userAccount.realTradingAuthorized) && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Real mode is selected, but real purchases are protected. Click Settings to authorize real money trading.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-xs"
                  >
                    Authorize
                  </button>
                </div>
              )}

              {/* Live Tick Stream Ticker */}
              <TickStreamTicker ticks={ticks} />

              {/* Digit Distribution Circles & Cursor */}
              <DigitDistribution
                distribution={distribution}
                currentTick={currentTick}
                tickWindow={tickWindow}
                onUpdateTickWindow={handleUpdateTickWindow}
                onRefreshHistory={handleRefreshHistory}
                isLoadingHistory={isLoadingHistory}
              />

              <DirectTrading
                distribution={distribution}
                currentTick={currentTick}
                initialStake={riskConfig.initialStake}
                canTrade={connectionStatus === 'authorized' && !!userAccount && !riskConfig.isTradingPaused && (accountMode !== 'real' || (!userAccount.isVirtual && userAccount.realTradingAuthorized))}
                connectionStatus={connectionStatus}
                accountLabel={userAccount ? `${userAccount.loginid} � ${accountMode.toUpperCase()}` : 'No account connected'}
                executionContextKey={`${accountMode}:${selectedMarket}:${userAccount?.loginid ?? 'none'}`}
                onExecute={handleDirectTrade}
              />
              {/* Strategy Center & Extensible Engine */}
              <StrategyCenter
                executionMode={selectedExecutionMode}
                selectedStrategy={selectedStrategy}
                onSelectStrategy={handleSelectStrategy}
                runtimeState={currentRuntimeState}
                isAutomated={isAutomated}
                conditionStatus={conditionStatus}
                activeSignal={activeSignal}
                onResetCycle={handleResetCycle}
                customStrategies={customStrategies}
                strategyOverrides={strategyOverrides}
                onUpdateRunsPerCycle={handleUpdateRunsPerCycle}
                onToggleMatchesMartingale={handleToggleMatchesMartingale}
                theme={isBrightTheme ? 'bright' : 'dark'}
              />

              {/* Execution Controls: Start/Stop Automation & Always-Active Risk Controls */}
              <ExecutionControls
                executionMode={selectedExecutionMode}
                onSelectExecutionMode={setSelectedExecutionMode}
                strategyMeta={
                  (strategyOverrides[selectedStrategy]?.name
                    ? {
                        ...STRATEGY_METAS[selectedStrategy],
                        name: strategyOverrides[selectedStrategy].name!,
                        description:
                          strategyOverrides[selectedStrategy].description ||
                          STRATEGY_METAS[selectedStrategy]?.description ||
                          '',
                        defaultBarrier:
                          typeof strategyOverrides[selectedStrategy].defaultBarrier === 'number'
                            ? strategyOverrides[selectedStrategy].defaultBarrier!
                            : STRATEGY_METAS[selectedStrategy]?.defaultBarrier ?? 0,
                        cycleLimit:
                          typeof strategyOverrides[selectedStrategy].maxRunsPerCycle === 'number'
                            ? strategyOverrides[selectedStrategy].maxRunsPerCycle!
                            : STRATEGY_METAS[selectedStrategy]?.cycleLimit ?? 10,
                        supportsMartingale:
                          typeof strategyOverrides[selectedStrategy].martingaleEnabled === 'boolean'
                            ? strategyOverrides[selectedStrategy].martingaleEnabled!
                            : STRATEGY_METAS[selectedStrategy]?.supportsMartingale ?? true,
                      }
                    : null) ||
                  STRATEGY_METAS[selectedStrategy] || {
                    id: selectedStrategy,
                    name: customStrategies.find((c) => c.id === selectedStrategy)?.name || 'Custom Strategy',
                    description: customStrategies.find((c) => c.id === selectedStrategy)?.description || 'Custom entry rule',
                    contractType: customStrategies.find((c) => c.id === selectedStrategy)?.contractType || 'DIGITOVER',
                    defaultBarrier: customStrategies.find((c) => c.id === selectedStrategy)?.defaultBarrier || 3,
                    cycleLimit: customStrategies.find((c) => c.id === selectedStrategy)?.maxRunsPerCycle || 10,
                    supportsMartingale: customStrategies.find((c) => c.id === selectedStrategy)?.supportsMartingale || false,
                  }
                }
                currentStake={currentRuntimeState.currentStake}
                strategyProfit={currentRuntimeState.cycleProfit ?? 0}
                riskConfig={riskConfig}
                riskSession={riskSession}
                onUpdateRiskConfig={handleUpdateRiskConfig}
                isAutomated={isAutomated}
                onToggleAutomated={handleToggleAutomated}
                onManualExecute={() => handleExecuteTrade()}
                isExecuting={isExecuting}
                activeSignal={activeSignal}
                onResetSessionStats={handleResetSessionStats}
              />

              {/* Collapsible Main-Page Trade Monitor (Auto pops up when contract is placed) */}
              <TradeMonitor
                activeTrades={activeTrades}
                settledTrades={settledTrades}
                onClearHistory={() => {
                  StorageService.clearTrades();
                  setSettledTrades([]);
                  showToast('Settled trade history cleared', 'info');
                }}
              />
            </main>
          </>
        )}

        {/* Account Settings & Auth Modal */}
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          account={userAccount}
          oauthAccounts={oauthAccounts}
          onAuthorizeOAuth={handleAuthorizeOAuth}
          onDisconnectAccount={handleDisconnectAccount}
          onAuthorizeRealTrading={handleAuthorizeRealTrading}
        />

        {/* Rampage Visual Themes & Appearance Customizer Modal */}
        <ThemeCustomizerModal
          isOpen={isThemeModalOpen}
          isBrightAppearance={isBrightTheme}
          onClose={() => setIsThemeModalOpen(false)}
          config={themeConfig}
          onUpdateConfig={handleUpdateThemeConfig}
        />

      </div>
    </>
  );
}







