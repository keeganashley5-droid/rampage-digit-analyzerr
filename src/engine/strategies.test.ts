import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLastDigit, calculateDistribution } from './digits';
import {
  evaluateStrategy,
  createInitialRuntimeState,
  STRATEGY_METAS,
} from './strategies';
import { DistributionAnalysis, MarketTick } from '../types/deriv';
import type { ContractTrade, UserAccount } from '../types/deriv';
import { StorageService } from '../services/storage';
import { derivWs } from '../services/derivWs';

function makePendingTrade(contractId: string, overrides: Partial<ContractTrade> = {}): ContractTrade {
  return {
    id: 'trade_' + contractId,
    contractId,
    symbol: '1HZ10V',
    symbolName: 'Synthetic',
    strategyId: 'matches',
    strategyName: 'Matches',
    contractType: 'MATCHES',
    barrier: 2,
    stake: 1,
    payout: 1.95,
    entryTickQuote: 1000,
    entryDigit: 0,
    status: 'open',
    profit: 0,
    startTime: Date.now() - 1000,
    isAutomated: true,
    accountType: 'demo',
    cycleIndex: 1,
    ...overrides,
  };
}
function buildMockDistribution(freqMap: Record<number, number>): DistributionAnalysis {
  const digits = Array.from({ length: 10 }, (_, d) => {
    const frequency = freqMap[d] ?? 0;
    return {
      digit: d,
      count: Math.round(frequency * 10),
      frequency,
      rank: 10,
      isTied: false,
    };
  });

  // Sort and assign ranks
  const sorted = [...digits].sort((a, b) => b.frequency - a.frequency);
  sorted.forEach((item, index) => {
    const original = digits.find((d) => d.digit === item.digit)!;
    original.rank = index + 1;
  });

  const mostFrequent = sorted[0];
  const secondMostFrequent = sorted[1];
  const leastFrequent = sorted[sorted.length - 1];
  const frequencyDiffTopTwo = Math.round(Math.abs(mostFrequent.frequency - secondMostFrequent.frequency) * 100) / 100;

  return {
    digits,
    totalTicks: 1000,
    mostFrequent,
    secondMostFrequent,
    leastFrequent,
    frequencyDiffTopTwo,
    hasTiedLeaders: mostFrequent.frequency === secondMostFrequent.frequency,
  };
}

test('extractLastDigit handles numbers, strings, and pip sizes correctly', () => {
  assert.equal(extractLastDigit(1234.56), 6);
  assert.equal(extractLastDigit('1234.56'), 6);
  assert.equal(extractLastDigit(987.0, 2), 0); // 987.00 -> 0
  assert.equal(extractLastDigit('456.789', 3), 9);
  assert.equal(extractLastDigit(0), 0);
  assert.equal(extractLastDigit('8432.14'), 4);
});

test('calculateDistribution counts and ranks accurately with honest tie handling', () => {
  const mockTicks: MarketTick[] = [
    { epoch: 1, quote: 100.1, digit: 1, symbol: 'R_100' },
    { epoch: 2, quote: 100.2, digit: 1, symbol: 'R_100' },
    { epoch: 3, quote: 100.3, digit: 2, symbol: 'R_100' },
    { epoch: 4, quote: 100.4, digit: 9, symbol: 'R_100' },
  ];

  const dist = calculateDistribution(mockTicks);
  assert.equal(dist.totalTicks, 4);
  assert.equal(dist.mostFrequent?.digit, 1);
  assert.equal(dist.mostFrequent?.count, 2);
  assert.equal(dist.mostFrequent?.frequency, 50.0);
});

