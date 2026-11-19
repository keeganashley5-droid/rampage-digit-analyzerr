import {
  AccountMode,
  ContractTrade,
  ContractType,
  RiskConfig,
  RiskSessionStats,
  StrategyId,
  StrategyRuntimeState,
  StrategySignal,
  UserAccount,
} from '../types/deriv';
import { derivWs } from '../services/derivWs';
import { StorageService } from '../services/storage';
import { STRATEGY_METAS } from './strategies';

export interface ExecutionEvent {
  type: 'proposal_sent' | 'proposal_received' | 'buy_success' | 'buy_error' | 'settlement' | 'risk_blocked' | 'session_updated' | 'cycle_reset';
  message: string;
  trade?: ContractTrade;
  session?: RiskSessionStats;
}

export class ExecutionEngine {
  private riskConfigs: Record<AccountMode, RiskConfig>;
  private riskSessions: Record<AccountMode, RiskSessionStats>;
  private activeAccountMode: AccountMode = 'demo';
  private processedContracts = new Set<string | number>();
  private activeTrades: Map<string | number, ContractTrade> = new Map();
  private isProcessingTrade = false;
  private eventListeners: Set<(event: ExecutionEvent) => void> = new Set();

  constructor() {
    this.riskConfigs = { demo: StorageService.getRiskConfig('demo'), real: StorageService.getRiskConfig('real') };
    this.riskSessions = {
      demo: StorageService.getRiskSession('demo') || { startingBalance: 1000, currentBalance: 1000, netProfit: 0, totalPurchases: 0, wonCount: 0, lostCount: 0, takeProfitReached: false, stopLossReached: false },
      real: StorageService.getRiskSession('real') || { startingBalance: 1000, currentBalance: 1000, netProfit: 0, totalPurchases: 0, wonCount: 0, lostCount: 0, takeProfitReached: false, stopLossReached: false },
    };

    // Restore any active trades from storage
    const storedActive = StorageService.getActiveTrades();
    storedActive.forEach((t) => {
      this.activeTrades.set(t.contractId || t.id, t);
    });

    // Restore settled contract IDs to prevent duplicate processing after restart.
    StorageService.getTrades().forEach((trade) => {
      if (
        (trade.status === 'won' || trade.status === 'lost') &&
        trade.contractId !== undefined &&
        trade.contractId !== null
      ) {
        this.processedContracts.add(String(trade.contractId));
      }
    });
  }

  public onEvent(cb: (event: ExecutionEvent) => void): () => void {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  }

  private emitEvent(event: ExecutionEvent) {
    this.eventListeners.forEach((cb) => cb(event));
  }

  public setAccountMode(mode: AccountMode): void { this.activeAccountMode = mode; }

  public getRiskConfig(mode: AccountMode = this.activeAccountMode): RiskConfig { return this.riskConfigs[mode]; }

  public updateRiskConfig(config: Partial<RiskConfig>, mode: AccountMode = this.activeAccountMode): RiskConfig { this.riskConfigs[mode] = { ...this.riskConfigs[mode], ...config }; StorageService.saveRiskConfig(this.riskConfigs[mode], mode); return this.riskConfigs[mode]; }

  public getRiskSession(mode: AccountMode = this.activeAccountMode): RiskSessionStats { return this.riskSessions[mode]; }

  public resetRiskSession(balance = 1000, mode: AccountMode = this.activeAccountMode): void { this.riskSessions[mode] = { startingBalance: balance, currentBalance: balance, netProfit: 0, totalPurchases: 0, wonCount: 0, lostCount: 0, takeProfitReached: false, stopLossReached: false }; StorageService.saveRiskSession(this.riskSessions[mode], mode); }

