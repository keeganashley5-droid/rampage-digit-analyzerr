import { AccountMode, ContractTrade, RiskConfig, RiskSessionStats, UserAccount } from '../types/deriv';

const STORAGE_KEYS = {
  TRADES: 'rampage_trades_history_v1',
  ACTIVE_TRADES: 'rampage_active_trades_v1',
  USER_ACCOUNT: 'rampage_user_account_v1',
  RISK_CONFIG: 'rampage_risk_config_v1',
  RISK_SESSION: 'rampage_risk_session_v1',
  SELECTED_MARKET: 'rampage_selected_market_v1',
  SELECTED_STRATEGY: 'rampage_selected_strategy_v1',
  TICK_WINDOW: 'rampage_tick_window_v1',
};

const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const memoryStore: Record<string, string> = {};
let volatileAccount: UserAccount | null = null;

function safeGet(key: string, isSession = false): string | null {
  if (!isBrowser) return memoryStore[key] || null;
  try {
    return isSession ? sessionStorage.getItem(key) : localStorage.getItem(key);
  } catch {
    return memoryStore[key] || null;
  }
}

function safeSet(key: string, val: string, isSession = false): void {
  if (!isBrowser) {
    memoryStore[key] = val;
    return;
  }
  try {
    if (isSession) sessionStorage.setItem(key, val);
    else localStorage.setItem(key, val);
  } catch {
    memoryStore[key] = val;
  }
}

function safeRemove(key: string, isSession = false): void {
  if (!isBrowser) {
    delete memoryStore[key];
    return;
  }
  try {
    if (isSession) sessionStorage.removeItem(key);
    else localStorage.removeItem(key);
  } catch {
    delete memoryStore[key];
  }
}

