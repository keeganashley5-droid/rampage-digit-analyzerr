/**
 * Deriv Synthetic Indices and Trading Terminal Types
 */

export interface MarketInfo {
  symbol: string;
  displayName: string;
  category: '1s' | 'standard';
  pipSize: number;
}

export const SYNTHETIC_MARKETS: MarketInfo[] = [
  { symbol: '1HZ10V', displayName: 'Volatility 10 (1s)', category: '1s', pipSize: 2 },
  { symbol: '1HZ25V', displayName: 'Volatility 25 (1s)', category: '1s', pipSize: 2 },
  { symbol: '1HZ50V', displayName: 'Volatility 50 (1s)', category: '1s', pipSize: 2 },
  { symbol: '1HZ75V', displayName: 'Volatility 75 (1s)', category: '1s', pipSize: 2 },
  { symbol: '1HZ90V', displayName: 'Volatility 90 (1s)', category: '1s', pipSize: 2 },
  { symbol: '1HZ100V', displayName: 'Volatility 100 (1s)', category: '1s', pipSize: 2 },
  { symbol: 'R_10', displayName: 'Volatility 10', category: 'standard', pipSize: 3 },
  { symbol: 'R_25', displayName: 'Volatility 25', category: 'standard', pipSize: 3 },
  { symbol: 'R_50', displayName: 'Volatility 50', category: 'standard', pipSize: 4 },
  { symbol: 'R_75', displayName: 'Volatility 75', category: 'standard', pipSize: 4 },
  { symbol: 'R_100', displayName: 'Volatility 100', category: 'standard', pipSize: 2 },
];

export interface MarketTick {
  epoch: number;
  quote: number;
  digit: number;
  symbol: string;
}

export interface DigitStats {
  digit: number; // 0 to 9
  count: number;
  frequency: number; // percentage rounded to 1 or 2 decimals
  rank: number; // 1 = highest frequency, 10 = lowest
  isTied: boolean;
}

export interface DistributionAnalysis {
  digits: DigitStats[];
  totalTicks: number;
  mostFrequent: DigitStats | null; // Green
  secondMostFrequent: DigitStats | null; // Blue
  leastFrequent: DigitStats | null; // Red
  frequencyDiffTopTwo: number; // diff in percentage points
  hasTiedLeaders: boolean;
}

export type StrategyId =
  | 'matches'
  | 'over5'
  | 'under5'
  | 'dual_bar_over3'
  | 'triple_tap_over3'
  | 'under6'
  | 'under7'
  | 'digit_frequency_switch'
  | string;

export type ContractType = 'MATCHES' | 'DIGITOVER' | 'DIGITUNDER' | 'DIGITDIFF' | 'DIGITEVEN' | 'DIGITODD';

export interface StrategyRuleMeta {
  id: StrategyId;
  name: string;
  description: string;
  contractType: ContractType;
  defaultBarrier: number;
  cycleLimit: number | 'unlimited';
  supportsMartingale: boolean;
  isCustom?: boolean;
}

export interface CustomStrategy {
  id: string;
  name: string;
  description: string;
  contractType: ContractType;
  defaultBarrier: number;
  conditionType: 'frequency_above' | 'frequency_below' | 'cursor_match' | 'consecutive_taps' | 'diff_lte';
  conditionValue?: number;
  consecutiveRequired?: number;
  targetDigitMode: 'second_most_frequent' | 'most_frequent' | 'least_frequent' | 'fixed_barrier';
  maxRunsPerCycle: number;
  supportsMartingale: boolean;
  isActive: boolean;
  createdAt: number;
}

export interface StrategySignal {
  strategyId: StrategyId;
  strategyName: string;
  symbol: string;
  contractType: ContractType;
  barrier: number;
  triggerDigit: number;
  reason: string;
  timestamp: number;
}

export interface StrategyRuntimeState {
  strategyId: StrategyId;
  currentStake: number;
  cycleCount: number; // 0 to maxRunsPerCycle
  cycleTradeIndex: number; // confirmed purchases in current cycle
  martingaleStep: number;
  martingaleEnabled?: boolean; // user configurable
  maxRunsPerCycle?: number; // user configurable (replaces hardcoded 5)
  inContinuousRun?: boolean; // for continuous 2nd most frequent purchasing
  continuousTargetDigit?: number;
  consecutiveBelow5: number; // for Over 5
  consecutiveAbove5: number; // for Under 5
  consecutiveBelow4: number; // for Triple Tap Over 3
  cycleProfit?: number; // net profit of the current cycle for cycle-level TP/SL
  lastCycleProfit?: number; // most recently completed cycle result
  lastTriggerTick?: number;
}

export type RampageAppearance = 'light' | 'dark';

export interface RampageThemeConfig {
  appearance: RampageAppearance;
}

export type AccountMode = 'demo' | 'real';

export interface UserAccount {
  authType?: 'manual' | 'oauth';
  accountId?: string;
  token?: string;
  loginid: string;
  isVirtual: boolean;
  currency: string;
  balance: number;
  email?: string;
  fullname?: string;
  realTradingAuthorized: boolean;
}

export interface ContractTrade {
  id: string;
  contractId: number | string;
  symbol: string;
  symbolName: string;
  strategyId: StrategyId;
  strategyName: string;
  contractType: ContractType;
  barrier: number;
  stake: number;
  payout: number;
  entryTickQuote: number;
  entryDigit: number;
  exitTickQuote?: number;
  exitDigit?: number;
  status: 'pending' | 'open' | 'won' | 'lost' | 'rejected' | 'error';
  profit: number;
  startTime: number;
  settleTime?: number;
  isAutomated: boolean;
  accountType: AccountMode;
  cycleIndex: number;
  duration?: number;
  durationUnit?: 't' | 's' | 'm' | 'h' | 'd';
  errorReason?: string;
}

export interface RiskConfig {
  initialStake: number;
  martingaleEnabled: boolean;
  martingaleMultiplier: number;
  maxMartingaleSteps: number;
  takeProfit: number;
  stopLoss: number;
  isTradingPaused: boolean;
}

export interface RiskSessionStats {
  startingBalance: number;
  currentBalance: number;
  netProfit: number;
  totalPurchases: number;
  wonCount: number;
  lostCount: number;
  takeProfitReached: boolean;
  stopLossReached: boolean;
}

export interface MonetizationConfig {
  ownerAppId: string;
  affiliateUrl: string;
  paymentUrl: string;
  isProGated: boolean;
  activeLicenseKey?: string;
  isProActive: boolean;
}

export interface StrategyOverride {
  id: string;
  name?: string;
  description?: string;
  defaultBarrier?: number;
  maxRunsPerCycle?: number;
  martingaleEnabled?: boolean;
  martingaleMultiplier?: number;
  consecutiveRequired?: number;
  matchesTargetMode?: 'second_most_frequent' | 'most_frequent' | 'custom_digit';
  matchesCustomDigit?: number;
  isEnabled?: boolean;
}