  /**
   * Pre-trade risk validation
   */
  public validateRisk(
    stake: number,
    account: UserAccount | null,
    accountMode: AccountMode
  ): { valid: boolean; reason?: string } {
    const riskConfig = this.riskConfigs[accountMode]
    if (riskConfig.isTradingPaused) {
      return { valid: false, reason: 'Trading is paused by user' };
    }
// Require a genuine authenticated Deriv session for every purchase.
    if (!account || !account.loginid) {
      return { valid: false, reason: 'Connect an authenticated Deriv account before trading' };
    }

    if (account.authType !== 'oauth' || !account.accountId) {
      return { valid: false, reason: 'A valid authenticated Deriv OAuth account is required' };
    }

    const authenticatedAccount = derivWs.userAccount;

    if (
      derivWs.status !== 'authorized' ||
      !authenticatedAccount ||
      authenticatedAccount.authType !== 'oauth' ||
      authenticatedAccount.loginid !== account.loginid ||
      authenticatedAccount.accountId !== account.accountId
    ) {
      return { valid: false, reason: 'The selected Deriv account is not currently authenticated' };
    }

    if (accountMode === 'real') {
      if (account.isVirtual) {
        return { valid: false, reason: 'Real mode requires a genuine Real Deriv account' };
      }

      if (!account.realTradingAuthorized) {
        return { valid: false, reason: 'Real purchases disabled. Explicitly authorize Real Trading first.' };
      }
    } else if (accountMode === 'demo') {
      if (!account.isVirtual) {
        return { valid: false, reason: 'Demo mode requires a Deriv virtual account' };
      }
    }

    if (!Number.isFinite(stake) || stake <= 0) {
      return { valid: false, reason: 'Stake must be a positive finite amount' };
    }
    if (account.balance < stake) {
      return { valid: false, reason: `Insufficient account balance ($${account.balance.toFixed(2)}) for stake $${stake}` };
    }

    return { valid: true };
  }

