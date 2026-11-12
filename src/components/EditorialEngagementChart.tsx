import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  Line,
  ComposedChart,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { EditorialEngagementPoint, EditorialPost } from '../types/editorial';
import { 
  calculateAggregateMetrics, 
  filterMetricsByTimeframe,
  compareTimePeriods,
  compareEditorialCampaigns,
  calculateMovingAverages,
  calculateTrendMomentum,
  PeriodComparisonSummary,
  CampaignComparisonSummary,
  EngagementPointWithSMA
} from '../lib/analytics';
import { 
  TrendingUp, 
  Heart, 
  Share2, 
  Eye, 
  Bookmark, 
  BarChart3, 
  Layers, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Calendar,
  Clock,
  Compass,
  Check,
  Minus,
  Activity
} from 'lucide-react';

interface EditorialEngagementChartProps {
  data: EditorialEngagementPoint[];
  posts?: EditorialPost[];
}

export const EditorialEngagementChart: React.FC<EditorialEngagementChartProps> = ({ 
  data, 
  posts = [] 
}) => {
  // Top-level View Mode: 'single' (timeline overview) vs 'compare' (side-by-side comparison)
  const [viewMode, setViewMode] = useState<'single' | 'compare'>('single');

  // Single View Controls
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('7d');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'reach'>('area');
  const [showTrendlines, setShowTrendlines] = useState<boolean>(true);
  const [smaWindow, setSmaWindow] = useState<number>(3);

  // Comparison Controls
  const [compareDimension, setCompareDimension] = useState<'periods' | 'campaigns'>('periods');
  const [periodPreset, setPeriodPreset] = useState<'4d-split' | '3d-split' | 'halves'>('4d-split');
  const [periodMetric, setPeriodMetric] = useState<'reach' | 'likes' | 'shares' | 'engagementRate'>('reach');

  // Campaign Comparison Selection
  const availableCampaigns = useMemo(() => {
    return data.filter(d => Boolean(d.postTitle));
  }, [data]);

  const [selectedCampaignAId, setSelectedCampaignAId] = useState<string>(() => {
    return availableCampaigns[Math.max(0, availableCampaigns.length - 2)]?.fullDate || '';
  });
  const [selectedCampaignBId, setSelectedCampaignBId] = useState<string>(() => {
    return availableCampaigns[availableCampaigns.length - 1]?.fullDate || '';
  });

  // Derived Single View Data
  const filteredData = useMemo(() => filterMetricsByTimeframe(data, timeframe), [data, timeframe]);
  const aggregate = useMemo(() => calculateAggregateMetrics(filteredData), [filteredData]);

  // Derived Moving Averages & Trend Momentum for Single View
  const dataWithSMA = useMemo(() => {
    return calculateMovingAverages(filteredData, smaWindow);
  }, [filteredData, smaWindow]);

  const trendMomentum = useMemo(() => {
    return calculateTrendMomentum(dataWithSMA);
  }, [dataWithSMA]);

  // Derived Period Comparison
  const periodComparison: PeriodComparisonSummary | null = useMemo(() => {
    if (data.length < 4) return null;

    let pA: EditorialEngagementPoint[] = [];
    let pB: EditorialEngagementPoint[] = [];

    if (periodPreset === '4d-split') {
      pA = data.slice(-8, -4);
      pB = data.slice(-4);
      if (pA.length === 0) {
        const mid = Math.floor(data.length / 2);
        pA = data.slice(0, mid);
        pB = data.slice(mid);
      }
    } else if (periodPreset === '3d-split') {
      pA = data.slice(-6, -3);
      pB = data.slice(-3);
      if (pA.length === 0) {
        const mid = Math.floor(data.length / 2);
        pA = data.slice(0, mid);
        pB = data.slice(mid);
      }
    } else {
      // Halves
      const mid = Math.floor(data.length / 2);
      pA = data.slice(0, mid);
      pB = data.slice(mid);
    }

    return compareTimePeriods(pA, pB);
  }, [data, periodPreset]);

  // Derived Campaign Comparison
  const campaignComparison: CampaignComparisonSummary | null = useMemo(() => {
    const itemA = availableCampaigns.find(c => c.fullDate === selectedCampaignAId) || availableCampaigns[0];
    const itemB = availableCampaigns.find(c => c.fullDate === selectedCampaignBId) || availableCampaigns[1] || availableCampaigns[0];

    if (!itemA || !itemB) return null;
    return compareEditorialCampaigns(itemA, itemB);
  }, [availableCampaigns, selectedCampaignAId, selectedCampaignBId]);

  // Match corresponding EditorialPost if available for rich visual thumbnail
  const matchedPostA = useMemo(() => {
    if (!campaignComparison) return undefined;
    return posts.find(p => p.title.toLowerCase().includes(campaignComparison.campaignA.postTitle?.toLowerCase() || '---'));
  }, [posts, campaignComparison]);

  const matchedPostB = useMemo(() => {
    if (!campaignComparison) return undefined;
    return posts.find(p => p.title.toLowerCase().includes(campaignComparison.campaignB.postTitle?.toLowerCase() || '---'));
  }, [posts, campaignComparison]);

  // Swap Campaign A & B
  const handleSwapCampaigns = () => {
    const tempA = selectedCampaignAId;
    setSelectedCampaignAId(selectedCampaignBId);
    setSelectedCampaignBId(tempA);
  };

  // Custom Minimal Dark Editorial Tooltip for Single View
  const CustomSingleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const pointData: EditorialEngagementPoint = payload[0].payload;
      return (
        <div className="bg-[#121212]/95 border border-[#2a2a2a] p-3.5 rounded shadow-2xl backdrop-blur-md text-xs font-mono space-y-2 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-[#222222] pb-1.5">
            <span className="text-[#c5a880] font-semibold">{pointData.fullDate}</span>
            <span className="text-[10px] text-[#71717a]">{pointData.engagementRate}% rate</span>
          </div>

          {pointData.postTitle && (
            <div className="text-[11px] font-sans text-[#f4f3ef] leading-snug">
              <span className="text-[#8e8d8a] block text-[9px] uppercase font-mono">Curated Work:</span>
              <span className="font-medium">{pointData.postTitle}</span>
              {pointData.photographer && (
                <span className="text-[#8e8d8a] block text-[10px] mt-0.5">Photo: {pointData.photographer}</span>
              )}
            </div>
          )}

          <div className="pt-1.5 border-t border-[#1e1e1e] space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-[#f4f3ef]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f4f3ef]" />
                Reach:
              </span>
              <span className="font-semibold tabular-nums">{pointData.reach.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[#c5a880]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#c5a880]" />
                Likes:
              </span>
              <span className="font-semibold tabular-nums">{pointData.likes.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[#8e8d8a]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8e8d8a]" />
                Shares & Saves:
              </span>
              <span className="font-semibold tabular-nums">{(pointData.shares + pointData.saves).toLocaleString()}</span>
            </div>

            {showTrendlines && (
              <div className="pt-1.5 mt-1 border-t border-[#1e1e1e] space-y-1">
                <div className="text-[9px] uppercase tracking-wider text-[#8e8d8a] font-mono">
                  {smaWindow}-Day Moving Average Trend:
                </div>
                <div className="flex items-center justify-between text-[#f5d7b5]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#f5d7b5]" />
                    Likes (Trend):
                  </span>
                  <span className="font-semibold tabular-nums">
                    {((pointData as any).likesSMA ?? pointData.likes).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#f4f3ef]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#f4f3ef]" />
                    Shares (Trend):
                  </span>
                  <span className="font-semibold tabular-nums">
                    {((pointData as any).sharesSMA ?? pointData.shares).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Period Comparison
  const CustomPeriodTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      return (
        <div className="bg-[#121212]/95 border border-[#2a2a2a] p-3.5 rounded shadow-2xl backdrop-blur-md text-xs font-mono space-y-2 min-w-[240px]">
          <div className="flex items-center justify-between border-b border-[#222222] pb-1.5">
            <span className="text-[#f4f3ef] font-semibold">{label} Comparison</span>
            <span className="text-[10px] text-[#8e8d8a]">{row.periodADate} vs {row.periodBDate}</span>
          </div>

          <div className="space-y-2 pt-1 text-[11px]">
            <div className="p-2 bg-[#181818] rounded border border-[#262626]">
              <div className="flex items-center justify-between text-[#8e8d8a] text-[10px]">
                <span>PERIOD A ({row.periodADate})</span>
                <span className="text-[#71717a]">{row.periodARate}% rate</span>
              </div>
              <div className="flex items-center justify-between text-[#d4d4d8] mt-0.5 font-semibold">
                <span>Reach: {row.periodAReach.toLocaleString()}</span>
                <span className="text-[#c5a880]">Likes: {row.periodALikes.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-2 bg-[#1c1c1c] rounded border border-[#333333]">
              <div className="flex items-center justify-between text-[#c5a880] text-[10px]">
                <span>PERIOD B ({row.periodBDate})</span>
                <span className="text-[#c5a880]">{row.periodBRate}% rate</span>
              </div>
              <div className="flex items-center justify-between text-[#f4f3ef] mt-0.5 font-semibold">
                <span>Reach: {row.periodBReach.toLocaleString()}</span>
                <span className="text-[#c5a880]">Likes: {row.periodBLikes.toLocaleString()}</span>
              </div>
            </div>

            {/* Delta info */}
            <div className="flex items-center justify-between text-[10px] pt-1 text-[#8e8d8a] border-t border-[#222222]">
              <span>Reach Variance:</span>
              <span className={`font-semibold ${row.periodBReach >= row.periodAReach ? 'text-[#a3e635]' : 'text-[#f87171]'}`}>
                {row.periodBReach >= row.periodAReach ? '+' : ''}
                {(row.periodBReach - row.periodAReach).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Campaign Comparison
  const CustomCampaignTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      const valA = row.campaignA;
      const valB = row.campaignB;
      const diff = valB - valA;
      return (
        <div className="bg-[#121212]/95 border border-[#2a2a2a] p-3.5 rounded shadow-2xl backdrop-blur-md text-xs font-mono space-y-2 min-w-[240px]">
          <div className="flex items-center justify-between border-b border-[#222222] pb-1.5">
            <span className="text-[#f4f3ef] font-semibold">{row.metric} Comparison</span>
            <span className="text-[10px] text-[#c5a880]">Direct Head-to-Head</span>
          </div>

          <div className="space-y-1.5 text-[11px] pt-1">
            <div className="flex items-center justify-between text-[#8e8d8a]">
              <span className="truncate max-w-[130px]">{row.nameA}:</span>
              <span className="font-semibold text-[#f4f3ef] tabular-nums">{valA.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[#c5a880]">
              <span className="truncate max-w-[130px]">{row.nameB}:</span>
              <span className="font-semibold text-[#c5a880] tabular-nums">{valB.toLocaleString()}</span>
            </div>

            <div className="pt-1.5 border-t border-[#222222] flex items-center justify-between text-[10px]">
              <span className="text-[#71717a]">Differential:</span>
              <span className={`font-semibold ${diff >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'}`}>
                {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header and Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Verified Meta Graph API Performance</span>
            <span>·</span>
            <span>Audience Response</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Editorial Engagement & Reach
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Visualizing audience resonance over time for published high-fashion monographs. Switch between continuous timeline tracking and side-by-side comparative analysis.
          </p>
        </div>

        {/* Primary View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="flex items-center p-1 bg-[#121212] rounded border border-[#222222] font-mono text-xs">
            <button
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                viewMode === 'single' ? 'bg-[#222222] text-[#f4f3ef] font-semibold' : 'text-[#71717a] hover:text-[#d4d4d8]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Timeline View</span>
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                viewMode === 'compare' ? 'bg-[#222222] text-[#c5a880] font-semibold' : 'text-[#71717a] hover:text-[#d4d4d8]'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Side-by-Side Compare</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: TIMELINE / SINGLE VIEW                                            */}
      {/* ========================================================================= */}
      {viewMode === 'single' && (
        <div className="space-y-8">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[#121212] border border-[#222222] rounded">
            <span className="text-xs font-mono text-[#8e8d8a] uppercase tracking-wider">
              Timeline Configuration:
            </span>

            <div className="flex flex-wrap items-center gap-3">
              {/* Timeframe selector */}
              <div className="flex items-center gap-1 p-0.5 bg-[#181818] rounded border border-[#262626] font-mono text-xs">
                <button
                  onClick={() => setTimeframe('7d')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    timeframe === '7d' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                >
                  7 Days
                </button>
                <button
                  onClick={() => setTimeframe('30d')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    timeframe === '30d' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                >
                  30 Days
                </button>
                <button
                  onClick={() => setTimeframe('all')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    timeframe === 'all' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                >
                  All Archival
                </button>
              </div>

              {/* Chart format selector */}
              <div className="flex items-center gap-1 p-0.5 bg-[#181818] rounded border border-[#262626] font-mono text-xs">
                <button
                  onClick={() => setChartType('area')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    chartType === 'area' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                  title="Continuous Multi-Metric Area Trend"
                >
                  Area Trend
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    chartType === 'bar' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                  title="Grouped Engagement Bar Chart"
                >
                  Split Bars
                </button>
                <button
                  onClick={() => setChartType('reach')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    chartType === 'reach' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                  title="Audience Reach Trajectory"
                >
                  Reach Only
                </button>
              </div>

              {/* Trendline Moving Average Controls */}
              <div className="flex items-center gap-1.5 border-l border-[#262626] pl-3">
                <button
                  onClick={() => setShowTrendlines(!showTrendlines)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition cursor-pointer font-mono text-xs ${
                    showTrendlines 
                      ? 'bg-[#c5a880]/15 text-[#c5a880] border border-[#c5a880]/30 font-semibold' 
                      : 'text-[#71717a] hover:text-[#d4d4d8] border border-transparent'
                  }`}
                  title="Toggle moving average trend-lines for likes and shares"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Trendlines {showTrendlines ? 'ON' : 'OFF'}</span>
                </button>

                {showTrendlines && (
                  <div className="flex items-center gap-1 p-0.5 bg-[#181818] rounded border border-[#262626] font-mono text-[11px]">
                    <button
                      onClick={() => setSmaWindow(3)}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        smaWindow === 3 ? 'bg-[#262626] text-[#c5a880] font-semibold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                      }`}
                      title="3-Day Simple Moving Average"
                    >
                      3D SMA
                    </button>
                    <button
                      onClick={() => setSmaWindow(5)}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        smaWindow === 5 ? 'bg-[#262626] text-[#c5a880] font-semibold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                      }`}
                      title="5-Day Simple Moving Average"
                    >
                      5D SMA
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Aggregate KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Reach */}
            <div className="p-5 bg-[#121212] border border-[#222222] rounded flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[#8e8d8a]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Total Verified Reach</span>
                <Eye className="w-4 h-4 text-[#f4f3ef]" />
              </div>
              <div>
                <span className="font-mono text-2xl lg:text-3xl font-semibold text-[#f4f3ef] tabular-nums">
                  {aggregate.totalReach.toLocaleString()}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a3e635] mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+18.4% vs prev week</span>
                </div>
              </div>
            </div>

            {/* Total Likes */}
            <div className="p-5 bg-[#121212] border border-[#222222] rounded flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[#8e8d8a]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Curatorial Likes</span>
                <Heart className="w-4 h-4 text-[#c5a880]" />
              </div>
              <div>
                <span className="font-mono text-2xl lg:text-3xl font-semibold text-[#c5a880] tabular-nums">
                  {aggregate.totalLikes.toLocaleString()}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a3e635] mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>+14.2% engagement growth</span>
                </div>
              </div>
            </div>

            {/* Shares & Saves */}
            <div className="p-5 bg-[#121212] border border-[#222222] rounded flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[#8e8d8a]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Archival Saves & Shares</span>
                <Share2 className="w-4 h-4 text-[#8e8d8a]" />
              </div>
              <div>
                <span className="font-mono text-2xl lg:text-3xl font-semibold text-[#f4f3ef] tabular-nums">
                  {(aggregate.totalShares + aggregate.totalSaves).toLocaleString()}
                </span>
                <div className="text-[11px] font-mono text-[#8e8d8a] mt-1">
                  {aggregate.totalShares.toLocaleString()} shares · {aggregate.totalSaves.toLocaleString()} saves
                </div>
              </div>
            </div>

            {/* Average Engagement Rate */}
            <div className="p-5 bg-[#121212] border border-[#222222] rounded flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[#8e8d8a]">
                <span className="text-[10px] font-mono uppercase tracking-wider">Avg. Engagement Rate</span>
                <TrendingUp className="w-4 h-4 text-[#c5a880]" />
              </div>
              <div>
                <span className="font-mono text-2xl lg:text-3xl font-semibold text-[#f4f3ef] tabular-nums">
                  {aggregate.averageEngagementRate}%
                </span>
                <div className="text-[11px] font-mono text-[#71717a] mt-1">
                  Benchmark: High Fashion Monograph
                </div>
              </div>
            </div>
          </div>

          {/* Main Recharts Visualization Box */}
          <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-editorial text-xl text-[#f4f3ef] font-normal">
                  {chartType === 'reach' 
                    ? 'Audience Reach Trajectory (Impressions)' 
                    : chartType === 'bar' 
                    ? 'Engagement Channel Distribution (Likes vs Shares vs Saves)' 
                    : 'Editorial Content Performance Timeline'}
                </h2>
                <p className="text-xs text-[#8e8d8a] font-sans">
                  Daily verified performance telemetry recorded across active Meta Graph publishing slots.
                  {showTrendlines && ` Displaying ${smaWindow}-Day Moving Averages for trend smoothing.`}
                </p>
              </div>

              {/* Legend indicator */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                {chartType !== 'reach' && (
                  <>
                    <div className="flex items-center gap-1.5 text-[#f4f3ef]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#f4f3ef]" />
                      <span>Reach</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#c5a880]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#c5a880]" />
                      <span>Likes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#8e8d8a]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#8e8d8a]" />
                      <span>Shares</span>
                    </div>
                  </>
                )}
                {chartType === 'reach' && (
                  <div className="flex items-center gap-1.5 text-[#f4f3ef]">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#f4f3ef]" />
                    <span>Audience Reach</span>
                  </div>
                )}
                {showTrendlines && (
                  <>
                    <div className="flex items-center gap-1.5 text-[#f5d7b5]">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#f5d7b5]" />
                      <span>Likes ({smaWindow}D SMA)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#f4f3ef]">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#f4f3ef]" />
                      <span>Shares ({smaWindow}D SMA)</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Trend Momentum Strip when active */}
            {showTrendlines && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#161616] border border-[#262626] rounded text-xs font-mono">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[#c5a880]">
                    <Activity className="w-3.5 h-3.5 text-[#c5a880]" />
                    <span className="font-semibold uppercase tracking-wider text-[10px]">
                      {smaWindow}-Day Moving Average Velocity:
                    </span>
                  </div>
                  <span className="text-[#f4f3ef]">
                    Likes Trend: <span className={`font-semibold ${trendMomentum.likesTrendPct >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'}`}>
                      {trendMomentum.likesTrendPct >= 0 ? '+' : ''}{trendMomentum.likesTrendPct}%
                    </span>
                  </span>
                  <span className="text-[#8e8d8a]">·</span>
                  <span className="text-[#f4f3ef]">
                    Shares Trend: <span className={`font-semibold ${trendMomentum.sharesTrendPct >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'}`}>
                      {trendMomentum.sharesTrendPct >= 0 ? '+' : ''}{trendMomentum.sharesTrendPct}%
                    </span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8e8d8a]">
                  Aesthetic Trajectory: <span className="text-[#f4f3ef] font-semibold uppercase">{trendMomentum.direction} Momentum</span>
                </div>
              </div>
            )}

            {/* Chart Canvas */}
            <div className="h-[380px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'bar' ? (
                  <ComposedChart
                    data={dataWithSMA}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#1e1e1e" strokeDasharray="2 2" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#262626' }}
                      tickLine={{ stroke: '#262626' }}
                    />
                    <YAxis 
                      tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#262626' }}
                      tickLine={{ stroke: '#262626' }}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    />
                    <Tooltip content={<CustomSingleTooltip />} />
                    <Bar dataKey="likes" fill="#c5a880" name="Likes" radius={[2, 2, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="shares" fill="#8e8d8a" name="Shares" radius={[2, 2, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="saves" fill="#52525b" name="Saves" radius={[2, 2, 0, 0]} maxBarSize={28} />
                    
                    {showTrendlines && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="likesSMA"
                          stroke="#f5d7b5"
                          strokeWidth={2.5}
                          strokeDasharray="5 4"
                          dot={{ r: 3, fill: '#f5d7b5', stroke: '#121212', strokeWidth: 1.5 }}
                          name={`Likes (${smaWindow}D SMA)`}
                        />
                        <Line
                          type="monotone"
                          dataKey="sharesSMA"
                          stroke="#f4f3ef"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          dot={{ r: 2.5, fill: '#f4f3ef', stroke: '#121212', strokeWidth: 1.5 }}
                          name={`Shares (${smaWindow}D SMA)`}
                        />
                      </>
                    )}
                  </ComposedChart>
                ) : chartType === 'reach' ? (
                  <ComposedChart
                    data={dataWithSMA}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="editorialReachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f4f3ef" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f4f3ef" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e1e1e" strokeDasharray="2 2" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#262626' }}
                      tickLine={{ stroke: '#262626' }}
                    />
                    <YAxis 
                      tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#262626' }}
                      tickLine={{ stroke: '#262626' }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomSingleTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="reach" 
                      stroke="#f4f3ef" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#editorialReachGrad)" 
                      name="Reach"
                    />
                    {showTrendlines && (
                      <Line
                        type="monotone"
                        dataKey="reachSMA"
                        stroke="#c5a880"
                        strokeWidth={2.5}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: '#c5a880', stroke: '#121212', strokeWidth: 1.5 }}
                        name={`Reach (${smaWindow}D SMA)`}
                      />
                    )}
                  </ComposedChart>
                ) : (
                  <ComposedChart
                    data={dataWithSMA}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f4f3ef" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#f4f3ef" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c5a880" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#c5a880" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="sharesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8e8d8a" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#8e8d8a" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e1e1e" strokeDasharray="2 2" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#262626' }}
                      tickLine={{ stroke: '#262626' }}
                    />
                    <YAxis 
                      tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#262626' }}
                      tickLine={{ stroke: '#262626' }}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                    />
                    <Tooltip content={<CustomSingleTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="reach" 
                      stroke="#f4f3ef" 
                      strokeWidth={1.5}
                      fillOpacity={1} 
                      fill="url(#reachGrad)" 
                      name="Reach"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="likes" 
                      stroke="#c5a880" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#likesGrad)" 
                      name="Likes"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="shares" 
                      stroke="#8e8d8a" 
                      strokeWidth={1.5}
                      fillOpacity={1} 
                      fill="url(#sharesGrad)" 
                      name="Shares"
                    />
                    
                    {showTrendlines && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="likesSMA"
                          stroke="#f5d7b5"
                          strokeWidth={2.5}
                          strokeDasharray="5 4"
                          dot={{ r: 3, fill: '#f5d7b5', stroke: '#121212', strokeWidth: 1.5 }}
                          name={`Likes (${smaWindow}D SMA)`}
                        />
                        <Line
                          type="monotone"
                          dataKey="sharesSMA"
                          stroke="#f4f3ef"
                          strokeWidth={2}
                          strokeDasharray="3 3"
                          dot={{ r: 2.5, fill: '#f4f3ef', stroke: '#121212', strokeWidth: 1.5 }}
                          name={`Shares (${smaWindow}D SMA)`}
                        />
                      </>
                    )}
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-Editorial Publication Breakdown Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
                Published Editorial Content Performance Breakdown
              </h2>
              <span className="text-xs font-mono text-[#8e8d8a]">
                {filteredData.length} Indexed Releases
              </span>
            </div>

            <div className="bg-[#121212] border border-[#222222] rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#181818] border-b border-[#222222] text-[#8e8d8a] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Publication Date</th>
                      <th className="py-3 px-4">Curated Monograph Title</th>
                      <th className="py-3 px-4">Photographer</th>
                      <th className="py-3 px-4 text-right">Reach</th>
                      <th className="py-3 px-4 text-right">Likes</th>
                      <th className="py-3 px-4 text-right">Shares & Saves</th>
                      <th className="py-3 px-4 text-right">Engagement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e]">
                    {filteredData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#161616] transition">
                        <td className="py-3 px-4 text-[#8e8d8a] whitespace-nowrap">{item.fullDate}</td>
                        <td className="py-3 px-4 text-[#f4f3ef] font-sans font-medium whitespace-nowrap">
                          {item.postTitle || 'Editorial Monograph'}
                        </td>
                        <td className="py-3 px-4 text-[#c5a880] whitespace-nowrap">
                          {item.photographer || 'Curated Artist'}
                        </td>
                        <td className="py-3 px-4 text-right text-[#f4f3ef] font-semibold tabular-nums">
                          {item.reach.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-[#c5a880] tabular-nums">
                          {item.likes.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-[#8e8d8a] tabular-nums">
                          {(item.shares + item.saves).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right text-[#a3e635] font-semibold tabular-nums">
                          {item.engagementRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SIDE-BY-SIDE COMPARISON (PERIODS OR CAMPAIGNS)                    */}
      {/* ========================================================================= */}
      {viewMode === 'compare' && (
        <div className="space-y-8">
          {/* Comparison Mode Sub-Selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#121212] border border-[#222222] rounded">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-[#8e8d8a] tracking-wider">Comparison Dimension:</span>
              <div className="flex items-center p-0.5 bg-[#181818] rounded border border-[#262626] font-mono text-xs">
                <button
                  onClick={() => setCompareDimension('periods')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                    compareDimension === 'periods' 
                      ? 'bg-[#262626] text-[#c5a880] font-semibold' 
                      : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Two Time Periods</span>
                </button>
                <button
                  onClick={() => setCompareDimension('campaigns')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                    compareDimension === 'campaigns' 
                      ? 'bg-[#262626] text-[#c5a880] font-semibold' 
                      : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Two Editorial Campaigns</span>
                </button>
              </div>
            </div>

            {/* Dimension-specific sub controls */}
            {compareDimension === 'periods' ? (
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-[11px] text-[#71717a]">Window:</span>
                <select
                  value={periodPreset}
                  onChange={(e) => setPeriodPreset(e.target.value as any)}
                  aria-label="Select comparison period preset"
                  className="bg-[#181818] text-[#f4f3ef] border border-[#2a2a2a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#c5a880] cursor-pointer"
                >
                  <option value="4d-split">Recent 4 Days vs Prior 4 Days</option>
                  <option value="3d-split">Recent 3 Days vs Prior 3 Days</option>
                  <option value="halves">First Half vs Second Half (Equal Split)</option>
                </select>

                <div className="flex items-center gap-1 ml-2 border-l border-[#262626] pl-3">
                  <span className="text-[11px] text-[#71717a]">Metric:</span>
                  <button
                    onClick={() => setPeriodMetric('reach')}
                    className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
                      periodMetric === 'reach' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                    }`}
                  >
                    Reach
                  </button>
                  <button
                    onClick={() => setPeriodMetric('likes')}
                    className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
                      periodMetric === 'likes' ? 'bg-[#262626] text-[#c5a880]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                    }`}
                  >
                    Likes
                  </button>
                  <button
                    onClick={() => setPeriodMetric('shares')}
                    className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
                      periodMetric === 'shares' ? 'bg-[#262626] text-[#8e8d8a]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                    }`}
                  >
                    Shares
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={handleSwapCampaigns}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] hover:bg-[#222222] border border-[#262626] rounded text-[#c5a880] transition cursor-pointer"
                  title="Swap Campaign A and Campaign B"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Swap Positions</span>
                </button>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SUB-OPTION A: TWO TIME PERIODS COMPARISON                    */}
          {/* ------------------------------------------------------------- */}
          {compareDimension === 'periods' && periodComparison && (
            <div className="space-y-6">
              {/* Comparative Period KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Reach Comparison */}
                <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-3">
                  <div className="flex items-center justify-between text-[#8e8d8a] text-[10px] font-mono uppercase tracking-wider">
                    <span>Audience Reach</span>
                    <Eye className="w-4 h-4 text-[#f4f3ef]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="border-r border-[#222222] pr-2">
                      <span className="text-[10px] text-[#71717a] block uppercase">Period A</span>
                      <span className="text-base text-[#8e8d8a] font-semibold tabular-nums">
                        {periodComparison.periodA.totalReach.toLocaleString()}
                      </span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[10px] text-[#c5a880] block uppercase">Period B</span>
                      <span className="text-base text-[#f4f3ef] font-semibold tabular-nums">
                        {periodComparison.periodB.totalReach.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Growth:</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      periodComparison.reachGrowth >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'
                    }`}>
                      {periodComparison.reachGrowth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {periodComparison.reachGrowth >= 0 ? '+' : ''}{periodComparison.reachGrowth}%
                    </span>
                  </div>
                </div>

                {/* Likes Comparison */}
                <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-3">
                  <div className="flex items-center justify-between text-[#8e8d8a] text-[10px] font-mono uppercase tracking-wider">
                    <span>Curatorial Likes</span>
                    <Heart className="w-4 h-4 text-[#c5a880]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="border-r border-[#222222] pr-2">
                      <span className="text-[10px] text-[#71717a] block uppercase">Period A</span>
                      <span className="text-base text-[#8e8d8a] font-semibold tabular-nums">
                        {periodComparison.periodA.totalLikes.toLocaleString()}
                      </span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[10px] text-[#c5a880] block uppercase">Period B</span>
                      <span className="text-base text-[#c5a880] font-semibold tabular-nums">
                        {periodComparison.periodB.totalLikes.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Growth:</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      periodComparison.likesGrowth >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'
                    }`}>
                      {periodComparison.likesGrowth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {periodComparison.likesGrowth >= 0 ? '+' : ''}{periodComparison.likesGrowth}%
                    </span>
                  </div>
                </div>

                {/* Shares & Saves Comparison */}
                <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-3">
                  <div className="flex items-center justify-between text-[#8e8d8a] text-[10px] font-mono uppercase tracking-wider">
                    <span>Shares & Saves</span>
                    <Share2 className="w-4 h-4 text-[#8e8d8a]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="border-r border-[#222222] pr-2">
                      <span className="text-[10px] text-[#71717a] block uppercase">Period A</span>
                      <span className="text-base text-[#8e8d8a] font-semibold tabular-nums">
                        {(periodComparison.periodA.totalShares + periodComparison.periodA.totalSaves).toLocaleString()}
                      </span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[10px] text-[#c5a880] block uppercase">Period B</span>
                      <span className="text-base text-[#f4f3ef] font-semibold tabular-nums">
                        {(periodComparison.periodB.totalShares + periodComparison.periodB.totalSaves).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Growth:</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      periodComparison.sharesGrowth >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'
                    }`}>
                      {periodComparison.sharesGrowth >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {periodComparison.sharesGrowth >= 0 ? '+' : ''}{periodComparison.sharesGrowth}%
                    </span>
                  </div>
                </div>

                {/* Engagement Rate Comparison */}
                <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-3">
                  <div className="flex items-center justify-between text-[#8e8d8a] text-[10px] font-mono uppercase tracking-wider">
                    <span>Average Rate</span>
                    <TrendingUp className="w-4 h-4 text-[#c5a880]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="border-r border-[#222222] pr-2">
                      <span className="text-[10px] text-[#71717a] block uppercase">Period A</span>
                      <span className="text-base text-[#8e8d8a] font-semibold tabular-nums">
                        {periodComparison.periodA.averageEngagementRate}%
                      </span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[10px] text-[#c5a880] block uppercase">Period B</span>
                      <span className="text-base text-[#c5a880] font-semibold tabular-nums">
                        {periodComparison.periodB.averageEngagementRate}%
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">Rate Delta:</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      periodComparison.rateDelta >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'
                    }`}>
                      {periodComparison.rateDelta >= 0 ? '+' : ''}{periodComparison.rateDelta}% pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Recharts Side-by-Side Period Comparison Chart */}
              <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-editorial text-xl text-[#f4f3ef] font-normal">
                      Day-by-Day Normalized Trajectory Comparison
                    </h2>
                    <p className="text-xs text-[#8e8d8a] font-sans">
                      Aligning day index of Period A vs Period B to evaluate acceleration and fatigue curves.
                    </p>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex items-center gap-5 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-[#8e8d8a]">
                      <span className="w-3 h-3 rounded-sm bg-[#52525b]" />
                      <span>Period A (Prior Window)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#c5a880]">
                      <span className="w-3 h-3 rounded-sm bg-[#c5a880]" />
                      <span>Period B (Recent Window)</span>
                    </div>
                  </div>
                </div>

                <div className="h-[380px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={periodComparison.chartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1e1e1e" strokeDasharray="2 2" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                        axisLine={{ stroke: '#262626' }}
                        tickLine={{ stroke: '#262626' }}
                      />
                      <YAxis 
                        tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                        axisLine={{ stroke: '#262626' }}
                        tickLine={{ stroke: '#262626' }}
                        tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                      />
                      <Tooltip content={<CustomPeriodTooltip />} />
                      
                      {periodMetric === 'reach' && (
                        <>
                          <Bar 
                            dataKey="periodAReach" 
                            fill="#52525b" 
                            name="Period A Reach" 
                            radius={[2, 2, 0, 0]} 
                            maxBarSize={32} 
                          />
                          <Bar 
                            dataKey="periodBReach" 
                            fill="#c5a880" 
                            name="Period B Reach" 
                            radius={[2, 2, 0, 0]} 
                            maxBarSize={32} 
                          />
                        </>
                      )}

                      {periodMetric === 'likes' && (
                        <>
                          <Bar 
                            dataKey="periodALikes" 
                            fill="#52525b" 
                            name="Period A Likes" 
                            radius={[2, 2, 0, 0]} 
                            maxBarSize={32} 
                          />
                          <Bar 
                            dataKey="periodBLikes" 
                            fill="#c5a880" 
                            name="Period B Likes" 
                            radius={[2, 2, 0, 0]} 
                            maxBarSize={32} 
                          />
                        </>
                      )}

                      {periodMetric === 'shares' && (
                        <>
                          <Bar 
                            dataKey="periodAShares" 
                            fill="#52525b" 
                            name="Period A Shares & Saves" 
                            radius={[2, 2, 0, 0]} 
                            maxBarSize={32} 
                          />
                          <Bar 
                            dataKey="periodBShares" 
                            fill="#f4f3ef" 
                            name="Period B Shares & Saves" 
                            radius={[2, 2, 0, 0]} 
                            maxBarSize={32} 
                          />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side-by-Side Normalized Breakdown Table */}
              <div className="space-y-4">
                <h3 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
                  Normalized Day-by-Day Alignment Table
                </h3>
                <div className="bg-[#121212] border border-[#222222] rounded overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#181818] border-b border-[#222222] text-[#8e8d8a] uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Relative Day</th>
                          <th className="py-3 px-4">Period A Date</th>
                          <th className="py-3 px-4 text-right">Period A Reach</th>
                          <th className="py-3 px-4 text-right">Period A Likes</th>
                          <th className="py-3 px-4">Period B Date</th>
                          <th className="py-3 px-4 text-right">Period B Reach</th>
                          <th className="py-3 px-4 text-right">Period B Likes</th>
                          <th className="py-3 px-4 text-right">Reach Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1e1e]">
                        {periodComparison.chartData.map((row, idx) => {
                          const diff = row.periodBReach - row.periodAReach;
                          return (
                            <tr key={idx} className="hover:bg-[#161616] transition">
                              <td className="py-3 px-4 text-[#f4f3ef] font-semibold">{row.label}</td>
                              <td className="py-3 px-4 text-[#8e8d8a]">{row.periodADate}</td>
                              <td className="py-3 px-4 text-right text-[#8e8d8a] tabular-nums">
                                {row.periodAReach.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right text-[#8e8d8a] tabular-nums">
                                {row.periodALikes.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-[#c5a880]">{row.periodBDate}</td>
                              <td className="py-3 px-4 text-right text-[#f4f3ef] font-semibold tabular-nums">
                                {row.periodBReach.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right text-[#c5a880] font-semibold tabular-nums">
                                {row.periodBLikes.toLocaleString()}
                              </td>
                              <td className={`py-3 px-4 text-right font-semibold tabular-nums ${
                                diff >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'
                              }`}>
                                {diff >= 0 ? '+' : ''}{diff.toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SUB-OPTION B: TWO EDITORIAL CAMPAIGNS SIDE-BY-SIDE          */}
          {/* ------------------------------------------------------------- */}
          {compareDimension === 'campaigns' && campaignComparison && (
            <div className="space-y-6">
              {/* Campaign Pickers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campaign A Selector Card */}
                <div className="p-4 bg-[#141414] border border-[#2a2a2a] rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8e8d8a]">
                      Baseline Editorial (Campaign A)
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8e8d8a]" />
                  </div>
                  <div>
                    <label htmlFor="campaign-a-select" className="sr-only">Baseline Editorial Campaign A</label>
                    <select
                      id="campaign-a-select"
                      value={selectedCampaignAId}
                      onChange={(e) => setSelectedCampaignAId(e.target.value)}
                      className="w-full bg-[#1c1c1c] text-[#f4f3ef] border border-[#333333] rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#c5a880] cursor-pointer"
                    >
                      {availableCampaigns.map(c => (
                        <option key={c.fullDate} value={c.fullDate}>
                          {c.postTitle} ({c.photographer}) — {c.fullDate}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campaign A Metadata Summary */}
                  <div className="pt-2 flex items-start gap-3 border-t border-[#222222]">
                    {matchedPostA?.imageUrls?.[0] ? (
                      <img 
                        src={matchedPostA.imageUrls[0]} 
                        alt={matchedPostA.title}
                        className="w-14 h-18 object-cover rounded border border-[#262626] shrink-0" 
                      />
                    ) : (
                      <div className="w-14 h-18 bg-[#1f1f1f] rounded border border-[#262626] flex items-center justify-center text-[#71717a] shrink-0 text-[10px] font-mono">
                        ARCHIVE
                      </div>
                    )}
                    <div className="space-y-1 text-xs font-mono">
                      <div className="font-sans font-semibold text-[#f4f3ef] text-sm leading-snug line-clamp-1">
                        {campaignComparison.campaignA.postTitle}
                      </div>
                      <div className="text-[#8e8d8a] text-[11px]">
                        Artist: <span className="text-[#d4d4d8]">{campaignComparison.campaignA.photographer}</span>
                      </div>
                      <div className="text-[11px] text-[#71717a]">
                        Published: {campaignComparison.campaignA.fullDate} · Rate: {campaignComparison.campaignA.engagementRate}%
                      </div>
                      <div className="text-xs text-[#f4f3ef] font-semibold pt-1">
                        Verified Reach: {campaignComparison.campaignA.reach.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign B Selector Card */}
                <div className="p-4 bg-[#141414] border border-[#333333] rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880]">
                      Challenger Editorial (Campaign B)
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c5a880]" />
                  </div>
                  <div>
                    <label htmlFor="campaign-b-select" className="sr-only">Challenger Editorial Campaign B</label>
                    <select
                      id="campaign-b-select"
                      value={selectedCampaignBId}
                      onChange={(e) => setSelectedCampaignBId(e.target.value)}
                      className="w-full bg-[#1c1c1c] text-[#f4f3ef] border border-[#333333] rounded px-3 py-2 text-xs font-mono focus:outline-none focus:border-[#c5a880] cursor-pointer"
                    >
                      {availableCampaigns.map(c => (
                        <option key={c.fullDate} value={c.fullDate}>
                          {c.postTitle} ({c.photographer}) — {c.fullDate}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campaign B Metadata Summary */}
                  <div className="pt-2 flex items-start gap-3 border-t border-[#222222]">
                    {matchedPostB?.imageUrls?.[0] ? (
                      <img 
                        src={matchedPostB.imageUrls[0]} 
                        alt={matchedPostB.title}
                        className="w-14 h-18 object-cover rounded border border-[#262626] shrink-0" 
                      />
                    ) : (
                      <div className="w-14 h-18 bg-[#1f1f1f] rounded border border-[#262626] flex items-center justify-center text-[#71717a] shrink-0 text-[10px] font-mono">
                        ARCHIVE
                      </div>
                    )}
                    <div className="space-y-1 text-xs font-mono">
                      <div className="font-sans font-semibold text-[#f4f3ef] text-sm leading-snug line-clamp-1">
                        {campaignComparison.campaignB.postTitle}
                      </div>
                      <div className="text-[#c5a880] text-[11px]">
                        Artist: <span className="text-[#f4f3ef]">{campaignComparison.campaignB.photographer}</span>
                      </div>
                      <div className="text-[11px] text-[#71717a]">
                        Published: {campaignComparison.campaignB.fullDate} · Rate: {campaignComparison.campaignB.engagementRate}%
                      </div>
                      <div className="text-xs text-[#c5a880] font-semibold pt-1">
                        Verified Reach: {campaignComparison.campaignB.reach.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Recharts Grouped Comparison */}
              <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-editorial text-xl text-[#f4f3ef] font-normal">
                      Head-to-Head Audience Engagement Comparison
                    </h2>
                    <p className="text-xs text-[#8e8d8a] font-sans">
                      Direct volume contrast across Likes, Shares, and Saves for the two selected editorial monographs.
                    </p>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex items-center gap-5 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-[#8e8d8a]">
                      <span className="w-3 h-3 rounded-sm bg-[#8e8d8a]" />
                      <span className="truncate max-w-[120px]">{campaignComparison.campaignA.photographer}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#c5a880]">
                      <span className="w-3 h-3 rounded-sm bg-[#c5a880]" />
                      <span className="truncate max-w-[120px]">{campaignComparison.campaignB.photographer}</span>
                    </div>
                  </div>
                </div>

                <div className="h-[360px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={campaignComparison.chartData}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1e1e1e" strokeDasharray="2 2" vertical={false} />
                      <XAxis 
                        dataKey="metric" 
                        tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                        axisLine={{ stroke: '#262626' }}
                        tickLine={{ stroke: '#262626' }}
                      />
                      <YAxis 
                        tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
                        axisLine={{ stroke: '#262626' }}
                        tickLine={{ stroke: '#262626' }}
                        tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
                      />
                      <Tooltip content={<CustomCampaignTooltip />} />
                      <Bar 
                        dataKey="campaignA" 
                        fill="#8e8d8a" 
                        name={campaignComparison.campaignA.postTitle || 'Campaign A'} 
                        radius={[2, 2, 0, 0]} 
                        maxBarSize={44} 
                      />
                      <Bar 
                        dataKey="campaignB" 
                        fill="#c5a880" 
                        name={campaignComparison.campaignB.postTitle || 'Campaign B'} 
                        radius={[2, 2, 0, 0]} 
                        maxBarSize={44} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Side-by-Side Detailed Metric Delta Matrix */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
                    Head-to-Head Metric Delta Matrix
                  </h3>
                  <span className="text-xs font-mono text-[#8e8d8a]">
                    Variance Analysis
                  </span>
                </div>

                <div className="bg-[#121212] border border-[#222222] rounded overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#181818] border-b border-[#222222] text-[#8e8d8a] uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Performance Metric</th>
                          <th className="py-3 px-4">
                            Campaign A ({campaignComparison.campaignA.photographer})
                          </th>
                          <th className="py-3 px-4">
                            Campaign B ({campaignComparison.campaignB.photographer})
                          </th>
                          <th className="py-3 px-4 text-right">Absolute Delta</th>
                          <th className="py-3 px-4 text-right">Variance (%)</th>
                          <th className="py-3 px-4 text-center">Advantage Leader</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1e1e]">
                        {campaignComparison.metrics.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#161616] transition">
                            <td className="py-3 px-4 text-[#f4f3ef] font-medium">{row.metric}</td>
                            <td className="py-3 px-4 text-[#8e8d8a] tabular-nums">{row.formattedA}</td>
                            <td className="py-3 px-4 text-[#c5a880] font-semibold tabular-nums">{row.formattedB}</td>
                            <td className={`py-3 px-4 text-right tabular-nums ${
                              row.delta > 0 ? 'text-[#a3e635]' : row.delta < 0 ? 'text-[#f87171]' : 'text-[#71717a]'
                            }`}>
                              {row.delta > 0 ? '+' : ''}{row.delta.toLocaleString()}
                            </td>
                            <td className={`py-3 px-4 text-right font-semibold tabular-nums ${
                              row.percentDiff > 0 ? 'text-[#a3e635]' : row.percentDiff < 0 ? 'text-[#f87171]' : 'text-[#71717a]'
                            }`}>
                              {row.percentDiff > 0 ? '+' : ''}{row.percentDiff}%
                            </td>
                            <td className="py-3 px-4 text-center">
                              {row.winner === 'B' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#c5a880] font-semibold">
                                  <Check className="w-3.5 h-3.5" /> Campaign B Leads
                                </span>
                              ) : row.winner === 'A' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#8e8d8a] font-semibold">
                                  <Check className="w-3.5 h-3.5" /> Campaign A Leads
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#71717a]">
                                  <Minus className="w-3 h-3 inline" /> Parity
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
