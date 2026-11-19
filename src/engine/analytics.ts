export interface AnalyticsPoint {
  date: string;
  dayLabel: string;
  activeUsers: number;
  proSignups: number;
  affiliateConversions: number;
}

export interface AffiliateHistoryPoint {
  date: string;
  label: string;
  signups: number;
  newSignups: number;
  activeTraders: number;
  turnoverVolume: number;
  estimatedEarnings: number;
}

export interface AffiliateMetricsSummary {
  totalSignups: number;
  activeTraders: number;
  totalTurnover: number;
  totalEarnings: number;
  signupsToday: number;
  signupsThisWeek: number;
  earningsThisWeek: number;
  conversionRate: number;
  pendingPayout: number;
  commissionRatePercent: number;
}

export const MOCK_7D_ANALYTICS: AnalyticsPoint[] = [
  { date: '2026-10-31', dayLabel: 'Sat', activeUsers: 1120, proSignups: 195, affiliateConversions: 380 },
  { date: '2026-11-01', dayLabel: 'Sun', activeUsers: 1180, proSignups: 210, affiliateConversions: 405 },
  { date: '2026-11-02', dayLabel: 'Mon', activeUsers: 1225, proSignups: 228, affiliateConversions: 432 },
  { date: '2026-11-03', dayLabel: 'Tue', activeUsers: 1290, proSignups: 245, affiliateConversions: 458 },
  { date: '2026-11-04', dayLabel: 'Wed', activeUsers: 1340, proSignups: 260, affiliateConversions: 480 },
  { date: '2026-11-05', dayLabel: 'Thu', activeUsers: 1385, proSignups: 272, affiliateConversions: 498 },
  { date: '2026-11-06', dayLabel: 'Fri', activeUsers: 1428, proSignups: 284, affiliateConversions: 512 },
];

export const MOCK_30D_ANALYTICS: AnalyticsPoint[] = [
  { date: 'Week 1', dayLabel: 'W1', activeUsers: 840, proSignups: 120, affiliateConversions: 240 },
  { date: 'Week 2', dayLabel: 'W2', activeUsers: 1010, proSignups: 165, affiliateConversions: 310 },
  { date: 'Week 3', dayLabel: 'W3', activeUsers: 1220, proSignups: 220, affiliateConversions: 415 },
  { date: 'Week 4', dayLabel: 'W4', activeUsers: 1428, proSignups: 284, affiliateConversions: 512 },
];

export const MOCK_AFFILIATE_7D: AffiliateHistoryPoint[] = [
  { date: '2026-10-31', label: 'Sat', signups: 468, newSignups: 8, activeTraders: 310, turnoverVolume: 168400, estimatedEarnings: 589.40 },
  { date: '2026-11-01', label: 'Sun', signups: 476, newSignups: 8, activeTraders: 318, turnoverVolume: 172900, estimatedEarnings: 605.15 },
  { date: '2026-11-02', label: 'Mon', signups: 486, newSignups: 10, activeTraders: 326, turnoverVolume: 184200, estimatedEarnings: 644.70 },
  { date: '2026-11-03', label: 'Tue', signups: 494, newSignups: 8, activeTraders: 334, turnoverVolume: 189600, estimatedEarnings: 663.60 },
  { date: '2026-11-04', label: 'Wed', signups: 501, newSignups: 7, activeTraders: 340, turnoverVolume: 194100, estimatedEarnings: 679.35 },
  { date: '2026-11-05', label: 'Thu', signups: 509, newSignups: 8, activeTraders: 345, turnoverVolume: 198500, estimatedEarnings: 694.75 },
  { date: '2026-11-06', label: 'Fri', signups: 523, newSignups: 14, activeTraders: 358, turnoverVolume: 204800, estimatedEarnings: 716.80 },
];

export const MOCK_AFFILIATE_30D: AffiliateHistoryPoint[] = [
  { date: 'Oct 08 - Oct 14', label: 'W1', signups: 390, newSignups: 45, activeTraders: 260, turnoverVolume: 245000, estimatedEarnings: 857.50 },
  { date: 'Oct 15 - Oct 21', label: 'W2', signups: 432, newSignups: 42, activeTraders: 285, turnoverVolume: 288000, estimatedEarnings: 1008.00 },
  { date: 'Oct 22 - Oct 28', label: 'W3', signups: 470, newSignups: 38, activeTraders: 315, turnoverVolume: 325000, estimatedEarnings: 1137.50 },
  { date: 'Oct 29 - Nov 06', label: 'W4', signups: 523, newSignups: 53, activeTraders: 358, turnoverVolume: 422450, estimatedEarnings: 1478.58 },
];