  /**
   * Executes a trade for a confirmed strategy signal or manual trigger
   */
  public async executeTrade(params: {
    signal: StrategySignal;
    runtimeState: StrategyRuntimeState;
    account: UserAccount | null;
    accountMode: AccountMode;
    isAutomated: boolean;
    currentTickQuote: number;
    currentDigit: number;
  }): Promise<{ success: boolean; trade?: ContractTrade; error?: string }> {
    if (this.isProcessingTrade || this.activeTrades.size > 0) {
      return { success: false, error: 'Wait for the current contract to settle before purchasing another' };
    }

    const { signal, runtimeState, account, accountMode, isAutomated, currentTickQuote, currentDigit } = params;
    const stake = runtimeState.currentStake || this.riskConfigs[accountMode].initialStake;

    // 1. Validate risk checks
    const riskCheck = this.validateRisk(stake, account, accountMode);
    if (!riskCheck.valid) {
      this.emitEvent({
        type: 'risk_blocked',
        message: riskCheck.reason || 'Trade blocked by risk controls',
      });
      return { success: false, error: riskCheck.reason };
    }

    this.isProcessingTrade = true;
    const tradeId = `trade_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const pendingTrade: ContractTrade = {
      id: tradeId,
      contractId: 0,
      symbol: signal.symbol,
      symbolName: signal.symbol,
      strategyId: signal.strategyId,
      strategyName: signal.strategyName,
      contractType: signal.contractType,
      barrier: signal.barrier,
      stake,
      payout: 0,
      entryTickQuote: currentTickQuote,
      entryDigit: currentDigit,
      status: 'pending',
      profit: 0,
      startTime: Date.now(),
      isAutomated,
      accountType: accountMode,
      cycleIndex: runtimeState.cycleTradeIndex + 1,
    };

    try {
      this.emitEvent({
        type: 'proposal_sent',
        message: `Requesting Deriv proposal for ${signal.contractType} ${signal.barrier} (Stake: $${stake.toFixed(2)})`,
        trade: pendingTrade,
      });

      // Genuine Deriv proposal and purchase only.
      const prop = await derivWs.requestProposal({
        symbol: signal.symbol,
        contractType: signal.contractType,
        barrier: signal.barrier,
        amount: stake,
        currency: account!.currency,
      });

      const purchaseRiskCheck = this.validateRisk(stake, account, accountMode);
      if (!purchaseRiskCheck.valid) {
        throw new Error(purchaseRiskCheck.reason || 'Trading authorization changed before purchase');
      }

      const buyResult = await derivWs.buyContract(prop.proposalId, prop.askPrice);

      pendingTrade.contractId = buyResult.contractId;
      pendingTrade.payout = prop.payout;
      pendingTrade.status = 'open';
      this.activeTrades.set(pendingTrade.contractId || pendingTrade.id, pendingTrade);
      StorageService.saveTrade(pendingTrade);
      StorageService.saveActiveTrades(Array.from(this.activeTrades.values()));

      this.emitEvent({
        type: 'buy_success',
        message: `Contract purchased #${pendingTrade.contractId}. Monitoring 1-tick settlement.`,
        trade: pendingTrade,
      });

      this.isProcessingTrade = false;
      return { success: true, trade: pendingTrade };
    } catch (err: any) {
      this.isProcessingTrade = false;
      pendingTrade.status = 'rejected';
      pendingTrade.errorReason = err?.message || 'Execution error';
      StorageService.saveTrade(pendingTrade);

      this.emitEvent({
        type: 'buy_error',
        message: `Execution failed: ${err?.message || 'Unknown error'}`,
        trade: pendingTrade,
      });

      return { success: false, error: err?.message || 'Purchase rejected by Deriv' };
    }
  }

  public async executeDirectTrade(params: {
    symbol: string;
    contractType: ContractType;
    barrier?: number;
    stake: number;
    duration?: number;
    durationUnit?: 't' | 's' | 'm' | 'h' | 'd';
    account: UserAccount | null;
    accountMode: AccountMode;
    isAutomated: boolean;
    currentTickQuote: number;
    currentDigit: number;
  }): Promise<{ success: boolean; trade?: ContractTrade; error?: string }> {
    if (this.isProcessingTrade || this.activeTrades.size > 0) {
      return { success: false, error: 'Wait for the current contract to settle before purchasing another' };
    }

    const duration = params.duration ?? 1;
    const durationUnit = params.durationUnit ?? 't';

    if (!params.symbol || !Number.isFinite(params.stake) || params.stake <= 0) {
      return { success: false, error: 'Invalid symbol or stake' };
    }

    if (!Number.isInteger(duration) || duration < 1) {
      return { success: false, error: 'Duration must be a positive whole number' };
    }

    if (!['t', 's', 'm', 'h', 'd'].includes(durationUnit)) {
      return { success: false, error: 'Unsupported duration unit' };
    }

    const requiresBarrier = !['DIGITEVEN', 'DIGITODD'].includes(params.contractType);

    if (requiresBarrier && (!Number.isInteger(params.barrier) || params.barrier! < 0 || params.barrier! > 9)) {
      return { success: false, error: 'This contract requires a barrier from 0 to 9' };
    }

    if (!Number.isFinite(params.currentTickQuote) ||
        !Number.isInteger(params.currentDigit) ||
        params.currentDigit < 0 || params.currentDigit > 9) {
      return { success: false, error: 'Invalid current market tick data' };
    }
    const riskCheck = this.validateRisk(params.stake, params.account, params.accountMode);
    if (!riskCheck.valid) {
      this.emitEvent({ type: 'risk_blocked', message: riskCheck.reason || 'Trade blocked by risk controls' });
      return { success: false, error: riskCheck.reason };
    }

    this.isProcessingTrade = true;
    const pendingTrade: ContractTrade = {
      id: `direct_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      contractId: 0,
      symbol: params.symbol,
      symbolName: params.symbol,
      strategyId: 'direct_trading',
      strategyName: 'Direct Trading',
      contractType: params.contractType,
      barrier: params.barrier ?? 0,
      stake: params.stake,
      payout: 0,
      entryTickQuote: params.currentTickQuote,
      entryDigit: params.currentDigit,
      status: 'pending',
      profit: 0,
      startTime: Date.now(),
      isAutomated: params.isAutomated,
      accountType: params.accountMode,
      cycleIndex: 0,
      duration,
      durationUnit,
    };

    try {
      this.emitEvent({
        type: 'proposal_sent',
        message: `Requesting Direct Trading proposal (${duration} ${durationUnit})`,
        trade: pendingTrade,
      });
      const proposal = await derivWs.requestProposal({
        symbol: params.symbol,
        contractType: params.contractType,
        ...(params.barrier !== undefined ? { barrier: params.barrier } : {}),
        amount: params.stake,
        currency: params.account!.currency,
        duration,
        durationUnit,
      });

      const purchaseRiskCheck = this.validateRisk(params.stake, params.account, params.accountMode);
      if (!purchaseRiskCheck.valid) {
        throw new Error(purchaseRiskCheck.reason || 'Trading authorization changed before purchase');
      }

      const buyResult = await derivWs.buyContract(proposal.proposalId, proposal.askPrice);
      pendingTrade.contractId = buyResult.contractId;
      pendingTrade.payout = proposal.payout;
      pendingTrade.status = 'open';
      this.activeTrades.set(pendingTrade.contractId || pendingTrade.id, pendingTrade);
      StorageService.saveTrade(pendingTrade);
      StorageService.saveActiveTrades(Array.from(this.activeTrades.values()));
      this.emitEvent({
        type: 'buy_success',
        message: `Direct Trading contract purchased #${pendingTrade.contractId}.`,
        trade: pendingTrade,
      });
      return { success: true, trade: pendingTrade };
    } catch (err: any) {
      pendingTrade.status = 'rejected';
      pendingTrade.errorReason = err?.message || 'Execution error';
      StorageService.saveTrade(pendingTrade);
      this.emitEvent({
        type: 'buy_error',
        message: `Direct Trading execution failed: ${pendingTrade.errorReason}`,
        trade: pendingTrade,
      });
      return { success: false, error: pendingTrade.errorReason };
    } finally {
      this.isProcessingTrade = false;
    }
  }


  /**
   * Idempotent settlement processor. Prevents duplicate financial or cycle updates.
   */
  public processSettlement(
    tradeData: Partial<ContractTrade> & { contractId: string | number },
    runtimeStateMap: Map<StrategyId, StrategyRuntimeState>
  ): { updatedTrade: ContractTrade; nextRuntimeState?: StrategyRuntimeState } | null {
    const key = String(tradeData.contractId);
    if (this.processedContracts.has(key)) {
      return null;
    }

    const activeEntry = Array.from(this.activeTrades.entries())
      .find(([activeKey, trade]) => String(trade.contractId || activeKey) === key);
    const existing = activeEntry?.[1] || StorageService.getTrades()
      .find((t) => String(t.contractId) === key);

    if (!existing || (tradeData.status !== 'won' && tradeData.status !== 'lost')) {
      return null;
    }

    const profit = Number(tradeData.profit);
    if (!Number.isFinite(profit)) {
      return null;
    }

    const isWon = tradeData.status === 'won';
    this.processedContracts.add(key);

    const settledTrade: ContractTrade = {
      ...(existing || {}),
      id: existing?.id || `trade_${key}`,
      contractId: key,
      symbol: tradeData.symbol || existing?.symbol || '1HZ10V',
      symbolName: tradeData.symbolName || existing?.symbolName || 'Synthetic',
      strategyId: existing?.strategyId || 'matches',
      strategyName: existing?.strategyName || 'Strategy',
      contractType: existing?.contractType || 'DIGITOVER',
      barrier: existing?.barrier ?? 5,
      stake: existing?.stake || 0.5,
      payout: existing?.payout || 0.95,
      entryTickQuote: existing?.entryTickQuote || 0,
      entryDigit: existing?.entryDigit ?? 0,
      exitTickQuote: tradeData.exitTickQuote,
      exitDigit: tradeData.exitDigit,
      status: isWon ? 'won' : 'lost',
      profit,
      startTime: existing?.startTime || Date.now() - 1000,
      settleTime: Date.now(),
      isAutomated: existing?.isAutomated || false,
      accountType: existing?.accountType || tradeData.accountType || 'demo',
      cycleIndex: existing?.cycleIndex || 1,
    };

    const settlementMode: AccountMode = settledTrade.accountType === 'real' ? 'real' : 'demo';
    const riskConfig = this.riskConfigs[settlementMode];
    const riskSession = this.riskSessions[settlementMode];

    // Remove from active trades
    for (const [activeKey, activeTrade] of this.activeTrades.entries()) {
      if (String(activeTrade.contractId || activeKey) === key) {
        this.activeTrades.delete(activeKey);
      }
    }
    StorageService.saveTrade(settledTrade);
    StorageService.saveActiveTrades(Array.from(this.activeTrades.values()));

    // Update risk session
    riskSession.totalPurchases += 1;
    if (isWon) {
      riskSession.wonCount += 1;
    } else {
      riskSession.lostCount += 1;
    }
    riskSession.netProfit += profit;
    riskSession.currentBalance += profit;
    StorageService.saveRiskSession(riskSession, settlementMode);

    // Direct Trading updates account history and risk totals, never strategy cycles.
    if (settledTrade.strategyId === 'direct_trading') {
      StorageService.saveRiskSession(riskSession, settlementMode);
      this.emitEvent({
        type: 'settlement',
        message: `Settled Direct Trading contract #${settledTrade.contractId}: ${settledTrade.status.toUpperCase()} (${settledTrade.profit >= 0 ? '+' : ''}$${settledTrade.profit.toFixed(2)})`,
        trade: settledTrade,
      });
      return { updatedTrade: settledTrade };
    }

    // Manual contracts update account totals only; they never affect automated strategy runs or TP/SL.
    if (!settledTrade.isAutomated) {
      this.emitEvent({
        type: 'settlement',
        message: `Settled manual contract #${settledTrade.contractId}: ${settledTrade.status.toUpperCase()} (${settledTrade.profit >= 0 ? '+' : ''}$${settledTrade.profit.toFixed(2)})`,
        trade: settledTrade,
      });
      return { updatedTrade: settledTrade };
    }

    // Update strategy runtime state
    const stratId = settledTrade.strategyId;
    const stratMeta = STRATEGY_METAS[stratId];
    const currentRuntime = runtimeStateMap.get(stratId) || {
      strategyId: stratId,
      currentStake: riskConfig.initialStake,
      cycleCount: 0,
      cycleTradeIndex: 0,
      martingaleStep: 0,
      cycleProfit: 0,
      consecutiveBelow5: 0,
      consecutiveAbove5: 0,
      consecutiveBelow4: 0,
    };

    const nextRuntime: StrategyRuntimeState = { ...currentRuntime };

    // Advance cycle trade count and accumulate cycle net profit
    nextRuntime.cycleTradeIndex += 1;
    nextRuntime.cycleProfit = Math.round(((nextRuntime.cycleProfit || 0) + profit) * 100) / 100;

    // Configurable cycle rules:
    // Respects user/admin configured runs per cycle (stops hardcoding to 5)
    const configuredLimit = nextRuntime.maxRunsPerCycle !== undefined
      ? nextRuntime.maxRunsPerCycle
      : (typeof stratMeta?.cycleLimit === 'number' ? stratMeta.cycleLimit : (stratMeta?.cycleLimit === 'unlimited' ? Infinity : 5));
    const isCycleLimited = Number.isFinite(configuredLimit) && configuredLimit > 0;
    const cycleRunsReached = isCycleLimited && nextRuntime.cycleTradeIndex >= configuredLimit;

    // Cycle-level Take Profit and Stop Loss evaluation:
    // SL and TP govern the specific cycle, resetting stake upon reaching target or floor without locking account
    const cycleTpHit = riskConfig.takeProfit > 0 && (nextRuntime.cycleProfit || 0) >= riskConfig.takeProfit;
    const cycleSlHit = riskConfig.stopLoss > 0 && (nextRuntime.cycleProfit || 0) <= -riskConfig.stopLoss;

    if (cycleTpHit || cycleSlHit || cycleRunsReached) {
      nextRuntime.lastCycleProfit = nextRuntime.cycleProfit || 0;
      // Cycle target reached: reset stake, reset cycle profit, and increment completed cycles
      nextRuntime.cycleCount += 1;
      nextRuntime.cycleTradeIndex = 0;
      nextRuntime.martingaleStep = 0;
      nextRuntime.currentStake = riskConfig.initialStake;
      nextRuntime.cycleProfit = 0;
      nextRuntime.inContinuousRun = false;

      const cycleReason = cycleTpHit
        ? `Take Profit (+$${riskConfig.takeProfit.toFixed(2)}) reached. Resetting to initial stake.`
        : cycleSlHit
        ? `Stop Loss (-$${riskConfig.stopLoss.toFixed(2)}) hit. Strategy protected and reset.`
        : `Cycle completed (${configuredLimit} runs). Starting next cycle.`;

      this.emitEvent({
        type: 'cycle_reset',
        message: cycleReason,
      });
    } else {
      const isMartingaleActive = riskConfig.martingaleEnabled && (stratMeta?.supportsMartingale ?? false);
      if (isMartingaleActive && !isWon) {
        const maxSteps = Math.max(1, Math.floor(riskConfig.maxMartingaleSteps || 5));
        const nextStake = Math.round(nextRuntime.currentStake * riskConfig.martingaleMultiplier * 100) / 100;
        if (nextRuntime.martingaleStep >= maxSteps) {
          nextRuntime.martingaleStep = 0;
          nextRuntime.currentStake = riskConfig.initialStake;
        } else {
          nextRuntime.martingaleStep += 1;
          nextRuntime.currentStake = nextStake;
        }
      } else {
        nextRuntime.martingaleStep = 0;
        nextRuntime.currentStake = riskConfig.initialStake;
      }    }

    runtimeStateMap.set(stratId, nextRuntime);

    this.emitEvent({
      type: 'settlement',
      message: `Settled trade #${settledTrade.contractId}: ${settledTrade.status.toUpperCase()} (${settledTrade.profit >= 0 ? '+' : ''}$${settledTrade.profit.toFixed(2)})`,
      trade: settledTrade,
    });

    return { updatedTrade: settledTrade, nextRuntimeState: nextRuntime };
  }
}

export const executionEngine = new ExecutionEngine();