test('Strategy A: Matches triggers when top diff <= 0.3% and cursor hits most frequent digit', () => {
  const dist = buildMockDistribution({
    3: 15.2, // rank 1
    7: 15.0, // rank 2, diff = 0.2%
    0: 10.0,
    1: 10.0,
    2: 10.0,
    4: 10.0,
    5: 10.0,
    6: 10.0,
    8: 5.0,
    9: 4.8,
  });

  const state = createInitialRuntimeState('matches');
  
  // Tick cursor hits digit 3 (most frequent)
  const currentTick: MarketTick = { epoch: 100, quote: 123.3, digit: 3, symbol: '1HZ10V' };
  const res = evaluateStrategy('matches', dist, currentTick, state, '1HZ10V');

  assert.ok(res.signal, 'Expected signal for Matches');
  assert.equal(res.signal?.contractType, 'MATCHES');
  assert.equal(res.signal?.barrier, 7, 'Target barrier must be 2nd-most frequent digit');

  // Should NOT trigger if cursor hits another digit (e.g. 7)
  const tickOther: MarketTick = { epoch: 101, quote: 123.7, digit: 7, symbol: '1HZ10V' };
  const resOther = evaluateStrategy('matches', dist, tickOther, state, '1HZ10V');
  assert.equal(resOther.signal, null);
});

test('Strategy B: Over 5 triggers on 4 consecutive taps on 0-4 when 6-9 all >= 10% and green > 5', () => {
  const dist = buildMockDistribution({
    8: 16.0, // green > 5
    6: 12.0,
    7: 11.0,
    9: 10.5,
    0: 8.0,
    1: 8.5,
    2: 8.0,
    3: 9.0,
    4: 9.0,
    5: 8.0,
  });

  let state = createInitialRuntimeState('over5');

  // Taps on 1, 2, 0, 4 (all < 5)
  const ticks = [1, 2, 0, 4].map((d, i) => ({ epoch: 100 + i, quote: 100 + d, digit: d, symbol: 'R_100' }));

  let lastRes;
  for (const t of ticks) {
    lastRes = evaluateStrategy('over5', dist, t, state, 'R_100');
    state = lastRes.runtimeState;
  }

  assert.ok(lastRes?.signal, 'Expected Over 5 signal on 4th tap');
  assert.equal(lastRes.signal?.contractType, 'DIGITOVER');
  assert.equal(lastRes.signal?.barrier, 5);
});

test('Strategy C: Under 5 resets consecutive count when digit 5 arrives', () => {
  const dist = buildMockDistribution({
    2: 15.0, // green < 5
    0: 11.0,
    1: 11.0,
    3: 11.0,
    4: 10.5,
    6: 8.0,
    7: 8.0,
    8: 8.0,
    9: 8.5,
    5: 9.0,
  });

  let state = createInitialRuntimeState('under5');

  // Two taps on 6, 7 (valid > 5)
  let res = evaluateStrategy('under5', dist, { epoch: 1, quote: 1, digit: 6, symbol: 'R_100' }, state, 'R_100');
  state = res.runtimeState;
  assert.equal(state.consecutiveAbove5, 1);

  // Arrives digit 5 -> MUST RESET sequence
  res = evaluateStrategy('under5', dist, { epoch: 2, quote: 2, digit: 5, symbol: 'R_100' }, state, 'R_100');
  state = res.runtimeState;
  assert.equal(state.consecutiveAbove5, 0, 'Digit 5 must reset Under 5 sequence');
});

test('Strategy D: Dual Bar - Over 3 triggers when Green & Red in {5,7,9} and cursor hits 1', () => {
  const dist = buildMockDistribution({
    7: 18.0, // green is 7 (odd > 3)
    1: 14.0,
    2: 12.0,
    0: 11.0,
    3: 10.0,
    4: 9.0,
    6: 8.0,
    8: 7.0,
    9: 6.0,
    5: 5.0, // red is 5 (odd > 3)
  });

  const state = createInitialRuntimeState('dual_bar_over3');
  const tick: MarketTick = { epoch: 10, quote: 101.1, digit: 1, symbol: '1HZ25V' };
  const res = evaluateStrategy('dual_bar_over3', dist, tick, state, '1HZ25V');

  assert.ok(res.signal, 'Expected Dual Bar Over 3 signal');
  assert.equal(res.signal?.contractType, 'DIGITOVER');
  assert.equal(res.signal?.barrier, 3);
});

