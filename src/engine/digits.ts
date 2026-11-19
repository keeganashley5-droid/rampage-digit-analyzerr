import { DigitStats, DistributionAnalysis, MarketTick } from '../types/deriv';

/**
 * Extracts the genuine last digit from a market quote.
 * Respects decimal precision (pip size) to ensure fractional quotes like 124.50 yield 0, not 5.
 */
export function extractLastDigit(quote: number | string, pipSize?: number): number {
  if (quote === undefined || quote === null) {
    return 0;
  }

  let str: string;
  if (typeof quote === 'number') {
    if (typeof pipSize === 'number' && pipSize >= 0) {
      str = quote.toFixed(pipSize);
    } else {
      str = quote.toString();
    }
  } else {
    str = String(quote).trim();
  }

  // Filter only digit characters
  const digitsOnly = str.replace(/\D/g, '');
  if (digitsOnly.length === 0) {
    return 0;
  }

  const lastChar = digitsOnly[digitsOnly.length - 1];
  const parsed = parseInt(lastChar, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Calculates digit distribution 0-9 over the provided tick window.
 * Handles ties and rankings honestly without artificial tie-breakers.
 */
export function calculateDistribution(ticks: MarketTick[]): DistributionAnalysis {
  const counts: number[] = new Array(10).fill(0);
  const totalTicks = ticks.length;

  for (const tick of ticks) {
    const d = tick.digit;
    if (d >= 0 && d <= 9) {
      counts[d] += 1;
    }
  }

  if (totalTicks === 0) {
    const emptyDigits: DigitStats[] = Array.from({ length: 10 }, (_, d) => ({
      digit: d,
      count: 0,
      frequency: 0,
      rank: 1,
      isTied: true,
    }));

    return {
      digits: emptyDigits,
      totalTicks: 0,
      mostFrequent: null,
      secondMostFrequent: null,
      leastFrequent: null,
      frequencyDiffTopTwo: 0,
      hasTiedLeaders: true,
    };
  }

  // Calculate percentages (rounded to 2 decimal places)
  const rawDigits = counts.map((count, digit) => ({
    digit,
    count,
    frequency: Math.round((count / totalTicks) * 10000) / 100, // e.g. 12.35%
  }));

  // Determine ranks with honest tie handling
  // Sort descending by count
  const sorted = [...rawDigits].sort((a, b) => b.count - a.count);

  // Group by count to detect ties
  const rankMap = new Map<number, { rank: number; isTied: boolean }>();
  let currentRank = 1;
  let i = 0;

  while (i < sorted.length) {
    const currentCount = sorted[i].count;
    let tieCount = 1;
    while (i + tieCount < sorted.length && sorted[i + tieCount].count === currentCount) {
      tieCount++;
    }
    const isTied = tieCount > 1;
    rankMap.set(currentCount, { rank: currentRank, isTied });
    i += tieCount;
    currentRank += tieCount;
  }

  const digitStats: DigitStats[] = rawDigits.map((item) => {
    const rankInfo = rankMap.get(item.count) || { rank: 10, isTied: false };
    return {
      digit: item.digit,
      count: item.count,
      frequency: item.frequency,
      rank: rankInfo.rank,
      isTied: rankInfo.isTied,
    };
  });

  // Top 1, Top 2, and Least
  // For most frequent:
  const top1Candidates = digitStats.filter((d) => d.rank === 1);
  const hasTiedLeaders = top1Candidates.length > 1;

  let mostFrequent: DigitStats | null = null;
  let secondMostFrequent: DigitStats | null = null;

  if (top1Candidates.length === 1) {
    mostFrequent = top1Candidates[0];
    // Second most frequent is rank 2 (or next lowest rank if tied at rank 2)
    const rank2Candidates = digitStats.filter((d) => d.rank === 2);
    if (rank2Candidates.length > 0) {
      secondMostFrequent = rank2Candidates[0];
    }
  } else {
    // Shared rank 1
    mostFrequent = null; // Tied leaders!
  }

  // Least frequent: digit with the lowest count
  const minCount = Math.min(...counts);
  const leastCandidates = digitStats.filter((d) => d.count === minCount);
  const leastFrequent = leastCandidates.length === 1 ? leastCandidates[0] : null;

  // Top two frequency difference
  let frequencyDiffTopTwo = 0;
  if (mostFrequent && secondMostFrequent) {
    frequencyDiffTopTwo = Math.round(Math.abs(mostFrequent.frequency - secondMostFrequent.frequency) * 100) / 100;
  }

  return {
    digits: digitStats,
    totalTicks,
    mostFrequent,
    secondMostFrequent,
    leastFrequent,
    frequencyDiffTopTwo,
    hasTiedLeaders,
  };
}
