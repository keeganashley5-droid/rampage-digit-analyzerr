import {
  DistributionAnalysis,
  MarketTick,
  StrategyId,
  StrategyRuleMeta,
  StrategyRuntimeState,
  StrategySignal,
} from '../types/deriv';

export const STRATEGY_METAS: Record<StrategyId, StrategyRuleMeta> = {
  matches: {
    id: 'matches',
    name: 'Matches',
    description: 'Predicts 2nd-most frequent digit when cursor hits most frequent digit and top difference <= 0.3%.',
    contractType: 'MATCHES',
    defaultBarrier: 0,
    cycleLimit: 'unlimited',
    supportsMartingale: true,
  },
  over5: {
    id: 'over5',
    name: 'Over 5',
    description: 'Triggers on next tick after 4 consecutive taps on digits 0-4 when 6-9 all >=10% and green >5.',
    contractType: 'DIGITOVER',
    defaultBarrier: 5,
    cycleLimit: 5,
    supportsMartingale: true,
  },
  under5: {
    id: 'under5',
    name: 'Under 5',
    description: 'Triggers on next tick after 4 consecutive taps on 6-9 when 0-4 all >=10% and green <5 (digit 5 resets).',
    contractType: 'DIGITUNDER',
    defaultBarrier: 5,
    cycleLimit: 5,
    supportsMartingale: true,
  },
  dual_bar_over3: {
    id: 'dual_bar_over3',
    name: 'Dual Bar – Over 3',
    description: 'Triggers Over 3 when both Green and Red bars are on odd digits above 3 (5, 7, 9) and cursor hits 1.',
    contractType: 'DIGITOVER',
    defaultBarrier: 3,
    cycleLimit: 5,
    supportsMartingale: true,
  },
  triple_tap_over3: {
    id: 'triple_tap_over3',
    name: 'Triple Tap – Over 3',
    description: 'Triggers Over 3 on next tick after 3 consecutive taps on 0-3 when green bar is in 4-9 (4-9 resets).',
    contractType: 'DIGITOVER',
    defaultBarrier: 3,
    cycleLimit: 5,
    supportsMartingale: true,
  },
  under6: {
    id: 'under6',
    name: 'Under 6',
    description: 'Triggers Under 6 when green bar is on 0-5 and cursor hits digit 8.',
    contractType: 'DIGITUNDER',
    defaultBarrier: 6,
    cycleLimit: 5,
    supportsMartingale: true,
  },
  under7: {
    id: 'under7',
    name: 'Under 7',
    description: 'Triggers Under 7 when green bar is on 0-6 and cursor hits digit 9.',
    contractType: 'DIGITUNDER',
    defaultBarrier: 7,
    cycleLimit: 5,
    supportsMartingale: true,
  },
  digit_frequency_switch: {
    id: 'digit_frequency_switch',
    name: 'Digit Frequency Switch',
    description: 'Dynamic strategy that selects the highest-frequency qualifying candidate based on specific threshold rules.',
    contractType: 'DIGITOVER',
    defaultBarrier: 3,
    cycleLimit: 'unlimited',
    supportsMartingale: true,
  },
};

export interface StrategyEvaluationResult {
  signal: StrategySignal | null;
  runtimeState: StrategyRuntimeState;
  conditionStatus: {
    ruleDescription: string;
    items: { label: string; met: boolean; detail?: string }[];
  };
}

/**
 * Initializes runtime state for a strategy
 */
export function createInitialRuntimeState(strategyId: StrategyId, initialStake: number = 0.5): StrategyRuntimeState {
  return {
    strategyId,
    currentStake: initialStake,
    cycleCount: 0,
    cycleTradeIndex: 0,
    cycleProfit: 0,
    martingaleStep: 0,
    consecutiveBelow5: 0,
    consecutiveAbove5: 0,
    consecutiveBelow4: 0,
  };
}

/**
 * Returns merged metadata taking into account admin overrides and custom strategies.
 */
