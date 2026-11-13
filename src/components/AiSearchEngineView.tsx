import React, { useState, useEffect, useMemo } from 'react';
import {
  AiAgentConfig,
  EditorialPost,
  RssFeedConfig,
  WorkflowExecutionLog,
} from '../types/editorial';
import { RssExtractionLog, RssLogEntry } from './RssExtractionLog';
import {
  Search,
  Sparkles,
  X,
  Check,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  Trash2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Edit3,
  Bookmark,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AiSearchEngineViewProps {
  posts: EditorialPost[];
  aiConfig: AiAgentConfig;
  rssFeeds?: RssFeedConfig[];
  workflowLogs?: WorkflowExecutionLog[];
  onUpdateAiConfig?: (updates: Partial<AiAgentConfig>) => Promise<void>;
  onDiscoverBatch: (params: {
    query?: string;
    topics?: string[];
    count?: number;
  }) => Promise<{ count: number; posts: EditorialPost[]; steps: string[] } | null>;
  onDeduplicate: () => Promise<void>;
  onAuditAll?: (autoApprove?: boolean) => Promise<void>;
  onPostAction: (postId: string, action: string, payload?: any) => Promise<void>;
  onOpenCaptionEditor: (post: EditorialPost) => void;
  onNavigateToSettings: () => void;
  onNavigateToApprovalQueue?: () => void;
  isProcessing?: boolean;
}

const FALLBACK_PUBLICATION_FILTERS = [
  { label: 'Numéro', query: 'Numéro' },
  { label: 'Vogue', query: 'Vogue' },
  { label: 'Interview', query: 'Interview' },
  { label: 'Dazed', query: 'Dazed' },
];

const formatHHmmss = (dateInput: Date | string): string => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const AiSearchEngineView: React.FC<AiSearchEngineViewProps> = ({
  posts,
  aiConfig,
  rssFeeds = [],
  workflowLogs = [],
  onDiscoverBatch,
  onDeduplicate,
  onPostAction,
  onOpenCaptionEditor,
  onNavigateToSettings,
  isProcessing,
}) => {
  const { tx } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [batchSize, setBatchSize] = useState<number>(aiConfig.defaultBatchSize || 3);
  const [filterMode, setFilterMode] = useState<'latest' | 'all' | 'in_queue' | 'approved'>('all');
  const [layoutMode, setLayoutMode] = useState<'detailed' | 'compact'>('detailed');
  const [activeSlideIndex, setActiveSlideIndex] = useState<Record<string, number>>({});

  // Live session discovery trace + fallback to latest server discovery log
  const [sessionEntries, setSessionEntries] = useState<RssLogEntry[]>([]);
  const [sessionSummary, setSessionSummary] = useState<string | null>(null);
  const [sessionTimestamp, setSessionTimestamp] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [dismissedServerLogId, setDismissedServerLogId] = useState<string | null>(null);
  const [newlyDiscoveredIds, setNewlyDiscoveredIds] = useState<string[]>([]);

  useEffect(() => {
    setBatchSize(aiConfig.defaultBatchSize || 3);
  }, [aiConfig.defaultBatchSize]);

  const enabledFeeds = rssFeeds.filter((f) => f.enabled);
  const quickSources =
    enabledFeeds.length > 0
      ? enabledFeeds.map((f) => ({ label: f.name, query: f.name }))
      : FALLBACK_PUBLICATION_FILTERS;

  const latestServerDiscoveryLog = useMemo(
    () =>
      workflowLogs.find(
        (l) => l.stage === 'Live RSS Discovery' || l.stage === '08:00 Research'
      ),
    [workflowLogs]
  );

  const logDisplayState = useMemo<{
    entries: RssLogEntry[];
    summary: string;
    timestamp: string | null;
    status: 'idle' | 'running' | 'success' | 'failed';
  }>(() => {
    if (isProcessing) {
      return {
        entries: sessionEntries,
        summary: tx(
          'Aktif RSS kaynakları taranıyor ve tutarlı çekim galerileri çıkarılıyor...',
          'Scanning active RSS feeds & extracting coherent shoot galleries...'
        ),
        timestamp: sessionTimestamp || formatHHmmss(new Date()),
        status: 'running',
      };
    }

    if (sessionSummary !== null) {
      return {
        entries: sessionEntries,
        summary: sessionSummary,
        timestamp: sessionTimestamp,
        status: sessionStatus,
      };
    }

    if (latestServerDiscoveryLog && latestServerDiscoveryLog.id !== dismissedServerLogId) {
      const ts = formatHHmmss(latestServerDiscoveryLog.timestamp);
      const rawSteps = latestServerDiscoveryLog.details
        ? latestServerDiscoveryLog.details.split(' | ').filter(Boolean)
        : [latestServerDiscoveryLog.summary];

      return {
        entries: rawSteps.map((msg) => ({ timestamp: ts, message: msg })),
        summary: latestServerDiscoveryLog.summary,
        timestamp: ts,
        status:
          latestServerDiscoveryLog.status === 'failed' ||
          latestServerDiscoveryLog.status === 'skipped_emergency_stop'
            ? 'failed'
            : 'success',
      };
    }

    return {
      entries: [],
      summary: tx(
        'Son RSS çıkarım olayı yok — yukarıdan bir keşif araması veya hızlı çekme başlatın.',
        'No recent RSS extraction events — run a discovery search or quick pull above.'
      ),
      timestamp: null,
      status: 'idle',
    };
  }, [
    isProcessing,
    sessionEntries,
    sessionSummary,
    sessionTimestamp,
    sessionStatus,
    latestServerDiscoveryLog,
    dismissedServerLogId,
    tx,
  ]);

  const handleClearExtractionLog = () => {
    setSessionEntries([]);
    setSessionSummary(null);
    setSessionTimestamp(null);
    setSessionStatus('idle');
    if (latestServerDiscoveryLog) {
      setDismissedServerLogId(latestServerDiscoveryLog.id);
    }
  };

  const handleRunDiscovery = async (params: { query?: string; topics?: string[]; count?: number }) => {
    const startTs = formatHHmmss(new Date());
    setSessionEntries([
      {
        timestamp: startTs,
        message: `Connecting to enabled RSS feeds${params.query ? ` for "${params.query}"` : ''}...`,
      },
    ]);
    setSessionSummary(null);
    setSessionTimestamp(startTs);

    const result = await onDiscoverBatch(params);
    const doneTs = formatHHmmss(new Date());

    if (result) {
      const ids = (result.posts || []).map((p) => p.id);
      const stepLines =
        result.steps && result.steps.length > 0
          ? result.steps
          : [`Fetched ${result.count} live magazine article(s) with coherent shoot galleries.`];

      setSessionEntries(stepLines.map((msg) => ({ timestamp: doneTs, message: msg })));
      setSessionSummary(
        `Discovered ${result.count} real article(s) from ${enabledFeeds.length || quickSources.length} feed(s)`
      );
      setSessionTimestamp(doneTs);
      setSessionStatus('success');
      setNewlyDiscoveredIds(ids);
      if (ids.length > 0) {
        setFilterMode('latest');
      }
    } else {
      setSessionEntries((prev) => [
        ...prev,
        { timestamp: doneTs, message: 'Discovery sweep returned an error or failed to complete.' },
      ]);
      setSessionSummary('RSS discovery sweep failed to complete.');
      setSessionTimestamp(doneTs);
      setSessionStatus('failed');
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleRunDiscovery({
      query: searchQuery.trim() || undefined,
      topics: aiConfig.activeTopics,
      count: batchSize,
    });
  };

  // Toggle a shoot photograph in/out of the post's multi-image Carousel
  const handleToggleShootFrame = async (post: EditorialPost, photoUrl: string) => {
    const current = post.imageUrls || [];
    const isSelected = current.includes(photoUrl);
    let nextImageUrls: string[];
    if (isSelected) {
      if (current.length <= 1) return;
      nextImageUrls = current.filter((u) => u !== photoUrl);
    } else {
      nextImageUrls = [...current, photoUrl];
    }
    await onPostAction(post.id, 'select_images', {
      imageUrls: nextImageUrls,
      candidateImages: post.candidateImages,
    });
  };

  // Promote a shoot frame to #1 Cover
  const handleMakeCover = async (post: EditorialPost, photoUrl: string) => {
    const otherSelected = (post.imageUrls || []).filter((u) => u !== photoUrl);
    const nextImageUrls = [photoUrl, ...otherSelected];
    setActiveSlideIndex((prev) => ({ ...prev, [post.id]: 0 }));
    await onPostAction(post.id, 'select_images', {
      imageUrls: nextImageUrls,
      candidateImages: post.candidateImages,
    });
  };

  const nonRejectedPosts = posts.filter((post) => post.status !== 'rejected');

  const filteredPosts = nonRejectedPosts.filter((post) => {
    if (filterMode === 'latest' && newlyDiscoveredIds.length > 0) {
      return newlyDiscoveredIds.includes(post.id);
    }
    if (filterMode === 'in_queue') {
      return post.status === 'selected';
    }
    if (filterMode === 'approved') {
      return post.status === 'approved' || post.status === 'scheduled';
    }
    return true;
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-5">
        <div className="min-w-0">
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            {tx('AI Editoryal Arama & Çekim Kürasyonu', 'AI Editorial Search & Shoot Curation')}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onDeduplicate}
            disabled={isProcessing}
            className="px-3.5 py-2 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#c5a880] rounded text-xs font-mono text-[#d4d4d8] transition cursor-pointer flex items-center gap-1.5"
            title={tx('Arşivdeki kopya veya eski öğeleri temizle', 'Remove duplicate or stale items from archive')}
          >
            <Trash2 className="w-3.5 h-3.5 text-[#c5a880]" />
            <span>{tx('Kopyaları Temizle', 'Clean Duplicates')}</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToSettings}
            className="px-3.5 py-2 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#c5a880] rounded text-xs font-mono text-[#c5a880] transition cursor-pointer flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{tx('RSS & AI Ayarları', 'RSS & AI Settings')}</span>
          </button>
        </div>
      </div>

      {/* 1. LIVE RSS & KEYWORD DISCOVERY DESK */}
      <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-mono uppercase tracking-wider text-[#c5a880] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>{tx('AI Keşif & Canlı RSS Arama (Ajan 1 + Ajan 2 Denetimi)', 'AI Discovery & Live RSS Search (Agent 1 + Agent 2 Audit)')}</span>
            </label>
            <span className="text-[11px] font-mono text-[#71717a]">
              {enabledFeeds.length} {tx('aktif RSS kaynağı', 'active RSS feed(s)')}
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={tx(
                  "Yayın, fotoğrafçı veya tasarımcı arayın (örn. 'Numéro', 'Txema Yeste', 'Maison Margiela')...",
                  "Search publication, photographer, or designer (e.g. 'Numéro', 'Txema Yeste', 'Maison Margiela')..."
                )}
                className="w-full px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] focus:border-[#c5a880] rounded text-xs sm:text-sm text-[#f4f3ef] font-sans focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#f4f3ef] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2">
                <span className="text-[11px] font-mono text-[#8e8d8a] uppercase">{tx('Parti', 'Batch')}:</span>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="bg-transparent text-xs font-mono text-[#f4f3ef] focus:outline-none cursor-pointer"
                >
                  <option value={1} className="bg-[#121212]">1 {tx('Makale', 'Article')}</option>
                  <option value={2} className="bg-[#121212]">2 {tx('Makale', 'Articles')}</option>
                  <option value={3} className="bg-[#121212]">3 {tx('Makale', 'Articles')}</option>
                  <option value={5} className="bg-[#121212]">5 {tx('Makale', 'Articles')}</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-3 bg-[#c5a880] hover:bg-[#d4b992] disabled:opacity-50 text-[#0a0a0a] font-mono text-xs uppercase tracking-wider font-semibold rounded transition cursor-pointer flex items-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? tx('Kaynaklar Taranıyor...', 'Scanning Feeds...') : tx('Keşfet & Denetle', 'Discover & Audit')}</span>
              </button>
            </div>
          </div>

          {/* Dynamic 1-Click Publication Buttons synced from Settings RSS Feeds */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase text-[#71717a] mr-1">
              {tx('Hızlı Çekim', 'Quick Pull')}:
            </span>
            {quickSources.map((pub) => (
              <button
                key={pub.label}
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setSearchQuery(pub.query);
                  handleRunDiscovery({ query: pub.query, count: batchSize });
                }}
                className="px-2.5 py-1 bg-[#181818] hover:bg-[#222222] border border-[#262626] hover:border-[#c5a880] rounded text-[11px] font-mono text-[#d4d4d8] hover:text-[#c5a880] transition cursor-pointer"
              >
                + {pub.label}
              </button>
            ))}
          </div>
        </form>

        {/* Collapsible Live RSS & Article Extraction Log */}
        <RssExtractionLog
          entries={logDisplayState.entries}
          lastEventSummary={logDisplayState.summary}
          lastEventTimestamp={logDisplayState.timestamp}
          status={logDisplayState.status}
          onClear={handleClearExtractionLog}
        />
      </div>

      {/* 2. FILTER BAR & LAYOUT TOGGLE */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121212] rounded border border-[#222222]">
          {newlyDiscoveredIds.length > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode('latest')}
              className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
                filterMode === 'latest'
                  ? 'bg-[#c5a880] text-[#0a0a0a] font-semibold'
                  : 'text-[#c5a880] hover:bg-[#1a1a1a]'
              }`}
            >
              {tx('Son Arama', 'Last Search')} ({newlyDiscoveredIds.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'all' ? 'bg-[#222222] text-[#f4f3ef]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            {tx('Tümü', 'All')} ({nonRejectedPosts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('in_queue')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'in_queue' ? 'bg-[#222222] text-[#c5a880]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            {tx('Onay Kuyruğu', 'Approval Queue')} ({posts.filter((p) => p.status === 'selected').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('approved')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'approved' ? 'bg-[#222222] text-[#a3e635]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            {tx('Post Paketleri', 'Post Packages')} ({posts.filter((p) => p.status === 'approved' || p.status === 'scheduled').length})
          </button>
        </div>

        {/* Detailed vs Compact Grid Toggle */}
        <div className="flex items-center gap-1 p-1 bg-[#121212] border border-[#222222] rounded">
          <button
            type="button"
            onClick={() => setLayoutMode('detailed')}
            className={`px-2.5 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition cursor-pointer ${
              layoutMode === 'detailed'
                ? 'bg-[#222222] text-[#f4f3ef]'
                : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>{tx('Detaylı', 'Detailed')}</span>
          </button>
          <button
            type="button"
            onClick={() => setLayoutMode('compact')}
            className={`px-2.5 py-1.5 rounded text-xs font-mono flex items-center gap-1.5 transition cursor-pointer ${
              layoutMode === 'compact'
                ? 'bg-[#222222] text-[#f4f3ef]'
                : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>{tx('Kompakt Izgara', 'Compact Grid')}</span>
          </button>
        </div>
      </div>

      {/* 3. DISCOVERED ARTICLES WITH COHERENT SHOOT PHOTO GALLERY */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 bg-[#121212] border border-[#222222] rounded text-center space-y-2">
          <p className="text-sm text-[#8e8d8a] font-sans">
            {tx('Bu filtreyle eşleşen editoryal bulunamadı.', 'No editorials matching this filter.')}
          </p>
        </div>
      ) : (
        <div
          className={`grid gap-6 ${
            layoutMode === 'compact'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1 md:grid-cols-2'
          }`}
        >
          {filteredPosts.map((post) => {
            const isNewDiscovery = newlyDiscoveredIds.includes(post.id);
            const selectedFrames = post.imageUrls || [];
            const shootGallery =
              post.candidateImages && post.candidateImages.length > 0
                ? post.candidateImages
                : selectedFrames;
            const currentSlide = Math.min(
              activeSlideIndex[post.id] || 0,
              Math.max(0, selectedFrames.length - 1)
            );

            return (
              <article
                key={post.id}
                className={`bg-[#121212] border rounded overflow-hidden flex flex-col justify-between transition ${
                  isNewDiscovery
                    ? 'border-[#c5a880] ring-1 ring-[#c5a880]/40'
                    : 'border-[#222222] hover:border-[#333333]'
                }`}
              >
                <div>
                  {/* Cover Preview with Minimal Overlays */}
                  <div className="relative aspect-[4/3] bg-[#0a0a0a] overflow-hidden border-b border-[#222222]">
                    {selectedFrames.length > 0 ? (
                      <img
                        src={selectedFrames[currentSlide] || selectedFrames[0]}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#71717a]">
                        {tx('Editoryal Önizleme', 'Editorial Preview')}
                      </div>
                    )}

                    {/* Carousel Prev / Next Arrows */}
                    {selectedFrames.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveSlideIndex((prev) => ({
                              ...prev,
                              [post.id]:
                                (currentSlide - 1 + selectedFrames.length) %
                                selectedFrames.length,
                            }))
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#0a0a0a]/85 border border-[#333333] text-[#f4f3ef] hover:border-[#c5a880] cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveSlideIndex((prev) => ({
                              ...prev,
                              [post.id]: (currentSlide + 1) % selectedFrames.length,
                            }))
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#0a0a0a]/85 border border-[#333333] text-[#f4f3ef] hover:border-[#c5a880] cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Minimal Top-Left Badges (Score + New) */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
                      <span className="bg-[#0a0a0a]/90 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626] text-xs font-mono font-semibold text-[#f4f3ef] tabular-nums">
                        {tx('PUAN', 'SCORE')} {post.score.overall}/100
                      </span>
                      {isNewDiscovery && (
                        <span className="bg-[#c5a880] text-[#0a0a0a] px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                          {tx('Yeni', 'New')}
                        </span>
                      )}
                    </div>

                    {/* Minimal Bottom-Left Frame Indicator */}
                    <div className="absolute bottom-3 left-3 bg-[#0a0a0a]/90 text-[#c5a880] px-2.5 py-1 rounded border border-[#c5a880]/40 text-[10px] font-mono uppercase flex items-center gap-1 pointer-events-none tabular-nums">
                      <Layers className="w-3 h-3" />
                      <span>
                        {tx('Kare', 'Frame')} {currentSlide + 1} / {selectedFrames.length}
                      </span>
                    </div>
                  </div>

                  {/* Shoot Gallery Frame Selector (shown in Detailed mode) */}
                  {layoutMode === 'detailed' && (
                    <div className="p-4 bg-[#0e0e0e] border-b border-[#1e1e1e] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-[#c5a880]">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>{tx('Çekim Galerisi', 'Shoot Gallery')} ({shootGallery.length} {tx('Fotoğraf', 'Photos')})</span>
                        </div>

                        <span className="text-[10px] font-mono text-[#a3e635] tabular-nums">
                          {selectedFrames.length} {tx('Seçili', 'Selected')}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 pt-1 max-h-[200px] overflow-y-auto pr-1">
                        {shootGallery.map((imgUrl, idx) => {
                          const orderIdx = selectedFrames.indexOf(imgUrl);
                          const isSelected = orderIdx !== -1;

                          return (
                            <div
                              key={`${imgUrl}-${idx}`}
                              className={`group relative aspect-[3/4] rounded overflow-hidden border transition ${
                                orderIdx === 0
                                  ? 'border-[#c5a880] ring-2 ring-[#c5a880]/50 opacity-100'
                                  : isSelected
                                  ? 'border-[#a3e635] ring-1 ring-[#a3e635]/50 opacity-100'
                                  : 'border-[#262626] opacity-55 hover:opacity-95'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleShootFrame(post, imgUrl)}
                                className="w-full h-full block cursor-pointer"
                                title={
                                  isSelected
                                    ? tx(`Kare #${orderIdx + 1} (kaldırmak için tıklayın)`, `Frame #${orderIdx + 1} (click to remove)`)
                                    : tx("Carousel'e eklemek için tıklayın", 'Click to include in Carousel')
                                }
                              >
                                <img
                                  src={imgUrl}
                                  alt={`Shoot frame ${idx + 1}`}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover object-top"
                                />
                              </button>

                              <span
                                className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase pointer-events-none ${
                                  orderIdx === 0
                                    ? 'bg-[#c5a880] text-[#0a0a0a] font-bold'
                                    : isSelected
                                    ? 'bg-[#a3e635] text-[#0a0a0a] font-bold'
                                    : 'bg-[#0a0a0a]/80 text-[#d4d4d8]'
                                }`}
                              >
                                {orderIdx === 0
                                  ? tx('1. Kapak', '1. Cover')
                                  : isSelected
                                  ? `${orderIdx + 1}. ${tx('Kare', 'Frame')}`
                                  : tx('+ Seç', '+ Select')}
                              </span>

                              {isSelected && orderIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMakeCover(post, imgUrl);
                                  }}
                                  className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#0a0a0a]/90 hover:bg-[#c5a880] hover:text-[#0a0a0a] border border-[#c5a880]/50 text-[8px] font-mono text-[#c5a880] cursor-pointer"
                                >
                                  {tx('#1 Yap', 'Make #1')}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#8e8d8a]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[#c5a880] uppercase font-semibold">{post.publication}</span>
                        <span>·</span>
                        <span>{post.photographer}</span>
                        <span>·</span>
                        <span>{post.publicationDate}</span>
                      </div>

                      {post.sourceUrl && (
                        <a
                          href={post.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#181818] hover:bg-[#222222] border border-[#2e2e2e] text-[11px] font-mono text-[#c5a880] hover:text-[#f4f3ef]"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{tx('Orijinal Bağlantıyı Doğrula', 'Verify Original Link')}</span>
                        </a>
                      )}
                    </div>

                    <h2
                      className={`font-editorial text-[#f4f3ef] font-normal leading-snug ${
                        layoutMode === 'compact' ? 'text-xl line-clamp-2' : 'text-2xl'
                      }`}
                    >
                      {post.title}
                    </h2>

                    <p
                      className={`text-xs text-[#a1a1aa] leading-relaxed ${
                        layoutMode === 'compact' ? 'line-clamp-2' : ''
                      }`}
                    >
                      {post.creativeDirection}
                    </p>
                  </div>
                </div>

                {/* Footer Pipeline Actions */}
                <div className="p-5 pt-3 border-t border-[#1e1e1e] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onPostAction(post.id, 'send_to_queue', {
                          imageUrls: selectedFrames,
                        })
                      }
                      disabled={isProcessing}
                      className="px-3.5 py-2 bg-[#c5a880] hover:bg-[#d4b992] text-[#0a0a0a] text-xs font-mono font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>
                        {post.status === 'selected'
                          ? `${tx('Kuyrukta', 'In Queue')} (${selectedFrames.length})`
                          : `${tx('Kuyruğa Gönder', 'Send to Queue')} (${selectedFrames.length})`}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onPostAction(post.id, 'approve', {
                          imageUrls: selectedFrames,
                        })
                      }
                      disabled={isProcessing}
                      className="px-2.5 py-2 bg-[#161616] hover:bg-[#222222] border border-[#2a2a2a] hover:border-[#a3e635] text-[#a1a1aa] hover:text-[#a3e635] text-[11px] font-mono uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1"
                      title={tx('Onay Kuyruğunu atla ve doğrudan Post Paketlerine gönder', 'Skip Approval Queue and send straight to Post Packages')}
                    >
                      <Check className="w-3 h-3" />
                      <span>{tx('Kuyruğu Atla', 'Skip Queue')}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenCaptionEditor(post)}
                      className="p-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded text-[#8e8d8a] hover:text-[#f4f3ef] cursor-pointer"
                      title={tx('Metin & AI Tonu Düzenle', 'Edit Caption & AI Tone')}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onPostAction(post.id, 'save')}
                      className="p-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded text-[#8e8d8a] hover:text-[#f4f3ef] cursor-pointer"
                      title={tx('Kaydet', 'Save')}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onPostAction(post.id, 'reject')}
                      className="p-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded text-[#8e8d8a] hover:text-[#ef4444] cursor-pointer"
                      title={tx('Reddet', 'Reject')}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