test('Strategy E: Triple Tap - Over 3 triggers on 3 consecutive taps in 0-3 when green in 4-9', () => {
  const dist = buildMockDistribution({
    6: 20.0, // green is 6 (in 4..9)
    0: 10.0,
    1: 10.0,
    2: 10.0,
    3: 10.0,
    4: 8.0,
    5: 8.0,
    7: 8.0,
    8: 8.0,
    9: 8.0,
  });

  let state = createInitialRuntimeState('triple_tap_over3');
  const taps = [0, 2, 1]; // all in 0-3
  let lastRes;
  for (const d of taps) {
    lastRes = evaluateStrategy('triple_tap_over3', dist, { epoch: 10, quote: 10, digit: d, symbol: '1HZ50V' }, state, '1HZ50V');
    state = lastRes.runtimeState;
  }

  assert.ok(lastRes?.signal, 'Expected Triple Tap signal after 3 taps');
  assert.equal(lastRes.signal?.contractType, 'DIGITOVER');
  assert.equal(lastRes.signal?.barrier, 3);
});

test('Strategy F: Under 6 triggers when green <= 5 and cursor hits 8', () => {
  const dist = buildMockDistribution({
    4: 22.0, // green is 4 (<= 5)
    0: 10.0,
    1: 10.0,
    2: 10.0,
    3: 10.0,
    5: 8.0,
    6: 8.0,
    7: 8.0,
    8: 7.0,
    9: 7.0,
  });

  const state = createInitialRuntimeState('under6');
  const tick: MarketTick = { epoch: 10, quote: 108.8, digit: 8, symbol: '1HZ75V' };
  const res = evaluateStrategy('under6', dist, tick, state, '1HZ75V');

  assert.ok(res.signal, 'Expected Under 6 signal');
  assert.equal(res.signal?.contractType, 'DIGITUNDER');
  assert.equal(res.signal?.barrier, 6);
});

test('Strategy G: Under 7 triggers when green <= 6 and cursor hits 9', () => {
  const dist = buildMockDistribution({
    6: 21.0, // green is 6 (<= 6)
    0: 10.0,
    1: 10.0,
    2: 10.0,
    3: 10.0,
    4: 9.0,
    5: 8.0,
    7: 8.0,
    8: 7.0,
    9: 7.0,
  });

  const state = createInitialRuntimeState('under7');
  const tick: MarketTick = { epoch: 10, quote: 109.9, digit: 9, symbol: '1HZ90V' };
  const res = evaluateStrategy('under7', dist, tick, state, '1HZ90V');

  assert.ok(res.signal, 'Expected Under 7 signal');
  assert.equal(res.signal?.contractType, 'DIGITUNDER');
  assert.equal(res.signal?.barrier, 7);
});

test('Strategy H: Digit Frequency Switch selects highest frequency candidate according to table', () => {
  // Digit 2 is at 13.5% (>= 12.3%) -> matches 0
  // Digit 7 is at 12.5% (>= 12% and < 13%) -> Over 4
  const dist = buildMockDistribution({
    2: 13.5,
    7: 12.5,
    0: 10.0,
    1: 10.0,
    3: 10.0,
    4: 10.0,
    5: 9.0,
    6: 9.0,
    8: 8.0,
    9: 8.0,
  });

  const state = createInitialRuntimeState('digit_frequency_switch');
  const tick: MarketTick = { epoch: 10, quote: 10, digit: 2, symbol: '1HZ100V' };
  const res = evaluateStrategy('digit_frequency_switch', dist, tick, state, '1HZ100V');

  assert.ok(res.signal, 'Expected Digit Frequency Switch signal');
  assert.equal(res.signal?.contractType, 'MATCHES');
  assert.equal(res.signal?.barrier, 0, 'Digit 2 >= 12.3% maps to Matches 0');
});