export function getMergedStrategyMetas(
  overrides?: Record<string, import('../types/deriv').StrategyOverride>,
  customStrategies?: import('../types/deriv').CustomStrategy[]
): Record<string, StrategyRuleMeta> {
  const result: Record<string, StrategyRuleMeta> = {};

  (Object.keys(STRATEGY_METAS) as StrategyId[]).forEach((id) => {
    const base = STRATEGY_METAS[id];
    const ov = overrides?.[id];
    result[id] = {
      ...base,
      name: ov?.name?.trim() ? ov.name : base.name,
      description: ov?.description?.trim() ? ov.description : base.description,
      defaultBarrier: typeof ov?.defaultBarrier === 'number' ? ov.defaultBarrier : base.defaultBarrier,
      cycleLimit: typeof ov?.maxRunsPerCycle === 'number' ? ov.maxRunsPerCycle : base.cycleLimit,
      supportsMartingale: typeof ov?.martingaleEnabled === 'boolean' ? ov.martingaleEnabled : base.supportsMartingale,
    };
  });

  if (customStrategies) {
    customStrategies.forEach((c) => {
      result[c.id] = {
        id: c.id,
        name: c.name,
        description: c.description,
        contractType: c.contractType,
        defaultBarrier: c.defaultBarrier,
        cycleLimit: c.maxRunsPerCycle || 10,
        supportsMartingale: c.supportsMartingale,
        isCustom: true,
      };
    });
  }

  return result;
}

/**
 * Evaluates a strategy on the arrival of a new tick.
 * Respects admin strategy overrides when present, otherwise applies core conditions.
 */
