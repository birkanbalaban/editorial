import { EditorialEngagementPoint } from '../types/editorial';

export interface AggregateMetrics {
  totalReach: number;
  totalLikes: number;
  totalShares: number;
  totalSaves: number;
  averageEngagementRate: number;
  bestPerformingDate?: string;
  bestPerformingReach: number;
}

/**
 * Calculates summary metrics across engagement data points.
 */
export function calculateAggregateMetrics(data: EditorialEngagementPoint[]): AggregateMetrics {
  if (!data || data.length === 0) {
    return {
      totalReach: 0,
      totalLikes: 0,
      totalShares: 0,
      totalSaves: 0,
      averageEngagementRate: 0,
      bestPerformingReach: 0,
    };
  }

  const totals = data.reduce(
    (acc, item) => {
      acc.reach += item.reach;
      acc.likes += item.likes;
      acc.shares += item.shares;
      acc.saves += item.saves;
      acc.rateSum += item.engagementRate;
      if (item.reach > acc.bestReach) {
        acc.bestReach = item.reach;
        acc.bestDate = item.date;
      }
      return acc;
    },
    { reach: 0, likes: 0, shares: 0, saves: 0, rateSum: 0, bestReach: 0, bestDate: '' }
  );

  return {
    totalReach: totals.reach,
    totalLikes: totals.likes,
    totalShares: totals.shares,
    totalSaves: totals.saves,
    averageEngagementRate: Number((totals.rateSum / data.length).toFixed(1)),
    bestPerformingDate: totals.bestDate,
    bestPerformingReach: totals.bestReach,
  };
}

/**
 * Calculates percentage growth between two periods.
 */
export function calculateGrowthRate(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  const growth = ((current - previous) / previous) * 100;
  return Number(growth.toFixed(1));
}

/**
 * Filters engagement data points based on selected time window.
 */
export function filterMetricsByTimeframe(
  data: EditorialEngagementPoint[],
  timeframe: '7d' | '30d' | 'all'
): EditorialEngagementPoint[] {
  if (timeframe === '7d') {
    return data.slice(-7);
  }
  if (timeframe === '30d') {
    return data.slice(-30);
  }
  return data;
}

export interface EngagementPointWithSMA extends EditorialEngagementPoint {
  likesSMA: number;
  sharesSMA: number;
  reachSMA: number;
}

/**
 * Computes simple moving averages (SMA) for likes and shares over a specified window.
 * For initial points where available history is less than windowSize,
 * averages over the available prefix (1 to i+1 items) to provide smooth continuous lines.
 */
export function calculateMovingAverages(
  data: EditorialEngagementPoint[],
  windowSize = 3
): EngagementPointWithSMA[] {
  if (!data || data.length === 0) return [];
  const safeWindow = Math.max(1, windowSize);

  return data.map((item, index) => {
    const startIndex = Math.max(0, index - safeWindow + 1);
    const windowSlice = data.slice(startIndex, index + 1);
    const count = windowSlice.length;

    const sumLikes = windowSlice.reduce((acc, curr) => acc + curr.likes, 0);
    const sumShares = windowSlice.reduce((acc, curr) => acc + curr.shares, 0);
    const sumReach = windowSlice.reduce((acc, curr) => acc + curr.reach, 0);

    return {
      ...item,
      likesSMA: Math.round(sumLikes / count),
      sharesSMA: Math.round(sumShares / count),
      reachSMA: Math.round(sumReach / count),
    };
  });
}

/**
 * Calculates percentage momentum of the moving average between start and end of series.
 */
export function calculateTrendMomentum(pointsWithSMA: EngagementPointWithSMA[]): {
  likesTrendPct: number;
  sharesTrendPct: number;
  direction: 'upward' | 'downward' | 'stable';
} {
  if (!pointsWithSMA || pointsWithSMA.length < 2) {
    return { likesTrendPct: 0, sharesTrendPct: 0, direction: 'stable' };
  }
  const first = pointsWithSMA[0];
  const last = pointsWithSMA[pointsWithSMA.length - 1];

  const likesTrendPct = calculateGrowthRate(last.likesSMA, first.likesSMA);
  const sharesTrendPct = calculateGrowthRate(last.sharesSMA, first.sharesSMA);

  let direction: 'upward' | 'downward' | 'stable' = 'stable';
  if (likesTrendPct > 2 && sharesTrendPct >= 0) direction = 'upward';
  else if (likesTrendPct < -2 && sharesTrendPct < 0) direction = 'downward';

  return { likesTrendPct, sharesTrendPct, direction };
}

export interface PeriodComparisonItem {
  dayIndex: number;
  label: string;
  periodADate: string;
  periodBDate: string;
  periodAReach: number;
  periodBReach: number;
  periodALikes: number;
  periodBLikes: number;
  periodAShares: number;
  periodBShares: number;
  periodARate: number;
  periodBRate: number;
}

