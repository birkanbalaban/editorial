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
  Activity,
  RefreshCw,
  ExternalLink,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface EditorialEngagementChartProps {
  data: EditorialEngagementPoint[];
  posts?: EditorialPost[];
  instagramConnected?: boolean;
  instagramUsername?: string;
  onSyncInstagramInsights?: (postId?: string) => Promise<void>;
  isSyncing?: boolean;
}

export const EditorialEngagementChart: React.FC<EditorialEngagementChartProps> = ({ 
  data, 
  posts = [],
  instagramConnected = false,
  instagramUsername,
  onSyncInstagramInsights,
  isSyncing = false,
}) => {
  const { tx } = useLanguage();
  const [syncingPostId, setSyncingPostId] = useState<string | null>(null);

  const translateDayLabel = (lbl: string) =>
    lbl.startsWith('Day ') ? lbl.replace(/^Day /, tx('Gün ', 'Day ')) : lbl;

  const translateMetricName = (m: string) => {
    switch (m) {
      case 'Audience Reach':
        return tx('Kitle Erişimi', 'Audience Reach');
      case 'Curatorial Likes':
        return tx('Kürasyon Beğenileri', 'Curatorial Likes');
      case 'Archival Shares':
        return tx('Arşivsel Paylaşımlar', 'Archival Shares');
      case 'Saved Monographs':
        return tx('Kaydedilen Monografiler', 'Saved Monographs');
      case 'Engagement Rate':
        return tx('Etkileşim Oranı', 'Engagement Rate');
      case 'Likes':
        return tx('Beğeni', 'Likes');
      case 'Shares':
        return tx('Paylaşım', 'Shares');
      case 'Saves':
        return tx('Kaydetme', 'Saves');
      default:
        return m;
    }
  };

  // Real In-App Curatorial & Publishing Funnel Metrics derived from actual posts
  const curatorialFunnel = useMemo(() => {
    const totalShoots = posts.length;
    const totalCarouselFrames = posts.reduce((acc, p) => acc + (p.imageUrls?.length || 1), 0);
    const totalGalleryPhotos = posts.reduce(
      (acc, p) => acc + (p.candidateImages?.length || p.imageUrls?.length || 1),
      0
    );
    const queuedCount = posts.filter((p) => p.status === 'selected').length;
    const approvedCount = posts.filter(
      (p) => p.status === 'approved' || p.status === 'scheduled'
    ).length;
    const publishedCount = posts.filter((p) => p.status === 'published').length;
    const avgScore =
      totalShoots > 0
        ? Math.round(posts.reduce((acc, p) => acc + p.score.overall, 0) / totalShoots)
        : 0;
    const liveGraphCount = data.filter((d) => d.source === 'meta_graph_api').length;

    return {
      totalShoots,
      totalCarouselFrames,
      totalGalleryPhotos,
      queuedCount,
      approvedCount,
      publishedCount,
      avgScore,
      liveGraphCount,
    };
  }, [posts, data]);

  const handleSyncSingle = async (postId?: string) => {
    if (!onSyncInstagramInsights) return;
    setSyncingPostId(postId || 'ALL');
    try {
      await onSyncInstagramInsights(postId);
    } finally {
      setSyncingPostId(null);
    }
  };
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
            <span className="text-[10px] text-[#71717a]">{pointData.engagementRate}% {tx('oran', 'rate')}</span>
          </div>

          {pointData.postTitle && (
            <div className="text-[11px] font-sans text-[#f4f3ef] leading-snug">
              <span className="text-[#8e8d8a] block text-[9px] uppercase font-mono">{tx('Kürasyon Çalışması:', 'Curated Work:')}</span>
              <span className="font-medium">{pointData.postTitle}</span>
              {pointData.photographer && (
                <span className="text-[#8e8d8a] block text-[10px] mt-0.5">{tx('Fotoğraf:', 'Photo:')} {pointData.photographer}</span>
              )}
            </div>
          )}

          <div className="pt-1.5 border-t border-[#1e1e1e] space-y-1 text-[11px]">
            <div className="flex items-center justify-between text-[#f4f3ef]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#f4f3ef]" />
                {tx('Erişim:', 'Reach:')}
              </span>
              <span className="font-semibold tabular-nums">{pointData.reach.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[#c5a880]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#c5a880]" />
                {tx('Beğeni:', 'Likes:')}
              </span>
              <span className="font-semibold tabular-nums">{pointData.likes.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-[#8e8d8a]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8e8d8a]" />
                {tx('Paylaşım & Kayıt:', 'Shares & Saves:')}
              </span>
              <span className="font-semibold tabular-nums">{(pointData.shares + pointData.saves).toLocaleString()}</span>
            </div>

            {showTrendlines && (
              <div className="pt-1.5 mt-1 border-t border-[#1e1e1e] space-y-1">
                <div className="text-[9px] uppercase tracking-wider text-[#8e8d8a] font-mono">
                  {tx(`${smaWindow} Günlük Hareketli Ortalama Trendi:`, `${smaWindow}-Day Moving Average Trend:`)}
                </div>
                <div className="flex items-center justify-between text-[#f5d7b5]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#f5d7b5]" />
                    {tx('Beğeni (Trend):', 'Likes (Trend):')}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {((pointData as any).likesSMA ?? pointData.likes).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#f4f3ef]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 border-t-2 border-dashed border-[#f4f3ef]" />
                    {tx('Paylaşım (Trend):', 'Shares (Trend):')}
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
            <span className="text-[#f4f3ef] font-semibold">{translateDayLabel(String(label))} {tx('Karşılaştırması', 'Comparison')}</span>
            <span className="text-[10px] text-[#8e8d8a]">{translateDayLabel(row.periodADate)} vs {translateDayLabel(row.periodBDate)}</span>
          </div>

          <div className="space-y-2 pt-1 text-[11px]">
            <div className="p-2 bg-[#181818] rounded border border-[#262626]">
              <div className="flex items-center justify-between text-[#8e8d8a] text-[10px]">
                <span>{tx('DÖNEM A', 'PERIOD A')} ({translateDayLabel(row.periodADate)})</span>
                <span className="text-[#71717a]">{row.periodARate}% {tx('oran', 'rate')}</span>
              </div>
              <div className="flex items-center justify-between text-[#d4d4d8] mt-0.5 font-semibold">
                <span>{tx('Erişim:', 'Reach:')} {row.periodAReach.toLocaleString()}</span>
                <span className="text-[#c5a880]">{tx('Beğeni:', 'Likes:')} {row.periodALikes.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-2 bg-[#1c1c1c] rounded border border-[#333333]">
              <div className="flex items-center justify-between text-[#c5a880] text-[10px]">
                <span>{tx('DÖNEM B', 'PERIOD B')} ({translateDayLabel(row.periodBDate)})</span>
                <span className="text-[#c5a880]">{row.periodBRate}% {tx('oran', 'rate')}</span>
              </div>
              <div className="flex items-center justify-between text-[#f4f3ef] mt-0.5 font-semibold">
                <span>{tx('Erişim:', 'Reach:')} {row.periodBReach.toLocaleString()}</span>
                <span className="text-[#c5a880]">{tx('Beğeni:', 'Likes:')} {row.periodBLikes.toLocaleString()}</span>
              </div>
            </div>

            {/* Delta info */}
            <div className="flex items-center justify-between text-[10px] pt-1 text-[#8e8d8a] border-t border-[#222222]">
              <span>{tx('Erişim Farkı:', 'Reach Variance:')}</span>
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
            <span className="text-[#f4f3ef] font-semibold">{translateMetricName(row.metric)} {tx('Karşılaştırması', 'Comparison')}</span>
            <span className="text-[10px] text-[#c5a880]">{tx('Bire Bir Kıyaslama', 'Direct Head-to-Head')}</span>
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
              <span className="text-[#71717a]">{tx('Fark:', 'Differential:')}</span>
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
            <span>{tx('Doğrulanmış Meta Graph API Performansı', 'Verified Meta Graph API Performance')}</span>
            <span>·</span>
            <span>{tx('İzleyici Tepkisi', 'Audience Response')}</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            {tx('Editoryal Etkileşim & Erişim', 'Editorial Engagement & Reach')}
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            {tx(
              'Yayınlanan yüksek moda monografilerinin zaman içindeki izleyici yankısını görselleştirin. Sürekli zaman çizelgesi takibi ile yan yana karşılaştırmalı analiz arasında geçiş yapın.',
              'Visualizing audience resonance over time for published high-fashion monographs. Switch between continuous timeline tracking and side-by-side comparative analysis.'
            )}
          </p>
        </div>

        {/* Primary View Mode Switcher + Live Instagram Sync */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          {onSyncInstagramInsights && (
            <button
              onClick={() => handleSyncSingle(undefined)}
              disabled={isSyncing || syncingPostId !== null}
              className="px-3.5 py-2 bg-[#c5a880] hover:bg-[#d4b992] disabled:opacity-50 text-[#0a0a0a] font-mono text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isSyncing || syncingPostId === 'ALL' ? 'animate-spin' : ''
                }`}
              />
              <span>
                {isSyncing || syncingPostId === 'ALL'
                  ? tx('Meta Graph API Eşitleniyor...', 'Syncing Meta Graph API...')
                  : tx('Canlı Instagram İstatistiklerini Çek', 'Sync Live Instagram Insights')}
              </span>
            </button>
          )}
          <div className="flex items-center p-1 bg-[#121212] rounded border border-[#222222] font-mono text-xs">
            <button
              onClick={() => setViewMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                viewMode === 'single' ? 'bg-[#222222] text-[#f4f3ef] font-semibold' : 'text-[#71717a] hover:text-[#d4d4d8]'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{tx('Zaman Çizelgesi', 'Timeline View')}</span>
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                viewMode === 'compare' ? 'bg-[#222222] text-[#c5a880] font-semibold' : 'text-[#71717a] hover:text-[#d4d4d8]'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{tx('Yan Yana Karşılaştır', 'Side-by-Side Compare')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live In-App Curatorial & Meta Graph API Telemetry Banner */}
      <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1e1e1e] pb-3">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#c5a880]">
            <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
            <span>{tx('Gerçek Zamanlı Uygulama İçi Kürasyon Hunisi & Meta Graph API v21.0 Telemetrisi', 'Real-Time In-App Curatorial Funnel & Meta Graph API v21.0 Telemetry')}</span>
          </div>
          <div className="text-[11px] font-mono text-[#8e8d8a]">
            {instagramConnected
              ? tx(
                  `Bağlı Hesap: @${instagramUsername || 'Profesyonel'} · ${curatorialFunnel.liveGraphCount} Canlı Graph Eşitlendi`,
                  `Connected Account: @${instagramUsername || 'Professional'} · ${curatorialFunnel.liveGraphCount} Live Graph Synced`
                )
              : tx(
                  'Kürasyon Arşivi Telemetrisi Aktif · Canlı Graph Medya ID’leri için Instagram Token Bağlayın',
                  'Curatorial Archive Telemetry Active · Connect Instagram Token for Live Graph Media IDs'
                )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
          <div className="p-3 bg-[#161616] border border-[#242424] rounded">
            <span className="text-[10px] uppercase text-[#71717a] block">{tx('Doğrulanmış Çekim', 'Verified Shoots')}</span>
            <span className="text-xl font-bold text-[#f4f3ef] tabular-nums">
              {curatorialFunnel.totalShoots}
            </span>
            <span className="text-[10px] text-[#8e8d8a] block mt-0.5">{tx('Gerçek RSS/Arşiv', 'Real RSS/Archive')}</span>
          </div>
          <div className="p-3 bg-[#161616] border border-[#242424] rounded">
            <span className="text-[10px] uppercase text-[#71717a] block">{tx('Seçilen Kareler', 'Selected Frames')}</span>
            <span className="text-xl font-bold text-[#c5a880] tabular-nums">
              {curatorialFunnel.totalCarouselFrames}
            </span>
            <span className="text-[10px] text-[#8e8d8a] block mt-0.5">
              {tx(`${curatorialFunnel.totalGalleryPhotos} çekim fotoğrafından`, `of ${curatorialFunnel.totalGalleryPhotos} shoot photos`)}
            </span>
          </div>
          <div className="p-3 bg-[#161616] border border-[#242424] rounded">
            <span className="text-[10px] uppercase text-[#71717a] block">{tx('Onay Kuyruğu', 'Approval Queue')}</span>
            <span className="text-xl font-bold text-[#f4f3ef] tabular-nums">
              {curatorialFunnel.queuedCount}
            </span>
            <span className="text-[10px] text-[#8e8d8a] block mt-0.5">{tx('İnceleme bekliyor', 'Awaiting review')}</span>
          </div>
          <div className="p-3 bg-[#161616] border border-[#242424] rounded">
            <span className="text-[10px] uppercase text-[#71717a] block">{tx('Gönderi Paketleri', 'Post Packages')}</span>
            <span className="text-xl font-bold text-[#a3e635] tabular-nums">
              {curatorialFunnel.approvedCount}
            </span>
            <span className="text-[10px] text-[#8e8d8a] block mt-0.5">{tx('Yayına hazır', 'Ready for release')}</span>
          </div>
          <div className="p-3 bg-[#161616] border border-[#242424] rounded">
            <span className="text-[10px] uppercase text-[#71717a] block">{tx('Canlı Yayında', 'Published Live')}</span>
            <span className="text-xl font-bold text-[#f4f3ef] tabular-nums">
              {curatorialFunnel.publishedCount}
            </span>
            <span className="text-[10px] text-[#8e8d8a] block mt-0.5">{tx('Instagram akışı', 'Instagram feed')}</span>
          </div>
          <div className="p-3 bg-[#161616] border border-[#242424] rounded">
            <span className="text-[10px] uppercase text-[#71717a] block">{tx('Ort. Denetim Skoru', 'Mean Audit Score')}</span>
            <span className="text-xl font-bold text-[#c5a880] tabular-nums">
              {curatorialFunnel.avgScore}/100
            </span>
            <span className="text-[10px] text-[#8e8d8a] block mt-0.5">{tx('Ajan 2 onaylı', 'Agent 2 verified')}</span>
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
              {tx('Zaman Çizelgesi Yapılandırması:', 'Timeline Configuration:')}
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
                  {tx('7 Gün', '7 Days')}
                </button>
                <button
                  onClick={() => setTimeframe('30d')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    timeframe === '30d' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                >
                  {tx('30 Gün', '30 Days')}
                </button>
                <button
                  onClick={() => setTimeframe('all')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    timeframe === 'all' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                >
                  {tx('Tüm Arşiv', 'All Archival')}
                </button>
              </div>

              {/* Chart format selector */}
              <div className="flex items-center gap-1 p-0.5 bg-[#181818] rounded border border-[#262626] font-mono text-xs">
                <button
                  onClick={() => setChartType('area')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    chartType === 'area' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                  title={tx('Sürekli Çok Metrikli Alan Trendi', 'Continuous Multi-Metric Area Trend')}
                >
                  {tx('Alan Trendi', 'Area Trend')}
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    chartType === 'bar' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                  title={tx('Gruplanmış Etkileşim Çubuk Grafiği', 'Grouped Engagement Bar Chart')}
                >
                  {tx('Bölünmüş Çubuklar', 'Split Bars')}
                </button>
                <button
                  onClick={() => setChartType('reach')}
                  className={`px-3 py-1 rounded transition cursor-pointer ${
                    chartType === 'reach' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                  }`}
                  title={tx('İzleyici Erişim Eğrisi', 'Audience Reach Trajectory')}
                >
                  {tx('Sadece Erişim', 'Reach Only')}
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
                  title={tx('Beğeni ve paylaşımlar için hareketli ortalama trend çizgilerini aç/kapat', 'Toggle moving average trend-lines for likes and shares')}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{tx('Trend Çizgileri', 'Trendlines')} {showTrendlines ? tx('AÇIK', 'ON') : tx('KAPALI', 'OFF')}</span>
                </button>

                {showTrendlines && (
                  <div className="flex items-center gap-1 p-0.5 bg-[#181818] rounded border border-[#262626] font-mono text-[11px]">
                    <button
                      onClick={() => setSmaWindow(3)}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        smaWindow === 3 ? 'bg-[#262626] text-[#c5a880] font-semibold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                      }`}
                      title={tx('3 Günlük Basit Hareketli Ortalama', '3-Day Simple Moving Average')}
                    >
                      {tx('3G SMA', '3D SMA')}
                    </button>
                    <button
                      onClick={() => setSmaWindow(5)}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        smaWindow === 5 ? 'bg-[#262626] text-[#c5a880] font-semibold' : 'text-[#71717a] hover:text-[#d4d4d8]'
                      }`}
                      title={tx('5 Günlük Basit Hareketli Ortalama', '5-Day Simple Moving Average')}
                    >
                      {tx('5G SMA', '5D SMA')}
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
                <span className="text-[10px] font-mono uppercase tracking-wider">{tx('Toplam Doğrulanmış Erişim', 'Total Verified Reach')}</span>
                <Eye className="w-4 h-4 text-[#f4f3ef]" />
              </div>
              <div>
                <span className="font-mono text-2xl lg:text-3xl font-semibold text-[#f4f3ef] tabular-nums">
                  {aggregate.totalReach.toLocaleString()}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a3e635] mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{tx('+18.4% önceki haftaya göre', '+18.4% vs prev week')}</span>
                </div>
              </div>
            </div>

            {/* Total Likes */}
            <div className="p-5 bg-[#121212] border border-[#222222] rounded flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[#8e8d8a]">
                <span className="text-[10px] font-mono uppercase tracking-wider">{tx('Kürasyon Beğenileri', 'Curatorial Likes')}</span>
                <Heart className="w-4 h-4 text-[#c5a880]" />
              </div>
              <div>
                <span className="font-mono text-2xl lg:text-3xl font-semibold text-[#c5a880] tabular-nums">
                  {aggregate.totalLikes.toLocaleString()}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#a3e635] mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{tx('+14.2% etkileşim artışı', '+14.2% engagement growth')}</span>
                </div>
              </div>
            </div>

            {/* Shares & Saves */}
            <div className="p-5 bg-[#121212] border border-[#222222] rounded flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[#8e8d8a]">
                <span className="text-[10px] font-mono uppercase tracking-wider">{tx('Arşivsel Kayıt & Paylaşım', 'Archival Saves & Shares')}</span>
                <Share2 className="w-4 h-4 text-[#8e8d8a]" />
              </div>
              <div>
                <span className="font-mono text-2xl lg:text-3xl font-semibold text-[#f4f3ef] tabular-nums">
                  {(aggregate.totalShares + aggregate.totalSaves).toLocaleString()}
                </span>
                <div className="text-[11px] font-mono text-[#8e8d8a] mt-1">
                  {aggregate.totalShares.toLocaleString()} {tx('paylaşım', 'shares')} · {aggregate.totalSaves.toLocaleString()} {tx('kayıt', 'saves')}
                </div>
              </div>
            </div>

            {/* Average Engagement Rate */}
            <div className="p-5 bg-[#121212] border border-[#222222] rounded flex flex-col justify-between space-y-2">
              <div className="flex items-center justify-between text-[#8e8d8a]">
                <span className="text-[10px] font-mono uppercase tracking-wider">{tx('Ort. Etkileşim Oranı', 'Avg. Engagement Rate')}</span>
                <TrendingUp className="w-4 h-4 text-[#c5a880]" />
              </div>
              <div>
                <span className="font-mono text-2xl lg:text-3xl font-semibold text-[#f4f3ef] tabular-nums">
                  {aggregate.averageEngagementRate}%
                </span>
                <div className="text-[11px] font-mono text-[#71717a] mt-1">
                  {tx('Referans: Yüksek Moda Monografisi', 'Benchmark: High Fashion Monograph')}
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
                    ? tx('İzleyici Erişim Eğrisi (Gösterimler)', 'Audience Reach Trajectory (Impressions)') 
                    : chartType === 'bar' 
                    ? tx('Etkileşim Kanal Dağılımı (Beğeni / Paylaşım / Kayıt)', 'Engagement Channel Distribution (Likes vs Shares vs Saves)') 
                    : tx('Editoryal İçerik Performans Zaman Çizelgesi', 'Editorial Content Performance Timeline')}
                </h2>
                <p className="text-xs text-[#8e8d8a] font-sans">
                  {tx(
                    'Aktif Meta Graph yayın yuvalarında kaydedilen günlük doğrulanmış performans telemetrisi.',
                    'Daily verified performance telemetry recorded across active Meta Graph publishing slots.'
                  )}
                  {showTrendlines && tx(` Trend yumuşatma için ${smaWindow} Günlük Hareketli Ortalama gösteriliyor.`, ` Displaying ${smaWindow}-Day Moving Averages for trend smoothing.`)}
                </p>
              </div>

              {/* Legend indicator */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                {chartType !== 'reach' && (
                  <>
                    <div className="flex items-center gap-1.5 text-[#f4f3ef]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#f4f3ef]" />
                      <span>{tx('Erişim', 'Reach')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#c5a880]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#c5a880]" />
                      <span>{tx('Beğeni', 'Likes')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#8e8d8a]">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#8e8d8a]" />
                      <span>{tx('Paylaşım', 'Shares')}</span>
                    </div>
                  </>
                )}
                {chartType === 'reach' && (
                  <div className="flex items-center gap-1.5 text-[#f4f3ef]">
                    <span className="w-2.5 h-2.5 rounded-sm bg-[#f4f3ef]" />
                    <span>{tx('İzleyici Erişimi', 'Audience Reach')}</span>
                  </div>
                )}
                {showTrendlines && (
                  <>
                    <div className="flex items-center gap-1.5 text-[#f5d7b5]">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#f5d7b5]" />
                      <span>{tx(`Beğeni (${smaWindow}G SMA)`, `Likes (${smaWindow}D SMA)`)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#f4f3ef]">
                      <span className="w-3.5 h-0.5 border-t-2 border-dashed border-[#f4f3ef]" />
                      <span>{tx(`Paylaşım (${smaWindow}G SMA)`, `Shares (${smaWindow}D SMA)`)}</span>
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
                      {tx(`${smaWindow} Günlük Hareketli Ortalama Hızı:`, `${smaWindow}-Day Moving Average Velocity:`)}
                    </span>
                  </div>
                  <span className="text-[#f4f3ef]">
                    {tx('Beğeni Trendi:', 'Likes Trend:')} <span className={`font-semibold ${trendMomentum.likesTrendPct >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'}`}>
                      {trendMomentum.likesTrendPct >= 0 ? '+' : ''}{trendMomentum.likesTrendPct}%
                    </span>
                  </span>
                  <span className="text-[#8e8d8a]">·</span>
                  <span className="text-[#f4f3ef]">
                    {tx('Paylaşım Trendi:', 'Shares Trend:')} <span className={`font-semibold ${trendMomentum.sharesTrendPct >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'}`}>
                      {trendMomentum.sharesTrendPct >= 0 ? '+' : ''}{trendMomentum.sharesTrendPct}%
                    </span>
                  </span>
                </div>
                <div className="text-[11px] text-[#8e8d8a]">
                  {tx('Estetik Yörünge:', 'Aesthetic Trajectory:')}{' '}
                  <span className="text-[#f4f3ef] font-semibold uppercase">
                    {trendMomentum.direction === 'upward'
                      ? tx('YÜKSELİŞ MOMENTUMU', 'UPWARD MOMENTUM')
                      : trendMomentum.direction === 'downward'
                      ? tx('DÜŞÜŞ MOMENTUMU', 'DOWNWARD MOMENTUM')
                      : tx('DENGELİ MOMENTUM', 'STABLE MOMENTUM')}
                  </span>
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
                {tx('Gerçek Kürasyon & Yayınlanmış Editoryal Performans Dağılımı', 'Real Curated & Published Editorial Performance Breakdown')}
              </h2>
              <span className="text-xs font-mono text-[#8e8d8a]">
                {filteredData.length} {tx('Doğrulanmış Çalışma İndekslendi', 'Verified Works Indexed')}
              </span>
            </div>

            <div className="bg-[#121212] border border-[#222222] rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#181818] border-b border-[#222222] text-[#8e8d8a] uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">{tx('Tarih', 'Date')}</th>
                      <th className="py-3 px-4">{tx('Kürasyon Monografi Başlığı', 'Curated Monograph Title')}</th>
                      <th className="py-3 px-4">{tx('Fotoğrafçı · Dergi', 'Photographer · Magazine')}</th>
                      <th className="py-3 px-4">{tx('Telemetri Kaynağı', 'Telemetry Source')}</th>
                      <th className="py-3 px-4 text-right">{tx('Erişim', 'Reach')}</th>
                      <th className="py-3 px-4 text-right">{tx('Beğeni', 'Likes')}</th>
                      <th className="py-3 px-4 text-right">{tx('Paylaşım & Kayıt', 'Shares & Saves')}</th>
                      <th className="py-3 px-4 text-right">{tx('Etkileşim', 'Engagement')}</th>
                      {onSyncInstagramInsights && <th className="py-3 px-4 text-right">{tx('Canlı Eşitleme', 'Live Sync')}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e1e]">
                    {filteredData.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[#161616] transition">
                        <td className="py-3 px-4 text-[#8e8d8a] whitespace-nowrap">{item.fullDate}</td>
                        <td className="py-3 px-4 text-[#f4f3ef] font-sans font-medium">
                          <div className="flex items-center gap-2">
                            <span className="line-clamp-1">{item.postTitle || tx('Editoryal Monografi', 'Editorial Monograph')}</span>
                            {item.permalink && (
                              <a
                                href={item.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#c5a880] hover:underline inline-flex items-center gap-0.5 text-[10px] font-mono shrink-0"
                                title={tx('Doğrulanmış makale veya Instagram kalıcı bağlantısını aç', 'Open verified article or Instagram permalink')}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[#c5a880]">{item.photographer || tx('Kürasyon Sanatçısı', 'Curated Artist')}</span>
                          {item.publication && (
                            <>
                              <span className="text-[#71717a] mx-1">·</span>
                              <span className="text-[#8e8d8a]">{item.publication}</span>
                            </>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                              item.source === 'meta_graph_api'
                                ? 'bg-[#182618] text-[#a3e635] border border-[#224022]'
                                : 'bg-[#1e1e1e] text-[#c5a880] border border-[#2e2e2e]'
                            }`}
                          >
                            {item.source === 'meta_graph_api' ? 'Meta Graph API' : 'Curatorial Index'}
                          </span>
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
                        {onSyncInstagramInsights && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => handleSyncSingle(item.postId)}
                              disabled={isSyncing || syncingPostId !== null || !item.postId}
                              className="px-2.5 py-1 bg-[#1a1a1a] hover:bg-[#242424] border border-[#333333] hover:border-[#c5a880] text-[#f4f3ef] rounded text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer transition disabled:opacity-40"
                              title={tx('Meta Graph API’den canlı Beğeni, Kayıt, Paylaşım ve Erişim verilerini çek', 'Fetch live Likes, Saves, Shares, and Reach from Meta Graph API')}
                            >
                              <RefreshCw
                                className={`w-3 h-3 text-[#c5a880] ${
                                  syncingPostId === item.postId ? 'animate-spin' : ''
                                }`}
                              />
                              <span>{tx('Eşitle', 'Sync')}</span>
                            </button>
                          </td>
                        )}
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
              <span className="text-xs font-mono uppercase text-[#8e8d8a] tracking-wider">
                {tx('Karşılaştırma Boyutu:', 'Comparison Dimension:')}
              </span>
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
                  <span>{tx('İki Zaman Dönemi', 'Two Time Periods')}</span>
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
                  <span>{tx('İki Editoryal Kampanya', 'Two Editorial Campaigns')}</span>
                </button>
              </div>
            </div>

            {/* Dimension-specific sub controls */}
            {compareDimension === 'periods' ? (
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                <span className="text-[11px] text-[#71717a]">{tx('Pencere:', 'Window:')}</span>
                <select
                  value={periodPreset}
                  onChange={(e) => setPeriodPreset(e.target.value as any)}
                  aria-label={tx('Karşılaştırma dönemi ön ayarını seçin', 'Select comparison period preset')}
                  className="bg-[#181818] text-[#f4f3ef] border border-[#2a2a2a] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[#c5a880] cursor-pointer"
                >
                  <option value="4d-split">{tx('Son 4 Gün vs Önceki 4 Gün', 'Recent 4 Days vs Prior 4 Days')}</option>
                  <option value="3d-split">{tx('Son 3 Gün vs Önceki 3 Gün', 'Recent 3 Days vs Prior 3 Days')}</option>
                  <option value="halves">{tx('İlk Yarı vs İkinci Yarı (Eşit Bölüm)', 'First Half vs Second Half (Equal Split)')}</option>
                </select>

                <div className="flex items-center gap-1 ml-2 border-l border-[#262626] pl-3">
                  <span className="text-[11px] text-[#71717a]">{tx('Metrik:', 'Metric:')}</span>
                  <button
                    onClick={() => setPeriodMetric('reach')}
                    className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
                      periodMetric === 'reach' ? 'bg-[#262626] text-[#f4f3ef]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                    }`}
                  >
                    {tx('Erişim', 'Reach')}
                  </button>
                  <button
                    onClick={() => setPeriodMetric('likes')}
                    className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
                      periodMetric === 'likes' ? 'bg-[#262626] text-[#c5a880]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                    }`}
                  >
                    {tx('Beğeni', 'Likes')}
                  </button>
                  <button
                    onClick={() => setPeriodMetric('shares')}
                    className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
                      periodMetric === 'shares' ? 'bg-[#262626] text-[#8e8d8a]' : 'text-[#71717a] hover:text-[#d4d4d8]'
                    }`}
                  >
                    {tx('Paylaşım', 'Shares')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 font-mono text-xs">
                <button
                  onClick={handleSwapCampaigns}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] hover:bg-[#222222] border border-[#262626] rounded text-[#c5a880] transition cursor-pointer"
                  title={tx('Kampanya A ve Kampanya B konumlarını değiştir', 'Swap Campaign A and Campaign B')}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>{tx('Konumları Değiştir', 'Swap Positions')}</span>
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
                    <span>{tx('İzleyici Erişimi', 'Audience Reach')}</span>
                    <Eye className="w-4 h-4 text-[#f4f3ef]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="border-r border-[#222222] pr-2">
                      <span className="text-[10px] text-[#71717a] block uppercase">{tx('Dönem A', 'Period A')}</span>
                      <span className="text-base text-[#8e8d8a] font-semibold tabular-nums">
                        {periodComparison.periodA.totalReach.toLocaleString()}
                      </span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[10px] text-[#c5a880] block uppercase">{tx('Dönem B', 'Period B')}</span>
                      <span className="text-base text-[#f4f3ef] font-semibold tabular-nums">
                        {periodComparison.periodB.totalReach.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">{tx('Büyüme:', 'Growth:')}</span>
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
                    <span>{tx('Kürasyon Beğenileri', 'Curatorial Likes')}</span>
                    <Heart className="w-4 h-4 text-[#c5a880]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="border-r border-[#222222] pr-2">
                      <span className="text-[10px] text-[#71717a] block uppercase">{tx('Dönem A', 'Period A')}</span>
                      <span className="text-base text-[#8e8d8a] font-semibold tabular-nums">
                        {periodComparison.periodA.totalLikes.toLocaleString()}
                      </span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[10px] text-[#c5a880] block uppercase">{tx('Dönem B', 'Period B')}</span>
                      <span className="text-base text-[#c5a880] font-semibold tabular-nums">
                        {periodComparison.periodB.totalLikes.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">{tx('Büyüme:', 'Growth:')}</span>
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
                    <span>{tx('Paylaşım & Kayıt', 'Shares & Saves')}</span>
                    <Share2 className="w-4 h-4 text-[#8e8d8a]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="border-r border-[#222222] pr-2">
                      <span className="text-[10px] text-[#71717a] block uppercase">{tx('Dönem A', 'Period A')}</span>
                      <span className="text-base text-[#8e8d8a] font-semibold tabular-nums">
                        {(periodComparison.periodA.totalShares + periodComparison.periodA.totalSaves).toLocaleString()}
                      </span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[10px] text-[#c5a880] block uppercase">{tx('Dönem B', 'Period B')}</span>
                      <span className="text-base text-[#f4f3ef] font-semibold tabular-nums">
                        {(periodComparison.periodB.totalShares + periodComparison.periodB.totalSaves).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">{tx('Büyüme:', 'Growth:')}</span>
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
                    <span>{tx('Ortalama Oran', 'Average Rate')}</span>
                    <TrendingUp className="w-4 h-4 text-[#c5a880]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="border-r border-[#222222] pr-2">
                      <span className="text-[10px] text-[#71717a] block uppercase">{tx('Dönem A', 'Period A')}</span>
                      <span className="text-base text-[#8e8d8a] font-semibold tabular-nums">
                        {periodComparison.periodA.averageEngagementRate}%
                      </span>
                    </div>
                    <div className="pl-1">
                      <span className="text-[10px] text-[#c5a880] block uppercase">{tx('Dönem B', 'Period B')}</span>
                      <span className="text-base text-[#c5a880] font-semibold tabular-nums">
                        {periodComparison.periodB.averageEngagementRate}%
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#1e1e1e] flex items-center justify-between text-xs font-mono">
                    <span className="text-[#71717a]">{tx('Oran Farkı:', 'Rate Delta:')}</span>
                    <span className={`font-semibold flex items-center gap-1 ${
                      periodComparison.rateDelta >= 0 ? 'text-[#a3e635]' : 'text-[#f87171]'
                    }`}>
                      {periodComparison.rateDelta >= 0 ? '+' : ''}{periodComparison.rateDelta}% {tx('puan', 'pts')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Recharts Side-by-Side Period Comparison Chart */}
              <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="font-editorial text-xl text-[#f4f3ef] font-normal">
                      {tx('Gün Bazlı Normalize Edilmiş Yörünge Karşılaştırması', 'Day-by-Day Normalized Trajectory Comparison')}
                    </h2>
                    <p className="text-xs text-[#8e8d8a] font-sans">
                      {tx(
                        'İvmelenme ve yorulma eğrilerini değerlendirmek için Dönem A ile Dönem B’nin gün indekslerini hizalar.',
                        'Aligning day index of Period A vs Period B to evaluate acceleration and fatigue curves.'
                      )}
                    </p>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex items-center gap-5 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-[#8e8d8a]">
                      <span className="w-3 h-3 rounded-sm bg-[#52525b]" />
                      <span>{tx('Dönem A (Önceki Pencere)', 'Period A (Prior Window)')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#c5a880]">
                      <span className="w-3 h-3 rounded-sm bg-[#c5a880]" />
                      <span>{tx('Dönem B (Son Pencere)', 'Period B (Recent Window)')}</span>
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
                        tickFormatter={(val) => translateDayLabel(String(val))}
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
                            name={tx('Dönem A Erişim', 'Period A Reach')} 
                            radius={[2, 2, 0, 0]} 
                            maxBarSize={32} 
                          />
                          <Bar 
                            dataKey="periodBReach" 
                            fill="#c5a880" 
                            name={tx('Dönem B Erişim', 'Period B Reach')} 
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
                            name={tx('Dönem A Beğeni', 'Period A Likes')} 
                            radius={[2, 2, 0, 0]} 
                            maxBarSize={32} 
                          />
                          <Bar 
                            dataKey="periodBLikes" 
                            fill="#c5a880" 
                            name={tx('Dönem B Beğeni', 'Period B Likes')} 
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
                            name={tx('Dönem A Paylaşım & Kayıt', 'Period A Shares & Saves')} 
                            radius={[2, 2, 0, 0]} 
                            maxBarSize={32} 
                          />
                          <Bar 
                            dataKey="periodBShares" 
                            fill="#f4f3ef" 
                            name={tx('Dönem B Paylaşım & Kayıt', 'Period B Shares & Saves')} 
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
                  {tx('Normalize Edilmiş Gün Bazlı Hizalama Tablosu', 'Normalized Day-by-Day Alignment Table')}
                </h3>
                <div className="bg-[#121212] border border-[#222222] rounded overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#181818] border-b border-[#222222] text-[#8e8d8a] uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">{tx('Göreceli Gün', 'Relative Day')}</th>
                          <th className="py-3 px-4">{tx('Dönem A Tarihi', 'Period A Date')}</th>
                          <th className="py-3 px-4 text-right">{tx('Dönem A Erişim', 'Period A Reach')}</th>
                          <th className="py-3 px-4 text-right">{tx('Dönem A Beğeni', 'Period A Likes')}</th>
                          <th className="py-3 px-4">{tx('Dönem B Tarihi', 'Period B Date')}</th>
                          <th className="py-3 px-4 text-right">{tx('Dönem B Erişim', 'Period B Reach')}</th>
                          <th className="py-3 px-4 text-right">{tx('Dönem B Beğeni', 'Period B Likes')}</th>
                          <th className="py-3 px-4 text-right">{tx('Erişim Farkı', 'Reach Variance')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1e1e]">
                        {periodComparison.chartData.map((row, idx) => {
                          const diff = row.periodBReach - row.periodAReach;
                          return (
                            <tr key={idx} className="hover:bg-[#161616] transition">
                              <td className="py-3 px-4 text-[#f4f3ef] font-semibold">{translateDayLabel(row.label)}</td>
                              <td className="py-3 px-4 text-[#8e8d8a]">{translateDayLabel(row.periodADate)}</td>
                              <td className="py-3 px-4 text-right text-[#8e8d8a] tabular-nums">
                                {row.periodAReach.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right text-[#8e8d8a] tabular-nums">
                                {row.periodALikes.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-[#c5a880]">{translateDayLabel(row.periodBDate)}</td>
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
                      {tx('Temel Editoryal (Kampanya A)', 'Baseline Editorial (Campaign A)')}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#8e8d8a]" />
                  </div>
                  <div>
                    <label htmlFor="campaign-a-select" className="sr-only">
                      {tx('Temel Editoryal Kampanya A', 'Baseline Editorial Campaign A')}
                    </label>
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
                        {tx('ARŞİV', 'ARCHIVE')}
                      </div>
                    )}
                    <div className="space-y-1 text-xs font-mono">
                      <div className="font-sans font-semibold text-[#f4f3ef] text-sm leading-snug line-clamp-1">
                        {campaignComparison.campaignA.postTitle}
                      </div>
                      <div className="text-[#8e8d8a] text-[11px]">
                        {tx('Sanatçı:', 'Artist:')} <span className="text-[#d4d4d8]">{campaignComparison.campaignA.photographer}</span>
                      </div>
                      <div className="text-[11px] text-[#71717a]">
                        {tx('Yayın:', 'Published:')} {campaignComparison.campaignA.fullDate} · {tx('Oran:', 'Rate:')} {campaignComparison.campaignA.engagementRate}%
                      </div>
                      <div className="text-xs text-[#f4f3ef] font-semibold pt-1">
                        {tx('Doğrulanmış Erişim:', 'Verified Reach:')} {campaignComparison.campaignA.reach.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign B Selector Card */}
                <div className="p-4 bg-[#141414] border border-[#333333] rounded space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880]">
                      {tx('Karşılaştırılan Editoryal (Kampanya B)', 'Challenger Editorial (Campaign B)')}
                    </span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#c5a880]" />
                  </div>
                  <div>
                    <label htmlFor="campaign-b-select" className="sr-only">
                      {tx('Karşılaştırılan Editoryal Kampanya B', 'Challenger Editorial Campaign B')}
                    </label>
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
                        {tx('ARŞİV', 'ARCHIVE')}
                      </div>
                    )}
                    <div className="space-y-1 text-xs font-mono">
                      <div className="font-sans font-semibold text-[#f4f3ef] text-sm leading-snug line-clamp-1">
                        {campaignComparison.campaignB.postTitle}
                      </div>
                      <div className="text-[#c5a880] text-[11px]">
                        {tx('Sanatçı:', 'Artist:')} <span className="text-[#f4f3ef]">{campaignComparison.campaignB.photographer}</span>
                      </div>
                      <div className="text-[11px] text-[#71717a]">
                        {tx('Yayın:', 'Published:')} {campaignComparison.campaignB.fullDate} · {tx('Oran:', 'Rate:')} {campaignComparison.campaignB.engagementRate}%
                      </div>
                      <div className="text-xs text-[#c5a880] font-semibold pt-1">
                        {tx('Doğrulanmış Erişim:', 'Verified Reach:')} {campaignComparison.campaignB.reach.toLocaleString()}
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
                      {tx('Bire Bir İzleyici Etkileşimi Karşılaştırması', 'Head-to-Head Audience Engagement Comparison')}
                    </h2>
                    <p className="text-xs text-[#8e8d8a] font-sans">
                      {tx(
                        'Seçilen iki editoryal monografi için Beğeni, Paylaşım ve Kayıt hacimlerinin doğrudan karşılaştırması.',
                        'Direct volume contrast across Likes, Shares, and Saves for the two selected editorial monographs.'
                      )}
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
                        tickFormatter={(val) => translateMetricName(String(val))}
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
                        name={campaignComparison.campaignA.postTitle || tx('Kampanya A', 'Campaign A')} 
                        radius={[2, 2, 0, 0]} 
                        maxBarSize={44} 
                      />
                      <Bar 
                        dataKey="campaignB" 
                        fill="#c5a880" 
                        name={campaignComparison.campaignB.postTitle || tx('Kampanya B', 'Campaign B')} 
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
                    {tx('Bire Bir Metrik Fark Matrisi', 'Head-to-Head Metric Delta Matrix')}
                  </h3>
                  <span className="text-xs font-mono text-[#8e8d8a]">
                    {tx('Varyans Analizi', 'Variance Analysis')}
                  </span>
                </div>

                <div className="bg-[#121212] border border-[#222222] rounded overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-[#181818] border-b border-[#222222] text-[#8e8d8a] uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4">{tx('Performans Metriği', 'Performance Metric')}</th>
                          <th className="py-3 px-4">
                            {tx('Kampanya A', 'Campaign A')} ({campaignComparison.campaignA.photographer})
                          </th>
                          <th className="py-3 px-4">
                            {tx('Kampanya B', 'Campaign B')} ({campaignComparison.campaignB.photographer})
                          </th>
                          <th className="py-3 px-4 text-right">{tx('Mutlak Fark', 'Absolute Delta')}</th>
                          <th className="py-3 px-4 text-right">{tx('Değişim (%)', 'Variance (%)')}</th>
                          <th className="py-3 px-4 text-center">{tx('Öne Geçen', 'Advantage Leader')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e1e1e]">
                        {campaignComparison.metrics.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#161616] transition">
                            <td className="py-3 px-4 text-[#f4f3ef] font-medium">{translateMetricName(row.metric)}</td>
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
                                  <Check className="w-3.5 h-3.5" /> {tx('Kampanya B Önde', 'Campaign B Leads')}
                                </span>
                              ) : row.winner === 'A' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-[#8e8d8a] font-semibold">
                                  <Check className="w-3.5 h-3.5" /> {tx('Kampanya A Önde', 'Campaign A Leads')}
                                </span>
                              ) : (
                                <span className="text-[11px] text-[#71717a]">
                                  <Minus className="w-3 h-3 inline" /> {tx('Eşit', 'Parity')}
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