test('ExecutionEngine: Risk validation allows stakes without an app-imposed maximum and enforces Real authorization', async () => {
  const { ExecutionEngine } = await import('./executionEngine');
  const previousStatus = derivWs.status;
  const previousAccount = derivWs.userAccount;

  try {
    const mockDemoAccount: UserAccount = {
      authType: 'oauth',
      accountId: 'VRTC123456',
      loginid: 'VRTC123456',
      isVirtual: true,
      currency: 'USD',
      balance: 500,
      realTradingAuthorized: false,
    };

    derivWs.status = 'authorized';
    derivWs.userAccount = mockDemoAccount;

    const engine = new ExecutionEngine();
    engine.updateRiskConfig({
      takeProfit: 50.0,
      stopLoss: 20.0,
      isTradingPaused: false,
    });

    // A valid authenticated Demo account has no app-imposed maximum stake.
    const check1 = engine.validateRisk(30.0, mockDemoAccount, 'demo');
    assert.equal(check1.valid, true);

    // A Real account without explicit user authorization must be blocked.
    const mockRealAccount: UserAccount = {
      authType: 'oauth',
      accountId: 'CR123456',
      loginid: 'CR123456',
      isVirtual: false,
      currency: 'USD',
      balance: 500,
      realTradingAuthorized: false,
    };

    derivWs.userAccount = mockRealAccount;
    const checkReal = engine.validateRisk(5.0, mockRealAccount, 'real');
    assert.equal(checkReal.valid, false);
    assert.match(checkReal.reason!, /Real purchases disabled/);
  } finally {
    derivWs.status = previousStatus;
    derivWs.userAccount = previousAccount;
  }
});

test('ExecutionEngine: Settlement processing is strictly idempotent and manages cycles', async () => {
  const { ExecutionEngine } = await import('./executionEngine');
  StorageService.saveActiveTrades([makePendingTrade('test_contract_999')]);
  const engine = new ExecutionEngine();
  const stateMap = new Map();

  const tradeData = {
    contractId: 'test_contract_999',
    symbol: '1HZ10V',
    profit: 0.95,
    status: 'won' as const,
  };

  // First settlement
  const res1 = engine.processSettlement(tradeData, stateMap);
  assert.ok(res1);
  assert.equal(res1.updatedTrade.status, 'won');

  // Second settlement with SAME contract ID must be rejected (idempotency)
  const res2 = engine.processSettlement(tradeData, stateMap);
  assert.equal(res2, null, 'Duplicate settlement must be safely ignored');
});

test('Analytics: buildSvgPath computes valid line and area SVG paths with accurate scaling', async () => {
  const { buildSvgPath } = await import('./analytics');
  const values = [10, 20, 15, 30];
  const { linePath, areaPath, points } = buildSvgPath(values, 300, 150);

  assert.ok(linePath.startsWith(' M'));
  assert.ok(areaPath.includes(' Z'));
  assert.equal(points.length, 4);
  assert.equal(points[0].val, 10);
  assert.equal(points[3].val, 30);
});