export const MOCK_AFFILIATE_90D: AffiliateHistoryPoint[] = [
  { date: 'August 2026', label: 'Aug', signups: 260, newSignups: 110, activeTraders: 180, turnoverVolume: 620000, estimatedEarnings: 2170.00 },
  { date: 'September 2026', label: 'Sep', signups: 390, newSignups: 130, activeTraders: 265, turnoverVolume: 890000, estimatedEarnings: 3115.00 },
  { date: 'October 2026', label: 'Oct', signups: 490, newSignups: 100, activeTraders: 335, turnoverVolume: 1140000, estimatedEarnings: 3990.00 },
  { date: 'November (MTD)', label: 'Nov', signups: 523, newSignups: 33, activeTraders: 358, turnoverVolume: 352000, estimatedEarnings: 1232.00 },
];

/**
 * Computes overall summary statistics for a given series of affiliate data points
 */
export function computeAffiliateMetrics(
  history: AffiliateHistoryPoint[],
  commissionRatePercent = 0.35
): AffiliateMetricsSummary {
  if (history.length === 0) {
    return {
      totalSignups: 0,
      activeTraders: 0,
      totalTurnover: 0,
      totalEarnings: 0,
      signupsToday: 0,
      signupsThisWeek: 0,
      earningsThisWeek: 0,
      conversionRate: 0,
      pendingPayout: 0,
      commissionRatePercent,
    };
  }

  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;

  const totalSignups = latest.signups;
  const activeTraders = latest.activeTraders;
  const totalTurnover = history.reduce((sum, p) => sum + p.turnoverVolume, 0);
  const totalEarnings = history.reduce((sum, p) => sum + p.estimatedEarnings, 0);

  const signupsToday = latest.newSignups;
  const signupsThisWeek = history.slice(-7).reduce((sum, p) => sum + p.newSignups, 0);
  const earningsThisWeek = history.slice(-7).reduce((sum, p) => sum + p.estimatedEarnings, 0);

  // Deriv partner conversion rate: active traders / total registrations
  const conversionRate = totalSignups > 0 ? (activeTraders / totalSignups) * 100 : 0;
  // Pending payout calculation: recent 14-day earnings
  const pendingPayout = Math.round(earningsThisWeek * 1.8 * 100) / 100;

  return {
    totalSignups,
    activeTraders,
    totalTurnover,
    totalEarnings,
    signupsToday,
    signupsThisWeek,
    earningsThisWeek,
    conversionRate: Math.round(conversionRate * 10) / 10,
    pendingPayout,
    commissionRatePercent,
  };
}

/**
 * Estimates monthly and annual commissions based on user simulation inputs
 */
export function calculateProjectedCommissions(
  monthlySignups: number,
  avgDailyVolumePerTrader: number,
  commissionRatePercent = 0.35,
  activeRatio = 0.65
): {
  activeTraders: number;
  monthlyTurnover: number;
  monthlyEarnings: number;
  annualEarnings: number;
} {
  const activeTraders = Math.round(monthlySignups * activeRatio);
  const monthlyTurnover = activeTraders * avgDailyVolumePerTrader * 30;
  const monthlyEarnings = monthlyTurnover * (commissionRatePercent / 100);
  const annualEarnings = monthlyEarnings * 12;

  return {
    activeTraders,
    monthlyTurnover: Math.round(monthlyTurnover),
    monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
    annualEarnings: Math.round(annualEarnings * 100) / 100,
  };
}

/**
 * Builds SVG path string for a series
 */
export function buildSvgPath(
  values: number[],
  width: number,
  height: number,
  padding = { top: 20, right: 20, bottom: 30, left: 40 },
  customMax?: number
): { linePath: string; areaPath: string; points: { x: number; y: number; val: number }[] } {
  if (values.length === 0) {
    return { linePath: '', areaPath: '', points: [] };
  }

  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const min = 0;
  const max = customMax ?? Math.max(...values, 10);

  const points = values.map((val, idx) => {
    const x = padding.left + (idx / Math.max(values.length - 1, 1)) * innerWidth;
    const y = padding.top + innerHeight - ((val - min) / (max - min || 1)) * innerHeight;
    return { x, y, val };
  });

  const linePath = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
  const groundY = (padding.top + innerHeight).toFixed(1);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${groundY} L ${points[0].x.toFixed(1)} ${groundY} Z`;

  return { linePath, areaPath, points };
}
