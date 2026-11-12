import React, { useState, useEffect } from 'react';
import { AiAgentConfig, EditorialPost, RssFeedConfig } from '../types/editorial';
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
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
} from 'lucide-react';

interface AiSearchEngineViewProps {
  posts: EditorialPost[];
  aiConfig: AiAgentConfig;
  rssFeeds?: RssFeedConfig[];
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

export const AiSearchEngineView: React.FC<AiSearchEngineViewProps> = ({
  posts,
  aiConfig,
  rssFeeds = [],
  onDiscoverBatch,
  onDeduplicate,
  onPostAction,
  onOpenCaptionEditor,
  onNavigateToSettings,
  isProcessing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchSize, setBatchSize] = useState<number>(aiConfig.defaultBatchSize || 3);
  const [filterMode, setFilterMode] = useState<'latest' | 'all' | 'in_queue' | 'approved'>('all');
  const [layoutMode, setLayoutMode] = useState<'detailed' | 'compact'>('detailed');
  const [activeSlideIndex, setActiveSlideIndex] = useState<Record<string, number>>({});

  // Compact Last-Sweep Trace (hidden by default until a search runs)
  const [lastPipelineSteps, setLastPipelineSteps] = useState<string[]>([]);
  const [showLogDetails, setShowLogDetails] = useState(false);
  const [newlyDiscoveredIds, setNewlyDiscoveredIds] = useState<string[]>([]);
  const [lastRunTimestamp, setLastRunTimestamp] = useState<string | null>(null);

  useEffect(() => {
    setBatchSize(aiConfig.defaultBatchSize || 3);
  }, [aiConfig.defaultBatchSize]);

  const enabledFeeds = rssFeeds.filter((f) => f.enabled);
  const quickSources =
    enabledFeeds.length > 0
      ? enabledFeeds.map((f) => ({ label: f.name, query: f.name }))
      : FALLBACK_PUBLICATION_FILTERS;

  const handleRunDiscovery = async (params: { query?: string; topics?: string[]; count?: number }) => {
    setLastPipelineSteps([
      `Scanning enabled RSS feeds${params.query ? ` for "${params.query}"` : ''}...`,
    ]);
    const result = await onDiscoverBatch(params);
    if (result) {
      const ids = (result.posts || []).map((p) => p.id);
      setLastPipelineSteps(
        result.steps && result.steps.length > 0
          ? result.steps
          : [`Fetched ${result.count} live magazine article(s) with coherent shoot galleries.`]
      );
      setNewlyDiscoveredIds(ids);
      setLastRunTimestamp(new Date().toLocaleTimeString('en-GB'));
      if (ids.length > 0) {
        setFilterMode('latest');
      }
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
            AI Editorial Search & Shoot Curation
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onDeduplicate}
            disabled={isProcessing}
            className="px-3.5 py-2 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#c5a880] rounded text-xs font-mono text-[#d4d4d8] transition cursor-pointer flex items-center gap-1.5"
            title="Remove duplicate or stale items from archive"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#c5a880]" />
            <span>Clean Duplicates</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToSettings}
            className="px-3.5 py-2 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#c5a880] rounded text-xs font-mono text-[#c5a880] transition cursor-pointer flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>RSS & AI Settings</span>
          </button>
        </div>
      </div>

      {/* 1. LIVE RSS & KEYWORD DISCOVERY DESK */}
      <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-mono uppercase tracking-wider text-[#c5a880] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>AI Discovery & Live RSS Search (Agent 1 + Agent 2 Audit)</span>
            </label>
            <span className="text-[11px] font-mono text-[#71717a]">
              {enabledFeeds.length} active RSS feed(s)
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search publication, photographer, or designer (e.g. 'Numéro', 'Txema Yeste', 'Maison Margiela')..."
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
                <span className="text-[11px] font-mono text-[#8e8d8a] uppercase">Batch:</span>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="bg-transparent text-xs font-mono text-[#f4f3ef] focus:outline-none cursor-pointer"
                >
                  <option value={1} className="bg-[#121212]">1 Article</option>
                  <option value={2} className="bg-[#121212]">2 Articles</option>
                  <option value={3} className="bg-[#121212]">3 Articles</option>
                  <option value={5} className="bg-[#121212]">5 Articles</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-3 bg-[#c5a880] hover:bg-[#d4b992] disabled:opacity-50 text-[#0a0a0a] font-mono text-xs uppercase tracking-wider font-semibold rounded transition cursor-pointer flex items-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Scanning Feeds...' : 'Discover & Audit'}</span>
              </button>
            </div>
          </div>

          {/* Dynamic 1-Click Publication Buttons synced from Settings RSS Feeds */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase text-[#71717a] mr-1">
              Quick Pull:
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

        {/* Compact Last-Sweep Status Bar (only visible while running or after a sweep) */}
        {(isProcessing || lastRunTimestamp) && (
          <div className="pt-3 border-t border-[#1e1e1e] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-[#8e8d8a]">
                <span className={isProcessing ? 'text-[#c5a880] animate-pulse' : 'text-[#a3e635]'}>
                  {isProcessing
                    ? 'Scraping active RSS feeds & extracting shoot galleries...'
                    : `Sync ${lastRunTimestamp} · +${newlyDiscoveredIds.length} new article(s) discovered`}
                </span>
              </div>

              {lastPipelineSteps.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowLogDetails((prev) => !prev)}
                  className="text-[#8e8d8a] hover:text-[#c5a880] flex items-center gap-1 cursor-pointer"
                >
                  <span>{showLogDetails ? 'Hide Trace' : 'Extraction Trace'}</span>
                  {showLogDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {showLogDetails && lastPipelineSteps.length > 0 && (
              <ul className="p-3 bg-[#0a0a0a] border border-[#222222] rounded space-y-1 text-[11px] font-mono text-[#a1a1aa]">
                {lastPipelineSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#c5a880] select-none">›</span>
                    <span className="break-words">{step}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
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
              Last Search ({newlyDiscoveredIds.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'all' ? 'bg-[#222222] text-[#f4f3ef]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            All ({nonRejectedPosts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('in_queue')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'in_queue' ? 'bg-[#222222] text-[#c5a880]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            Approval Queue ({posts.filter((p) => p.status === 'selected').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('approved')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'approved' ? 'bg-[#222222] text-[#a3e635]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            Post Packages ({posts.filter((p) => p.status === 'approved' || p.status === 'scheduled').length})
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
            <span>Detailed</span>
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
            <span>Compact Grid</span>
          </button>
        </div>
      </div>

      {/* 3. DISCOVERED ARTICLES WITH COHERENT SHOOT PHOTO GALLERY */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 bg-[#121212] border border-[#222222] rounded text-center space-y-2">
          <p className="text-sm text-[#8e8d8a] font-sans">No editorials matching this filter.</p>
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
                        Editorial Preview
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
                        SCORE {post.score.overall}/100
                      </span>
                      {isNewDiscovery && (
                        <span className="bg-[#c5a880] text-[#0a0a0a] px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                          New
                        </span>
                      )}
                    </div>

                    {/* Minimal Bottom-Left Frame Indicator */}
                    <div className="absolute bottom-3 left-3 bg-[#0a0a0a]/90 text-[#c5a880] px-2.5 py-1 rounded border border-[#c5a880]/40 text-[10px] font-mono uppercase flex items-center gap-1 pointer-events-none tabular-nums">
                      <Layers className="w-3 h-3" />
                      <span>
                        Frame {currentSlide + 1} / {selectedFrames.length}
                      </span>
                    </div>
                  </div>

                  {/* Shoot Gallery Frame Selector (shown in Detailed mode) */}
                  {layoutMode === 'detailed' && (
                    <div className="p-4 bg-[#0e0e0e] border-b border-[#1e1e1e] space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-[#c5a880]">
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Shoot Gallery ({shootGallery.length} Photos)</span>
                        </div>

                        <span className="text-[10px] font-mono text-[#a3e635] tabular-nums">
                          {selectedFrames.length} Selected
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
                                    ? `Frame #${orderIdx + 1} (click to remove)`
                                    : 'Click to include in Carousel'
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
                                  ? '1. Cover'
                                  : isSelected
                                  ? `${orderIdx + 1}. Frame`
                                  : '+ Select'}
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
                                  Make #1
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
                          <span>Verify Original Link</span>
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
                          ? `In Queue (${selectedFrames.length})`
                          : `Send to Queue (${selectedFrames.length})`}
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
                      title="Skip Approval Queue and send straight to Post Packages"
                    >
                      <Check className="w-3 h-3" />
                      <span>Skip Queue</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenCaptionEditor(post)}
                      className="p-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded text-[#8e8d8a] hover:text-[#f4f3ef] cursor-pointer"
                      title="Edit Caption & AI Tone"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onPostAction(post.id, 'save')}
                      className="p-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded text-[#8e8d8a] hover:text-[#f4f3ef] cursor-pointer"
                      title="Save"
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onPostAction(post.id, 'reject')}
                      className="p-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded text-[#8e8d8a] hover:text-[#ef4444] cursor-pointer"
                      title="Reject"
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