test('ExecutionEngine: Cycle-level Take Profit and Stop Loss reset cycle stake without locking entire account', async () => {
  const { ExecutionEngine } = await import('./executionEngine');
  StorageService.saveActiveTrades([
    makePendingTrade('test_tp_1'),
    makePendingTrade('test_sl_1'),
  ]);
  const engine = new ExecutionEngine();
  engine.resetRiskSession(1000);

  // 1. Initial configuration: Cycle TP = $5, Cycle SL = $3, initial stake = $1
  engine.updateRiskConfig({ takeProfit: 5, stopLoss: 3, initialStake: 1.0 });
  const runtimeMap = new Map();
  const state = {
    strategyId: 'matches',
    currentStake: 1.0,
    cycleCount: 0,
    cycleTradeIndex: 0,
    martingaleStep: 0,
    cycleProfit: 0,
    consecutiveBelow5: 0,
    consecutiveAbove5: 0,
    consecutiveBelow4: 0,
    maxRunsPerCycle: 20,
  };
  runtimeMap.set('matches', state);

  // 2. Win +$6 (reaches Cycle TP of $5)
  const res1 = engine.processSettlement(
    { contractId: 'test_tp_1', status: 'won', profit: 6.0, strategyId: 'matches', stake: 1.0 },
    runtimeMap
  );
  assert.ok(res1);
  assert.equal(res1.nextRuntimeState!.cycleCount, 1, 'Cycle count must increment on cycle TP hit');
  assert.equal(res1.nextRuntimeState!.cycleTradeIndex, 0, 'Cycle trade index must reset to 0');
  assert.equal(res1.nextRuntimeState!.currentStake, 1.0, 'Stake must reset to initialStake');
  assert.equal(res1.nextRuntimeState!.cycleProfit, 0, 'Cycle profit must reset for next cycle');
    assert.equal(res1.nextRuntimeState!.lastCycleProfit, 6.0, 'Completed winning cycle result must be retained');

  // Account is NOT locked: validateRisk returns valid: true
  assert.equal(engine.getRiskConfig('demo').isTradingPaused, false, 'Account must remain unlocked after cycle TP');

  // 3. Loss -$4 (hits Cycle SL of $3)
  const res2 = engine.processSettlement(
    { contractId: 'test_sl_1', status: 'lost', profit: -4.0, strategyId: 'matches', stake: 1.0 },
    runtimeMap
  );
  assert.ok(res2);
  assert.equal(res2.nextRuntimeState!.cycleCount, 2, 'Cycle count must increment on cycle SL hit');
  assert.equal(res2.nextRuntimeState!.cycleTradeIndex, 0, 'Cycle trade index must reset to 0 on SL');
  assert.equal(res2.nextRuntimeState!.currentStake, 1.0, 'Stake must reset to initialStake on SL');
  assert.equal(res2.nextRuntimeState!.cycleProfit, 0, 'Cycle profit must reset for next cycle');
    assert.equal(res2.nextRuntimeState!.lastCycleProfit, -4.0, 'Completed losing cycle result must be retained');

  // Account is still NOT locked
  assert.equal(engine.getRiskConfig('demo').isTradingPaused, false, 'Account must remain unlocked after cycle SL');

  // 4. Test manual reset helpers
});

test('AffiliateCommissions: computeAffiliateMetrics and calculateProjectedCommissions work accurately', async () => {
  const { computeAffiliateMetrics, calculateProjectedCommissions, MOCK_AFFILIATE_7D } = await import('./analytics.ts');

  const metrics = computeAffiliateMetrics(MOCK_AFFILIATE_7D, 0.35);
  assert.equal(metrics.totalSignups, 523);
  assert.equal(metrics.activeTraders, 358);
  assert.equal(metrics.signupsToday, 14);
  assert.ok(metrics.totalTurnover > 1000000);
  assert.ok(metrics.totalEarnings > 4000);
  assert.ok(metrics.conversionRate > 60);

  // Projection test
  const proj = calculateProjectedCommissions(100, 200, 0.35, 0.60);
  // 100 * 0.60 = 60 active traders
  // 60 * 200 * 30 = 360,000 monthly turnover
  // 360,000 * 0.0035 = 1,260 monthly commission
  assert.equal(proj.activeTraders, 60);
  assert.equal(proj.monthlyTurnover, 360000);
  assert.equal(proj.monthlyEarnings, 1260);
  assert.equal(proj.annualEarnings, 1260 * 12);
});

test('Strategy Matches: triggers predicting 2nd most appearing digit when diff <= 0.3% and cursor strikes green digit', () => {
  const dist = buildMockDistribution({
    7: 15.0, // Most frequent (Green)
    2: 14.8, // 2nd most frequent (Blue, diff = 0.20% <= 0.30%)
    0: 8.0,
    1: 8.0,
    3: 8.0,
    4: 8.0,
    5: 8.0,
    6: 8.0,
    8: 8.0,
    9: 8.0,
  });

  const state = createInitialRuntimeState('matches', 1.0);
  state.maxRunsPerCycle = 10;
  state.martingaleEnabled = true;

  // 1. Initial entry trigger: cursor hits Green digit 7
  const initialTick: MarketTick = { epoch: 100, quote: 1200.07, digit: 7, symbol: '1HZ10V' };
  const res1 = evaluateStrategy('matches', dist, initialTick, state, '1HZ10V');
  assert.ok(res1.signal !== null, 'Entry must trigger signal when cursor strikes green digit');
  assert.equal(res1.signal?.contractType, 'MATCHES');
  assert.equal(res1.signal?.barrier, 2, 'Must predict 2nd most frequent digit');

  // 2. Next tick: cursor arrives on digit 4 (NOT green 7). It must NOT trigger a trade because cursor is not on green digit
  const nextTick: MarketTick = { epoch: 101, quote: 1200.04, digit: 4, symbol: '1HZ10V' };
  const res2 = evaluateStrategy('matches', dist, nextTick, res1.runtimeState, '1HZ10V');
  assert.equal(res2.signal, null, 'Must not trigger trade when cursor is not on green digit (runs as initially designed)');
});