export const StorageService = {
  getTrades(): ContractTrade[] {
    try {
      const data = safeGet(STORAGE_KEYS.TRADES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveTrade(trade: ContractTrade): void {
    try {
      const trades = this.getTrades();
      const existingIdx = trades.findIndex((t) => t.id === trade.id || (t.contractId && trade.contractId && String(t.contractId) === String(trade.contractId)));
      if (existingIdx >= 0) {
        trades[existingIdx] = trade;
      } else {
        trades.unshift(trade);
      }
      // Keep up to 500 recent trades
      safeSet(STORAGE_KEYS.TRADES, JSON.stringify(trades.slice(0, 500)));
    } catch (e) {
      console.warn('Failed to save trade', e);
    }
  },

  clearTrades(): void {
    safeRemove(STORAGE_KEYS.TRADES);
  },

  getActiveTrades(): ContractTrade[] {
    try {
      const data = safeGet(STORAGE_KEYS.ACTIVE_TRADES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveActiveTrades(trades: ContractTrade[]): void {
    safeSet(STORAGE_KEYS.ACTIVE_TRADES, JSON.stringify(trades));
  },

  getAccount(): UserAccount | null {
    try {
      const data = safeGet(STORAGE_KEYS.USER_ACCOUNT, true);
      if (!data) return null;
      const account = JSON.parse(data) as UserAccount;
      return { ...account, realTradingAuthorized: false };
    } catch {
      return null;
    }
  },

  saveAccount(account: UserAccount | null, _persist: boolean = false): void {
    safeRemove(STORAGE_KEYS.USER_ACCOUNT, false);
    if (!account) {
      safeRemove(STORAGE_KEYS.USER_ACCOUNT, true);
      return;
    }
    safeSet(STORAGE_KEYS.USER_ACCOUNT, JSON.stringify(account), true);
  },

  getRiskConfig(accountMode: AccountMode = 'demo'): RiskConfig {
    const defaultRisk: RiskConfig = {
      initialStake: 0.5,
      martingaleEnabled: false,
      martingaleMultiplier: 2.0,
      maxMartingaleSteps: 5,
      takeProfit: 10.0,
      stopLoss: 20.0,
      isTradingPaused: false,
    };
    try {
      const modeKey = `rampage_risk_config_${accountMode}_v1`;
      const data = safeGet(modeKey) || (accountMode === 'demo' ? safeGet(STORAGE_KEYS.RISK_CONFIG) : null);
      return data ? { ...defaultRisk, ...JSON.parse(data) } : defaultRisk;
    } catch {
      return defaultRisk;
    }
  },

  saveRiskConfig(config: RiskConfig, accountMode: AccountMode = 'demo'): void {
    safeSet(`rampage_risk_config_${accountMode}_v1`, JSON.stringify(config));
  },

  getRiskSession(accountMode: AccountMode = 'demo'): RiskSessionStats | null {
    try {
      const modeKey = `rampage_risk_session_${accountMode}_v1`;
      const data = safeGet(modeKey) || (accountMode === 'demo' ? safeGet(STORAGE_KEYS.RISK_SESSION) : null);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  saveRiskSession(session: RiskSessionStats, accountMode: AccountMode = 'demo'): void {
    safeSet(`rampage_risk_session_${accountMode}_v1`, JSON.stringify(session));
  },

  getSelectedMarket(): string {
    return safeGet(STORAGE_KEYS.SELECTED_MARKET) || '1HZ10V';
  },

  saveSelectedMarket(symbol: string): void {
    safeSet(STORAGE_KEYS.SELECTED_MARKET, symbol);
  },

  getSelectedStrategy(): string {
    return safeGet(STORAGE_KEYS.SELECTED_STRATEGY) || 'matches';
  },

  saveSelectedStrategy(strategyId: string): void {
    safeSet(STORAGE_KEYS.SELECTED_STRATEGY, strategyId);
  },

  getTickWindow(): number {
    const val = safeGet(STORAGE_KEYS.TICK_WINDOW);
    const parsed = val ? parseInt(val, 10) : 1000;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1000;
  },

  saveTickWindow(count: number): void {
    if (count > 0) {
      safeSet(STORAGE_KEYS.TICK_WINDOW, count.toString());
    }
  },

  getMonetizationConfig(): import('../types/deriv').MonetizationConfig {
    const defaultConfig: import('../types/deriv').MonetizationConfig = {
      ownerAppId: '1089',
      affiliateUrl: 'https://track.deriv.com/_rampage_trading',
      paymentUrl: 'https://rampage.lemonsqueezy.com/buy',
      isProGated: true,
      activeLicenseKey: '',
      isProActive: false,
    };
    try {
      const data = safeGet('rampage_monetization_config_v1');
      return data ? { ...defaultConfig, ...JSON.parse(data) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  },

  saveMonetizationConfig(config: import('../types/deriv').MonetizationConfig): void {
    safeSet('rampage_monetization_config_v1', JSON.stringify(config));
  },


  getCustomStrategies(): import('../types/deriv').CustomStrategy[] {
    try {
      const data = safeGet('rampage_custom_strategies_v1');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveCustomStrategies(strategies: import('../types/deriv').CustomStrategy[]): void {
    safeSet('rampage_custom_strategies_v1', JSON.stringify(strategies));
  },

  getMatchesConfig(): { martingaleEnabled: boolean; maxRuns: number } {
    try {
      const data = safeGet('rampage_matches_config_v1');
      return data ? JSON.parse(data) : { martingaleEnabled: false, maxRuns: 10 };
    } catch {
      return { martingaleEnabled: false, maxRuns: 10 };
    }
  },

  saveMatchesConfig(cfg: { martingaleEnabled: boolean; maxRuns: number }): void {
    safeSet('rampage_matches_config_v1', JSON.stringify(cfg));
  },

  getStrategyCycleRuns(): Record<string, number> {
    try {
      const data = safeGet('rampage_strategy_cycle_runs_v1');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveStrategyCycleRuns(runs: Record<string, number>): void {
    safeSet('rampage_strategy_cycle_runs_v1', JSON.stringify(runs));
  },

  getStrategyOverrides(): Record<string, import('../types/deriv').StrategyOverride> {
    try {
      const data = safeGet('rampage_strategy_overrides_v1');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveStrategyOverrides(overrides: Record<string, import('../types/deriv').StrategyOverride>): void {
    safeSet('rampage_strategy_overrides_v1', JSON.stringify(overrides));
  },

  getThemeConfig(): import('../types/deriv').RampageThemeConfig {
    const defaults: import('../types/deriv').RampageThemeConfig = {
      appearance: 'light',
    };

    try {
      const data = safeGet('rampage_theme_config_v2');
      if (data) {
        const saved = JSON.parse(data);
        return {
          appearance: saved.appearance === 'dark' ? 'dark' : 'light',
        };
      }
    } catch {
      // Use the default appearance when saved settings are invalid.
    }

    return defaults;
  },

  saveThemeConfig(updates: Partial<import('../types/deriv').RampageThemeConfig>): import('../types/deriv').RampageThemeConfig {
    const current = this.getThemeConfig();
    const merged: import('../types/deriv').RampageThemeConfig = {
      appearance: updates.appearance === 'dark' ? 'dark' : updates.appearance === 'light' ? 'light' : current.appearance,
    };
    safeSet('rampage_theme_config_v2', JSON.stringify(merged));
    return merged;
  },
};