export function evaluateStrategy(
  strategyId: StrategyId,
  distribution: DistributionAnalysis,
  currentTick: MarketTick,
  runtimeState: StrategyRuntimeState,
  symbol: string,
  customStrategies?: import('../types/deriv').CustomStrategy[],
  strategyOverrides?: Record<string, import('../types/deriv').StrategyOverride>
): StrategyEvaluationResult {
  // Clone runtime state to keep updates immutable and pure
  const state: StrategyRuntimeState = { ...runtimeState };
  const currentDigit = currentTick.digit;
  const { mostFrequent, secondMostFrequent, leastFrequent, frequencyDiffTopTwo, digits } = distribution;
  const override = strategyOverrides?.[strategyId];

  const now = currentTick.epoch || Date.now();

  switch (strategyId) {
    case 'matches': {
      const targetMode = override?.matchesTargetMode || 'second_most_frequent';
      const stratName = override?.name || STRATEGY_METAS.matches.name;
      const maxDiff = typeof override?.defaultBarrier === 'number' && override.defaultBarrier > 0
        ? override.defaultBarrier
        : 0.3;

      // Matches Strategy Entry Trigger (Original non-continuous rule):
      // - No tied leaders (distinct top two)
      // - Frequency difference between top two <= 0.30% (or override)
      // - Cursor strikes the most frequent (green) digit
      // - Predicts 2nd-most frequent (blue) digit (or configured target mode)
      const hasDistinctLeaders = mostFrequent !== null && secondMostFrequent !== null && !distribution.hasTiedLeaders;
      const diffQualifies = frequencyDiffTopTwo <= maxDiff && frequencyDiffTopTwo >= 0;
      const cursorHitsTop = hasDistinctLeaders && currentDigit === mostFrequent.digit;

      let targetDigit = secondMostFrequent ? secondMostFrequent.digit : 0;
      if (targetMode === 'most_frequent' && mostFrequent) {
        targetDigit = mostFrequent.digit;
      } else if (targetMode === 'custom_digit' && typeof override?.matchesCustomDigit === 'number') {
        targetDigit = override.matchesCustomDigit;
      }

      const conditionStatus = {
        ruleDescription: `${stratName} (Diff <= ${maxDiff.toFixed(2)}%, Cursor on Green Digit, Target = #${targetDigit})`,
        items: [
          {
            label: 'Distinct Top Two Leaders (No Ties)',
            met: hasDistinctLeaders,
            detail: hasDistinctLeaders
              ? `Green #${mostFrequent?.digit} (${mostFrequent?.frequency.toFixed(1)}%), Blue #${secondMostFrequent?.digit} (${secondMostFrequent?.frequency.toFixed(1)}%)`
              : 'Tied or insufficient data',
          },
          {
            label: `Top Frequency Diff <= ${maxDiff.toFixed(2)}%`,
            met: diffQualifies,
            detail: `Diff: ${frequencyDiffTopTwo.toFixed(2)}% (Max: ${maxDiff.toFixed(2)}%)`,
          },
          {
            label: 'Live Cursor Hits Green Digit',
            met: cursorHitsTop,
            detail: `Cursor: ${currentDigit} | Target Green: ${mostFrequent?.digit ?? '-'}`,
          },
        ],
      };

      let signal: StrategySignal | null = null;
      if (hasDistinctLeaders && diffQualifies && cursorHitsTop) {
        signal = {
          strategyId: 'matches',
          strategyName: stratName,
          symbol,
          contractType: 'MATCHES',
          barrier: targetDigit,
          triggerDigit: currentDigit,
          reason: `Cursor hit green digit #${mostFrequent.digit}. Top diff ${frequencyDiffTopTwo.toFixed(2)}% <= ${maxDiff.toFixed(2)}%. Strike predicting target digit #${targetDigit}.`,
          timestamp: now,
        };
      }

      return { signal, runtimeState: state, conditionStatus };
    }

    case 'over5': {
      // Rule B: OVER 5
      const barrier = typeof override?.defaultBarrier === 'number' ? override.defaultBarrier : 5;
      const reqTaps = typeof override?.consecutiveRequired === 'number' ? override.consecutiveRequired : 4;
      const stratName = override?.name || STRATEGY_METAS.over5.name;

      const d6 = digits[6]?.frequency ?? 0;
      const d7 = digits[7]?.frequency ?? 0;
      const d8 = digits[8]?.frequency ?? 0;
      const d9 = digits[9]?.frequency ?? 0;
      const freqsQualify = d6 >= 10 && d7 >= 10 && d8 >= 10 && d9 >= 10;
      const greenAbove5 = mostFrequent !== null && mostFrequent.digit > 5;

      const isBelow5 = currentDigit >= 0 && currentDigit <= 4;
      if (isBelow5) {
        state.consecutiveBelow5 += 1;
      } else {
        state.consecutiveBelow5 = 0;
      }

      const conditionStatus = {
        ruleDescription: `${stratName} (Digits 6-9 >= 10%, Green Bar > 5, ${reqTaps} Consecutive Taps on 0-4)`,
        items: [
          {
            label: 'Digits 6, 7, 8, 9 each >= 10%',
            met: freqsQualify,
            detail: `6: ${d6.toFixed(1)}%, 7: ${d7.toFixed(1)}%, 8: ${d8.toFixed(1)}%, 9: ${d9.toFixed(1)}%`,
          },
          {
            label: 'Green Bar on Digit > 5',
            met: greenAbove5,
            detail: mostFrequent ? `Green is #${mostFrequent.digit}` : 'No leader',
          },
          {
            label: `${reqTaps} Consecutive Taps on Digits 0–4`,
            met: state.consecutiveBelow5 >= reqTaps,
            detail: `Progress: ${state.consecutiveBelow5}/${reqTaps} consecutive`,
          },
        ],
      };

      let signal: StrategySignal | null = null;
      if (freqsQualify && greenAbove5 && state.consecutiveBelow5 >= reqTaps) {
        signal = {
          strategyId: 'over5',
          strategyName: stratName,
          symbol,
          contractType: 'DIGITOVER',
          barrier,
          triggerDigit: currentDigit,
          reason: `${reqTaps} consecutive taps on digits < 5 detected. Digits 6-9 are all >= 10%, Green bar is on digit ${mostFrequent?.digit}. Entry scheduled for next tick.`,
          timestamp: now,
        };
        // Reset sequence after firing trigger
        state.consecutiveBelow5 = 0;
      }

      return { signal, runtimeState: state, conditionStatus };
    }

    case 'under5': {
      // Rule C: UNDER 5
      const barrier = typeof override?.defaultBarrier === 'number' ? override.defaultBarrier : 5;
      const reqTaps = typeof override?.consecutiveRequired === 'number' ? override.consecutiveRequired : 4;
      const stratName = override?.name || STRATEGY_METAS.under5.name;

      const d0 = digits[0]?.frequency ?? 0;
      const d1 = digits[1]?.frequency ?? 0;
      const d2 = digits[2]?.frequency ?? 0;
      const d3 = digits[3]?.frequency ?? 0;
      const d4 = digits[4]?.frequency ?? 0;
      const freqsQualify = d0 >= 10 && d1 >= 10 && d2 >= 10 && d3 >= 10 && d4 >= 10;
      const greenBelow5 = mostFrequent !== null && mostFrequent.digit < 5;

      if (currentDigit >= 6 && currentDigit <= 9) {
        state.consecutiveAbove5 += 1;
      } else {
        // Digit 5 or digits 0-4 reset sequence
        state.consecutiveAbove5 = 0;
      }

      const conditionStatus = {
        ruleDescription: `${stratName} (Digits 0-4 >= 10%, Green Bar < 5, ${reqTaps} Consecutive Taps on 6-9)`,
        items: [
          {
            label: 'Digits 0, 1, 2, 3, 4 each >= 10%',
            met: freqsQualify,
            detail: `0-4: [${d0.toFixed(1)}%, ${d1.toFixed(1)}%, ${d2.toFixed(1)}%, ${d3.toFixed(1)}%, ${d4.toFixed(1)}%]`,
          },
          {
            label: 'Green Bar on Digit < 5',
            met: greenBelow5,
            detail: mostFrequent ? `Green is #${mostFrequent.digit}` : 'No leader',
          },
          {
            label: `${reqTaps} Consecutive Taps on Digits 6–9`,
            met: state.consecutiveAbove5 >= reqTaps,
            detail: `Progress: ${state.consecutiveAbove5}/${reqTaps} consecutive (5 resets)`,
          },
        ],
      };

      let signal: StrategySignal | null = null;
      if (freqsQualify && greenBelow5 && state.consecutiveAbove5 >= reqTaps) {
        signal = {
          strategyId: 'under5',
          strategyName: stratName,
          symbol,
          contractType: 'DIGITUNDER',
          barrier,
          triggerDigit: currentDigit,
          reason: `${reqTaps} consecutive taps on digits 6-9 detected. Digits 0-4 all >= 10%, Green bar is on digit ${mostFrequent?.digit}. Entry scheduled for next tick.`,
          timestamp: now,
        };
        state.consecutiveAbove5 = 0;
      }

      return { signal, runtimeState: state, conditionStatus };
    }

    case 'dual_bar_over3': {
      // Rule D: DUAL BAR - OVER 3
      const barrier = typeof override?.defaultBarrier === 'number' ? override.defaultBarrier : 3;
      const stratName = override?.name || STRATEGY_METAS.dual_bar_over3.name;

      const greenDigit = mostFrequent ? mostFrequent.digit : -1;
      const redDigit = leastFrequent ? leastFrequent.digit : -1;

      const oddAbove3 = [5, 7, 9];
      const greenQualifies = oddAbove3.includes(greenDigit);
      const redQualifies = leastFrequent !== null && oddAbove3.includes(redDigit);
      const cursorHits1 = currentDigit === 1;

      const conditionStatus = {
        ruleDescription: `${stratName} (Green and Red bars on 5, 7, or 9; Cursor hits 1)`,
        items: [
          {
            label: 'Green Bar on Odd Digit > 3 (5, 7, 9)',
            met: greenQualifies,
            detail: mostFrequent ? `Green #${greenDigit}` : 'None',
          },
          {
            label: 'Red Bar on Odd Digit > 3 (5, 7, 9)',
            met: redQualifies,
            detail: leastFrequent ? `Red #${redDigit}` : 'Tied or None',
          },
          {
            label: 'Live Cursor Hits Digit 1',
            met: cursorHits1,
            detail: `Current cursor: ${currentDigit}`,
          },
        ],
      };

      let signal: StrategySignal | null = null;
      if (greenQualifies && redQualifies && cursorHits1) {
        signal = {
          strategyId: 'dual_bar_over3',
          strategyName: stratName,
          symbol,
          contractType: 'DIGITOVER',
          barrier,
          triggerDigit: currentDigit,
          reason: `Green bar is on #${greenDigit} and Red bar is on #${redDigit} (both in [5,7,9]). Cursor hit digit 1.`,
          timestamp: now,
        };
      }

      return { signal, runtimeState: state, conditionStatus };
    }

    case 'triple_tap_over3': {
      // Rule E: TRIPLE TAP - OVER 3
      const barrier = typeof override?.defaultBarrier === 'number' ? override.defaultBarrier : 3;
      const reqTaps = typeof override?.consecutiveRequired === 'number' ? override.consecutiveRequired : 3;
      const stratName = override?.name || STRATEGY_METAS.triple_tap_over3.name;
      // - Red bar is not required
      const greenQualifies = mostFrequent !== null && mostFrequent.digit >= 4 && mostFrequent.digit <= 9;

      const isBelow4 = currentDigit >= 0 && currentDigit <= 3;
      if (isBelow4) {
        state.consecutiveBelow4 += 1;
      } else {
        // Digits 4-9 reset sequence
        state.consecutiveBelow4 = 0;
      }

      const conditionStatus = {
        ruleDescription: `${stratName} (Green bar on 4-9, ${reqTaps} consecutive taps on 0-3)`,
        items: [
          {
            label: 'Green Bar on Digits 4–9',
            met: greenQualifies,
            detail: mostFrequent ? `Green #${mostFrequent.digit}` : 'None',
          },
          {
            label: `${reqTaps} Consecutive Taps on Digits 0–3`,
            met: state.consecutiveBelow4 >= reqTaps,
            detail: `Progress: ${state.consecutiveBelow4}/${reqTaps} consecutive (4-9 resets)`,
          },
        ],
      };

      let signal: StrategySignal | null = null;
      if (greenQualifies && state.consecutiveBelow4 >= reqTaps) {
        signal = {
          strategyId: 'triple_tap_over3',
          strategyName: stratName,
          symbol,
          contractType: 'DIGITOVER',
          barrier,
          triggerDigit: currentDigit,
          reason: `${reqTaps} consecutive taps on digits 0-3 achieved. Green bar is on digit ${mostFrequent?.digit}. Entry scheduled for next tick.`,
          timestamp: now,
        };
        state.consecutiveBelow4 = 0;
      }

      return { signal, runtimeState: state, conditionStatus };
    }

    case 'under6': {
      // Rule F: UNDER 6
      const barrier = typeof override?.defaultBarrier === 'number' ? override.defaultBarrier : 6;
      const stratName = override?.name || STRATEGY_METAS.under6.name;

      const greenQualifies = mostFrequent !== null && mostFrequent.digit >= 0 && mostFrequent.digit <= 5;
      const cursorHits8 = currentDigit === 8;

      const conditionStatus = {
        ruleDescription: `${stratName} (Green Bar on 0-5, Cursor Hits 8)`,
        items: [
          {
            label: 'Green Bar on Digits 0–5',
            met: greenQualifies,
            detail: mostFrequent ? `Green #${mostFrequent.digit}` : 'None',
          },
          {
            label: 'Live Cursor Hits Digit 8',
            met: cursorHits8,
            detail: `Current cursor: ${currentDigit}`,
          },
        ],
      };

      let signal: StrategySignal | null = null;
      if (greenQualifies && cursorHits8) {
        signal = {
          strategyId: 'under6',
          strategyName: stratName,
          symbol,
          contractType: 'DIGITUNDER',
          barrier,
          triggerDigit: currentDigit,
          reason: `Green bar is on digit #${mostFrequent?.digit} (<= 5). Cursor hit trigger digit 8.`,
          timestamp: now,
        };
      }

      return { signal, runtimeState: state, conditionStatus };
    }

    case 'under7': {
      // Rule G: UNDER 7
      const barrier = typeof override?.defaultBarrier === 'number' ? override.defaultBarrier : 7;
      const stratName = override?.name || STRATEGY_METAS.under7.name;

      const greenQualifies = mostFrequent !== null && mostFrequent.digit >= 0 && mostFrequent.digit <= 6;
      const cursorHits9 = currentDigit === 9;

      const conditionStatus = {
        ruleDescription: `${stratName} (Green Bar on 0-6, Cursor Hits 9)`,
        items: [
          {
            label: 'Green Bar on Digits 0–6',
            met: greenQualifies,
            detail: mostFrequent ? `Green #${mostFrequent.digit}` : 'None',
          },
          {
            label: 'Live Cursor Hits Digit 9',
            met: cursorHits9,
            detail: `Current cursor: ${currentDigit}`,
          },
        ],
      };

      let signal: StrategySignal | null = null;
      if (greenQualifies && cursorHits9) {
        signal = {
          strategyId: 'under7',
          strategyName: stratName,
          symbol,
          contractType: 'DIGITUNDER',
          barrier,
          triggerDigit: currentDigit,
          reason: `Green bar is on digit #${mostFrequent?.digit} (<= 6). Cursor hit trigger digit 9.`,
          timestamp: now,
        };
      }

      return { signal, runtimeState: state, conditionStatus };
    }

    case 'digit_frequency_switch': {
      // Rule H: DIGIT FREQUENCY SWITCH
      // Predefined frequency rules table:
      // Digit 0: >= 12% -> Under 6
      // Digit 1: >= 12% -> Over 3
      // Digit 2: >= 12.3% -> Matches 0
      // Digit 3: >= 12% -> Over 3
      // Digit 4: >= 12% -> Under 6
      // Digit 5: >= 12% -> Over 3
      // Digit 6: >= 12% -> Under 7
      // Digit 7: >= 13% -> Over 3; else if >= 12% and < 13% -> Over 4
      // Digit 8: >= 12% -> Over 3
      // Digit 9: >= 12% -> Over 3
      // Selects highest-frequency qualifying candidate.
      // Skips tied qualifying leaders.

      interface Candidate {
        digit: number;
        frequency: number;
        contractType: 'DIGITUNDER' | 'DIGITOVER' | 'MATCHES';
        barrier: number;
        ruleDesc: string;
      }

      const qualifyingCandidates: Candidate[] = [];

      for (let d = 0; d <= 9; d++) {
        const freq = digits[d]?.frequency ?? 0;

        if (d === 0 && freq >= 12.0) {
          qualifyingCandidates.push({ digit: 0, frequency: freq, contractType: 'DIGITUNDER', barrier: 6, ruleDesc: 'Digit 0 >= 12% -> Under 6' });
        } else if (d === 1 && freq >= 12.0) {
          qualifyingCandidates.push({ digit: 1, frequency: freq, contractType: 'DIGITOVER', barrier: 3, ruleDesc: 'Digit 1 >= 12% -> Over 3' });
        } else if (d === 2 && freq >= 12.3) {
          qualifyingCandidates.push({ digit: 2, frequency: freq, contractType: 'MATCHES', barrier: 0, ruleDesc: 'Digit 2 >= 12.3% -> Matches 0' });
        } else if (d === 3 && freq >= 12.0) {
          qualifyingCandidates.push({ digit: 3, frequency: freq, contractType: 'DIGITOVER', barrier: 3, ruleDesc: 'Digit 3 >= 12% -> Over 3' });
        } else if (d === 4 && freq >= 12.0) {
          qualifyingCandidates.push({ digit: 4, frequency: freq, contractType: 'DIGITUNDER', barrier: 6, ruleDesc: 'Digit 4 >= 12% -> Under 6' });
        } else if (d === 5 && freq >= 12.0) {
          qualifyingCandidates.push({ digit: 5, frequency: freq, contractType: 'DIGITOVER', barrier: 3, ruleDesc: 'Digit 5 >= 12% -> Over 3' });
        } else if (d === 6 && freq >= 12.0) {
          qualifyingCandidates.push({ digit: 6, frequency: freq, contractType: 'DIGITUNDER', barrier: 7, ruleDesc: 'Digit 6 >= 12% -> Under 7' });
        } else if (d === 7) {
          if (freq >= 13.0) {
            qualifyingCandidates.push({ digit: 7, frequency: freq, contractType: 'DIGITOVER', barrier: 3, ruleDesc: 'Digit 7 >= 13% -> Over 3' });
          } else if (freq >= 12.0) {
            qualifyingCandidates.push({ digit: 7, frequency: freq, contractType: 'DIGITOVER', barrier: 4, ruleDesc: 'Digit 7 >= 12% (<13%) -> Over 4' });
          }
        } else if (d === 8 && freq >= 12.0) {
          qualifyingCandidates.push({ digit: 8, frequency: freq, contractType: 'DIGITOVER', barrier: 3, ruleDesc: 'Digit 8 >= 12% -> Over 3' });
        } else if (d === 9 && freq >= 12.0) {
          qualifyingCandidates.push({ digit: 9, frequency: freq, contractType: 'DIGITOVER', barrier: 3, ruleDesc: 'Digit 9 >= 12% -> Over 3' });
        }
      }

      // Sort descending by frequency
      qualifyingCandidates.sort((a, b) => b.frequency - a.frequency);

      let winner: Candidate | null = null;
      let isTiedWinner = false;

      if (qualifyingCandidates.length > 0) {
        const topFreq = qualifyingCandidates[0].frequency;
        const topCandidates = qualifyingCandidates.filter((c) => c.frequency === topFreq);
        if (topCandidates.length === 1) {
          winner = topCandidates[0];
        } else {
          isTiedWinner = true; // Skips tied qualifying leaders
        }
      }

      const conditionStatus = {
        ruleDescription: 'Digit Frequency Switch (Dynamic threshold mapping, highest freq leader, skips ties)',
        items: [
          {
            label: 'Qualifying Candidates Found',
            met: qualifyingCandidates.length > 0,
            detail: qualifyingCandidates.length > 0
              ? `${qualifyingCandidates.length} candidate(s): ${qualifyingCandidates.map((c) => `#${c.digit} (${c.frequency.toFixed(1)}%)`).join(', ')}`
              : 'None above thresholds',
          },
          {
            label: 'Unique Leading Candidate (No Ties)',
            met: winner !== null && !isTiedWinner,
            detail: isTiedWinner ? 'Tied leading candidates - skipped' : (winner ? `Selected: #${winner.digit} (${winner.frequency.toFixed(1)}%) -> ${winner.ruleDesc}` : 'None'),
          },
        ],
      };

      let signal: StrategySignal | null = null;
      if (winner) {
        signal = {
          strategyId: 'digit_frequency_switch',
          strategyName: STRATEGY_METAS.digit_frequency_switch.name,
          symbol,
          contractType: winner.contractType,
          barrier: winner.barrier,
          triggerDigit: currentDigit,
          reason: `Leading candidate is digit #${winner.digit} with frequency ${winner.frequency.toFixed(1)}%. Triggered ${winner.contractType} ${winner.barrier}.`,
          timestamp: now,
        };
      }

      return { signal, runtimeState: state, conditionStatus };
    }

    default: {
      // Dynamic Custom Strategy Evaluation
      const customMeta = customStrategies?.find((c) => c.id === strategyId && c.isActive);
      if (customMeta) {
        let conditionMet = false;
        let detail = '';

        switch (customMeta.conditionType) {
          case 'frequency_above': {
            const val = customMeta.conditionValue ?? 10;
            const targetDigit = customMeta.defaultBarrier;
            const freq = digits[targetDigit]?.frequency ?? 0;
            conditionMet = freq >= val;
            detail = `Digit #${targetDigit} freq: ${freq.toFixed(1)}% (Target: >= ${val}%)`;
            break;
          }
          case 'frequency_below': {
            const val = customMeta.conditionValue ?? 8;
            const targetDigit = customMeta.defaultBarrier;
            const freq = digits[targetDigit]?.frequency ?? 0;
            conditionMet = freq <= val;
            detail = `Digit #${targetDigit} freq: ${freq.toFixed(1)}% (Target: <= ${val}%)`;
            break;
          }
          case 'cursor_match': {
            const targetDigit = customMeta.conditionValue ?? 0;
            conditionMet = currentDigit === targetDigit;
            detail = `Cursor is #${currentDigit} (Target: #${targetDigit})`;
            break;
          }
          case 'diff_lte': {
            const maxDiff = customMeta.conditionValue ?? 0.5;
            conditionMet = frequencyDiffTopTwo <= maxDiff && !distribution.hasTiedLeaders;
            detail = `Top diff: ${frequencyDiffTopTwo.toFixed(2)}% (Max: ${maxDiff}%)`;
            break;
          }
          case 'consecutive_taps': {
            const targetDigit = customMeta.conditionValue ?? 5;
            const req = customMeta.consecutiveRequired ?? 3;
            if (currentDigit === targetDigit) {
              state.consecutiveBelow4 = (state.consecutiveBelow4 || 0) + 1;
            } else {
              state.consecutiveBelow4 = 0;
            }
            conditionMet = (state.consecutiveBelow4 || 0) >= req;
            detail = `Consecutive taps on #${targetDigit}: ${state.consecutiveBelow4}/${req}`;
            break;
          }
        }

        // Determine target barrier / digit based on targetDigitMode
        let predictedBarrier = customMeta.defaultBarrier;
        if (customMeta.targetDigitMode === 'second_most_frequent') {
          predictedBarrier = secondMostFrequent?.digit ?? 0;
        } else if (customMeta.targetDigitMode === 'most_frequent') {
          predictedBarrier = mostFrequent?.digit ?? 0;
        } else if (customMeta.targetDigitMode === 'least_frequent') {
          predictedBarrier = leastFrequent?.digit ?? 0;
        }

        let signal: StrategySignal | null = null;
        if (conditionMet) {
          signal = {
            strategyId,
            strategyName: customMeta.name,
            symbol,
            contractType: customMeta.contractType,
            barrier: predictedBarrier,
            triggerDigit: currentDigit,
            reason: `Custom strategy condition met: ${detail}. Predicting ${customMeta.contractType} ${predictedBarrier}.`,
            timestamp: now,
          };
        }

        return {
          signal,
          runtimeState: state,
          conditionStatus: {
            ruleDescription: `${customMeta.name}: ${customMeta.description}`,
            items: [
              {
                label: 'Visual Rule Condition',
                met: conditionMet,
                detail,
              },
            ],
          },
        };
      }

      return {
        signal: null,
        runtimeState: state,
        conditionStatus: { ruleDescription: 'Unknown Strategy', items: [] },
      };
    }
  }
}