test('ExecutionEngine: respects configurable runs per cycle and custom strategies', async () => {
  const { ExecutionEngine } = await import('./executionEngine');
  StorageService.saveActiveTrades([
    makePendingTrade('test_c1'),
    makePendingTrade('test_c2'),
    makePendingTrade('test_c3'),
  ]);
  const engine = new ExecutionEngine();
  engine.updateRiskConfig({ stopLoss: 0, takeProfit: 0 });
  const runtimeMap = new Map();
  const state = createInitialRuntimeState('matches', 2.0);
  state.maxRunsPerCycle = 3; // Configured to 3 runs, NOT 5!
  state.martingaleEnabled = false;
  runtimeMap.set('matches', state);

  // Settlement 1
  const res1 = engine.processSettlement({ contractId: 'test_c1', status: 'lost', profit: -2.0, strategyId: 'matches' }, runtimeMap);
  assert.equal(res1?.nextRuntimeState!.cycleTradeIndex, 1);
  assert.equal(res1?.nextRuntimeState!.cycleCount, 0);

  // Settlement 2
  const res2 = engine.processSettlement({ contractId: 'test_c2', status: 'lost', profit: -2.0, strategyId: 'matches' }, runtimeMap);
  assert.equal(res2?.nextRuntimeState!.cycleTradeIndex, 2);
  assert.equal(res2?.nextRuntimeState!.cycleCount, 0);

  // Settlement 3 (Reaches configured limit of 3!)
  const res3 = engine.processSettlement({ contractId: 'test_c3', status: 'lost', profit: -2.0, strategyId: 'matches' }, runtimeMap);
  assert.equal(res3?.nextRuntimeState!.cycleTradeIndex, 0, 'Must reset trade index on reaching configured cycle limit');
  assert.equal(res3?.nextRuntimeState!.cycleCount, 1, 'Must increment completed cycle count');
});

test('Strategies: getMergedStrategyMetas and evaluateStrategy apply admin overrides', async () => {
  const { getMergedStrategyMetas } = await import('./strategies');
  const overrides = {
    over5: {
      id: 'over5',
      name: 'Rampage Over 4 Scalper',
      description: 'Modified barrier 4',
      defaultBarrier: 4,
      maxRunsPerCycle: 20,
      consecutiveRequired: 2,
    },
  };

  const merged = getMergedStrategyMetas(overrides);
  assert.equal(merged.over5.name, 'Rampage Over 4 Scalper');
  assert.equal(merged.over5.defaultBarrier, 4);
  assert.equal(merged.over5.cycleLimit, 20);

  // Evaluate over5 with override consecutive taps = 2
  const dist = buildMockDistribution({ 6: 12, 7: 12, 8: 12, 9: 12, 0: 5, 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 });
  const state = createInitialRuntimeState('over5', 1.0);
  state.consecutiveBelow5 = 1; // 1 tap recorded

  // Second tap on digit 2 triggers because override requirement is only 2!
  const tick: MarketTick = { epoch: 200, quote: 550.2, digit: 2, symbol: '1HZ25V' };
  const res = evaluateStrategy('over5', dist, tick, state, '1HZ25V', undefined, overrides);
  assert.ok(res.signal !== null, 'Should trigger with override consecutiveRequired = 2');
  assert.equal(res.signal?.barrier, 4, 'Signal barrier should reflect override value 4');
  assert.equal(res.signal?.strategyName, 'Rampage Over 4 Scalper');
});




