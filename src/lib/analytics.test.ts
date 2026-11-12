import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateAggregateMetrics, 
  calculateGrowthRate, 
  filterMetricsByTimeframe,
  compareTimePeriods,
  compareEditorialCampaigns,
  calculateMovingAverages,
  calculateTrendMomentum
} from './analytics';
import { EditorialEngagementPoint } from '../types/editorial';

const sampleData: EditorialEngagementPoint[] = [
  {
    date: '11/05',
    fullDate: '2026-11-05',
    reach: 10000,
    likes: 1000,
    shares: 200,
    saves: 150,
    engagementRate: 13.5,
  },
  {
    date: '11/06',
    fullDate: '2026-11-06',
    reach: 20000,
    likes: 2000,
    shares: 400,
    saves: 300,
    engagementRate: 13.5,
  },
];

test('calculateAggregateMetrics computes totals and average engagement rate', () => {
  const result = calculateAggregateMetrics(sampleData);
  assert.equal(result.totalReach, 30000);
  assert.equal(result.totalLikes, 3000);
  assert.equal(result.totalShares, 600);
  assert.equal(result.totalSaves, 450);
  assert.equal(result.averageEngagementRate, 13.5);
  assert.equal(result.bestPerformingReach, 20000);
  assert.equal(result.bestPerformingDate, '11/06');
});

test('calculateGrowthRate computes percentage increase correctly', () => {
  assert.equal(calculateGrowthRate(150, 100), 50.0);
  assert.equal(calculateGrowthRate(80, 100), -20.0);
  assert.equal(calculateGrowthRate(50, 0), 100);
});

test('filterMetricsByTimeframe slices recent 7 points', () => {
  const tenPoints: EditorialEngagementPoint[] = Array.from({ length: 10 }, (_, i) => ({
    date: `11/${i + 1}`,
    fullDate: `2026-11-${String(i + 1).padStart(2, '0')}`,
    reach: (i + 1) * 1000,
    likes: (i + 1) * 100,
    shares: 20,
    saves: 10,
    engagementRate: 12.0,
  }));

  const last7 = filterMetricsByTimeframe(tenPoints, '7d');
  assert.equal(last7.length, 7);
  assert.equal(last7[0].date, '11/4');
  assert.equal(last7[6].date, '11/10');
});

test('compareTimePeriods computes growth and daily chart data across two periods', () => {
  const periodA: EditorialEngagementPoint[] = [
    { date: '11/01', fullDate: '2026-11-01', reach: 10000, likes: 1000, shares: 100, saves: 50, engagementRate: 11.5 },
    { date: '11/02', fullDate: '2026-11-02', reach: 12000, likes: 1200, shares: 120, saves: 60, engagementRate: 11.5 },
  ];
  const periodB: EditorialEngagementPoint[] = [
    { date: '11/08', fullDate: '2026-11-08', reach: 15000, likes: 1800, shares: 200, saves: 100, engagementRate: 14.0 },
    { date: '11/09', fullDate: '2026-11-09', reach: 18000, likes: 2200, shares: 250, saves: 120, engagementRate: 14.3 },
  ];

  const comparison = compareTimePeriods(periodA, periodB);
  assert.equal(comparison.periodA.totalReach, 22000);
  assert.equal(comparison.periodB.totalReach, 33000);
  assert.equal(comparison.reachGrowth, 50.0);
  assert.equal(comparison.chartData.length, 2);
  assert.equal(comparison.chartData[0].periodAReach, 10000);
  assert.equal(comparison.chartData[0].periodBReach, 15000);
  assert.equal(comparison.chartData[1].periodALikes, 1200);
  assert.equal(comparison.chartData[1].periodBLikes, 2200);
});

test('compareEditorialCampaigns calculates metric deltas and winner', () => {
  const campaignA: EditorialEngagementPoint = {
    date: '11/09',
    fullDate: '2026-11-09',
    postTitle: 'Sculptural Geometry & Chiaroscuro',
    photographer: 'Paolo Roversi',
    reach: 33800,
    likes: 4890,
    shares: 1420,
    saves: 1210,
    engagementRate: 17.3,
  };

  const campaignB: EditorialEngagementPoint = {
    date: '11/10',
    fullDate: '2026-11-10',
    postTitle: 'Monolith in Motion: Brutal Romance',
    photographer: 'Sølve Sundsbø',
    reach: 38200,
    likes: 5640,
    shares: 1710,
    saves: 1490,
    engagementRate: 17.8,
  };

  const comparison = compareEditorialCampaigns(campaignA, campaignB);
  assert.equal(comparison.metrics.length, 5);
  
  const reachRow = comparison.metrics.find(m => m.metric === 'Audience Reach');
  assert.ok(reachRow);
  assert.equal(reachRow.delta, 4400);
  assert.equal(reachRow.winner, 'B');
  assert.equal(reachRow.percentDiff, 13.0);

  assert.equal(comparison.chartData.length, 3);
  assert.equal(comparison.chartData[0].metric, 'Likes');
  assert.equal(comparison.chartData[0].campaignA, 4890);
  assert.equal(comparison.chartData[0].campaignB, 5640);
});

test('calculateMovingAverages computes correct window averages for likes and shares', () => {
  const points: EditorialEngagementPoint[] = [
    { date: '11/01', fullDate: '2026-11-01', reach: 1000, likes: 100, shares: 10, saves: 5, engagementRate: 10 },
    { date: '11/02', fullDate: '2026-11-02', reach: 2000, likes: 200, shares: 20, saves: 10, engagementRate: 10 },
    { date: '11/03', fullDate: '2026-11-03', reach: 3000, likes: 300, shares: 30, saves: 15, engagementRate: 10 },
    { date: '11/04', fullDate: '2026-11-04', reach: 4000, likes: 600, shares: 40, saves: 20, engagementRate: 10 },
  ];

  const result = calculateMovingAverages(points, 3);
  assert.equal(result.length, 4);

  // Index 0: window of 1 (100) -> 100
  assert.equal(result[0].likesSMA, 100);
  assert.equal(result[0].sharesSMA, 10);

  // Index 1: window of 2 (100 + 200)/2 -> 150
  assert.equal(result[1].likesSMA, 150);
  assert.equal(result[1].sharesSMA, 15);

  // Index 2: window of 3 (100 + 200 + 300)/3 -> 200
  assert.equal(result[2].likesSMA, 200);
  assert.equal(result[2].sharesSMA, 20);

  // Index 3: window of 3 (200 + 300 + 600)/3 -> 367
  assert.equal(result[3].likesSMA, 367);
  assert.equal(result[3].sharesSMA, 30);
});

test('calculateTrendMomentum identifies upward momentum', () => {
  const points: EditorialEngagementPoint[] = [
    { date: '11/01', fullDate: '2026-11-01', reach: 1000, likes: 100, shares: 10, saves: 5, engagementRate: 10 },
    { date: '11/02', fullDate: '2026-11-02', reach: 2000, likes: 200, shares: 20, saves: 10, engagementRate: 10 },
    { date: '11/03', fullDate: '2026-11-03', reach: 3000, likes: 300, shares: 30, saves: 15, engagementRate: 10 },
  ];

  const smaPoints = calculateMovingAverages(points, 3);
  const momentum = calculateTrendMomentum(smaPoints);

  assert.equal(momentum.direction, 'upward');
  assert.equal(momentum.likesTrendPct, 100); // 200 vs 100 -> +100%
  assert.equal(momentum.sharesTrendPct, 100);
});