export interface MetricComparisonRow {
  metric: string;
  valueA: number;
  valueB: number;
  delta: number;
  percentDiff: number;
  winner: 'A' | 'B' | 'Tie';
  formattedA: string;
  formattedB: string;
}

export interface PeriodComparisonSummary {
  periodA: AggregateMetrics;
  periodB: AggregateMetrics;
  reachGrowth: number;
  likesGrowth: number;
  sharesGrowth: number;
  rateDelta: number;
  chartData: PeriodComparisonItem[];
}

export interface CampaignComparisonSummary {
  campaignA: EditorialEngagementPoint;
  campaignB: EditorialEngagementPoint;
  metrics: MetricComparisonRow[];
  chartData: Array<{
    metric: string;
    campaignA: number;
    campaignB: number;
    nameA: string;
    nameB: string;
  }>;
}

/**
 * Compares two sequential or custom time periods side-by-side.
 */
export function compareTimePeriods(
  periodA: EditorialEngagementPoint[],
  periodB: EditorialEngagementPoint[]
): PeriodComparisonSummary {
  const summaryA = calculateAggregateMetrics(periodA);
  const summaryB = calculateAggregateMetrics(periodB);

  const maxLen = Math.max(periodA.length, periodB.length);
  const chartData: PeriodComparisonItem[] = [];

  for (let i = 0; i < maxLen; i++) {
    const ptA = periodA[i] || {
      date: `Day ${i + 1}`,
      reach: 0,
      likes: 0,
      shares: 0,
      saves: 0,
      engagementRate: 0,
    };
    const ptB = periodB[i] || {
      date: `Day ${i + 1}`,
      reach: 0,
      likes: 0,
      shares: 0,
      saves: 0,
      engagementRate: 0,
    };

    chartData.push({
      dayIndex: i + 1,
      label: `Day ${i + 1}`,
      periodADate: ptA.date,
      periodBDate: ptB.date,
      periodAReach: ptA.reach,
      periodBReach: ptB.reach,
      periodALikes: ptA.likes,
      periodBLikes: ptB.likes,
      periodAShares: ptA.shares + (ptA.saves || 0),
      periodBShares: ptB.shares + (ptB.saves || 0),
      periodARate: ptA.engagementRate,
      periodBRate: ptB.engagementRate,
    });
  }

  return {
    periodA: summaryA,
    periodB: summaryB,
    reachGrowth: calculateGrowthRate(summaryB.totalReach, summaryA.totalReach),
    likesGrowth: calculateGrowthRate(summaryB.totalLikes, summaryA.totalLikes),
    sharesGrowth: calculateGrowthRate(
      summaryB.totalShares + summaryB.totalSaves,
      summaryA.totalShares + summaryA.totalSaves
    ),
    rateDelta: Number((summaryB.averageEngagementRate - summaryA.averageEngagementRate).toFixed(1)),
    chartData,
  };
}

/**
 * Compares two distinct editorial campaigns/monographs side-by-side.
 */
export function compareEditorialCampaigns(
  campaignA: EditorialEngagementPoint,
  campaignB: EditorialEngagementPoint
): CampaignComparisonSummary {
  const buildRow = (
    metricName: string,
    valA: number,
    valB: number,
    formatter: (v: number) => string
  ): MetricComparisonRow => {
    const delta = valB - valA;
    const percentDiff = calculateGrowthRate(valB, valA);
    let winner: 'A' | 'B' | 'Tie' = 'Tie';
    if (valB > valA) winner = 'B';
    else if (valA > valB) winner = 'A';

    return {
      metric: metricName,
      valueA: valA,
      valueB: valB,
      delta,
      percentDiff,
      winner,
      formattedA: formatter(valA),
      formattedB: formatter(valB),
    };
  };

  const nameA = campaignA.postTitle || 'Campaign A';
  const nameB = campaignB.postTitle || 'Campaign B';

  const metrics: MetricComparisonRow[] = [
    buildRow('Audience Reach', campaignA.reach, campaignB.reach, (v) => v.toLocaleString()),
    buildRow('Curatorial Likes', campaignA.likes, campaignB.likes, (v) => v.toLocaleString()),
    buildRow('Archival Shares', campaignA.shares, campaignB.shares, (v) => v.toLocaleString()),
    buildRow('Saved Monographs', campaignA.saves, campaignB.saves, (v) => v.toLocaleString()),
    buildRow(
      'Engagement Rate',
      campaignA.engagementRate,
      campaignB.engagementRate,
      (v) => `${v.toFixed(1)}%`
    ),
  ];

  const chartData = [
    {
      metric: 'Likes',
      campaignA: campaignA.likes,
      campaignB: campaignB.likes,
      nameA,
      nameB,
    },
    {
      metric: 'Shares',
      campaignA: campaignA.shares,
      campaignB: campaignB.shares,
      nameA,
      nameB,
    },
    {
      metric: 'Saves',
      campaignA: campaignA.saves,
      campaignB: campaignB.saves,
      nameA,
      nameB,
    },
  ];

  return {
    campaignA,
    campaignB,
    metrics,
    chartData,
  };
}
