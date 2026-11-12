import React, { useState, useEffect } from 'react';
import { AiAgentConfig, EditorialPost } from '../types/editorial';
import {
  Search,
  Sparkles,
  Plus,
  X,
  Check,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Send,
  Edit3,
  Bookmark,
  Bot,
  Sliders,
  RefreshCw,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  Terminal,
  Trash2,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AiSearchEngineViewProps {
  posts: EditorialPost[];
  aiConfig: AiAgentConfig;
  onUpdateAiConfig: (updates: Partial<AiAgentConfig>) => Promise<void>;
  onDiscoverBatch: (params: {
    query?: string;
    topics?: string[];
    count?: number;
  }) => Promise<{ count: number; posts: EditorialPost[]; steps: string[] } | null>;
  onDeduplicate: () => Promise<void>;
  onAuditAll: (autoApprove?: boolean) => Promise<void>;
  onPostAction: (postId: string, action: string, payload?: any) => Promise<void>;
  onOpenCaptionEditor: (post: EditorialPost) => void;
  onNavigateToSettings: () => void;
  onNavigateToApprovalQueue?: () => void;
  isProcessing?: boolean;
}

const LIVE_PUBLICATION_FILTERS = [
  { label: 'Numéro Fashion Series', query: 'Numéro' },
  { label: 'Vogue Runway & Archive', query: 'Vogue' },
  { label: 'Interview Magazine', query: 'Interview' },
  { label: 'Dazed Photography', query: 'Dazed' },
  { label: 'Txema Yeste Series', query: 'Txema Yeste' },
  { label: 'Richard Avedon 1967', query: 'Avedon' },
];

export const AiSearchEngineView: React.FC<AiSearchEngineViewProps> = ({
  posts,
  aiConfig,
  onUpdateAiConfig,
  onDiscoverBatch,
  onDeduplicate,
  onAuditAll,
  onPostAction,
  onOpenCaptionEditor,
  onNavigateToSettings,
  onNavigateToApprovalQueue,
  isProcessing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchSize, setBatchSize] = useState<number>(aiConfig.defaultBatchSize || 3);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'in_queue' | 'approved'>('all');
  const [streamCountdown, setStreamCountdown] = useState<number>(45);
  const [activeSlideIndex, setActiveSlideIndex] = useState<Record<string, number>>({});

  // Live API & Source Extraction Console State
  const [lastPipelineSteps, setLastPipelineSteps] = useState<string[]>([
    'Live Fashion Editorial Feeds Connected: Numéro Fashion Series, Vogue Runway & Archive, Interview Magazine, Dazed Photography.',
    'Commercial product/shopping roundups (shoes, watches, luggage, bags) are strictly filtered out — only multi-photo editorial shoots are curated.',
  ]);
  const [newlyDiscoveredIds, setNewlyDiscoveredIds] = useState<string[]>([]);
  const [lastRunTimestamp, setLastRunTimestamp] = useState<string | null>(null);

  useEffect(() => {
    setBatchSize(aiConfig.defaultBatchSize || 3);
  }, [aiConfig.defaultBatchSize]);

  // Autonomous background discovery timer when autonomousStreamEnabled is active
  useEffect(() => {
    if (!aiConfig.autonomousStreamEnabled) {
      setStreamCountdown(45);
      return;
    }

    const interval = setInterval(() => {
      setStreamCountdown((prev) => {
        if (prev <= 1) {
          if (!isProcessing) {
            handleRunDiscovery({
              topics: aiConfig.activeTopics,
              count: 1,
            });
          }
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [aiConfig.autonomousStreamEnabled, aiConfig.activeTopics, isProcessing]);

  const handleRunDiscovery = async (params: { query?: string; topics?: string[]; count?: number }) => {
    setLastPipelineSteps([
      `[RUNNING] Connecting to live RSS & article HTML pages (Vogue, Wallpaper*, Dazed, W Magazine, Harper's Bazaar)...`,
      `[QUERY] ${params.query ? `"${params.query}"` : `Live Magazine Feed Sweep`}`,
    ]);
    const result = await onDiscoverBatch(params);
    if (result) {
      setLastPipelineSteps(
        result.steps && result.steps.length > 0
          ? result.steps
          : [`Fetched ${result.count} live magazine article(s) with coherent shoot galleries.`]
      );
      setNewlyDiscoveredIds((result.posts || []).map((p) => p.id));
      setLastRunTimestamp(new Date().toLocaleTimeString());
    }
  };

  const handleToggleTopic = async (topic: string) => {
    const exists = aiConfig.activeTopics.includes(topic);
    const nextActive = exists
      ? aiConfig.activeTopics.filter((t) => t !== topic)
      : [...aiConfig.activeTopics, topic];

    await onUpdateAiConfig({ activeTopics: nextActive });
  };

  const handleAddCustomTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTopicInput.trim();
    if (!trimmed) return;
    const nextAvailable = aiConfig.availableTopics.includes(trimmed)
      ? aiConfig.availableTopics
      : [...aiConfig.availableTopics, trimmed];
    const nextActive = aiConfig.activeTopics.includes(trimmed)
      ? aiConfig.activeTopics
      : [...aiConfig.activeTopics, trimmed];

    await onUpdateAiConfig({
      availableTopics: nextAvailable,
      activeTopics: nextActive,
    });
    setNewTopicInput('');
  };

  const handleDeleteTopic = async (topic: string) => {
    await onUpdateAiConfig({
      availableTopics: aiConfig.availableTopics.filter((t) => t !== topic),
      activeTopics: aiConfig.activeTopics.filter((t) => t !== topic),
    });
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
      if (current.length <= 1) return; // Keep at least 1 photo
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

  const filteredPosts = posts.filter((post) => {
    if (post.status === 'rejected') return false;
    if (filterMode === 'in_queue') {
      return post.status === 'selected';
    }
    if (filterMode === 'approved') {
      return post.status === 'approved' || post.status === 'scheduled';
    }
    return true;
  });

  const renderRightsBadge = (status: EditorialPost['rightsStatus']) => {
    if (status === 'verified') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#a3e635]">
          <ShieldCheck className="w-3.5 h-3.5" />
          Verified Source
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#facc15]">
          <Clock className="w-3.5 h-3.5" />
          Rights Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#c5a880]">
        <ShieldAlert className="w-3.5 h-3.5" />
        Reference Advisory
      </span>
    );
  };

  return (
    <div className="space-y-8 w-full max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Live Magazine RSS & Article Shoot Extractor</span>
            <span>·</span>
            <span>Vogue · Wallpaper* · Dazed · W · Harper's Bazaar</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            AI Editorial Search & Shoot Curation
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Every article below is pulled from a real fashion publication with its verified link and coherent shoot photographs. Select the frames you want to publish together in a single Carousel post, then send to Approval Queue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Clean Duplicates & Fake Posts Button */}
          <button
            type="button"
            onClick={onDeduplicate}
            disabled={isProcessing}
            className="px-3.5 py-2 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#c5a880] rounded text-xs font-mono text-[#d4d4d8] transition cursor-pointer flex items-center gap-1.5"
            title="Purge any duplicate or synthetic items"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#c5a880]" />
            <span>Clean Duplicates</span>
          </button>

          {/* Autonomous Stream Toggle */}
          <button
            type="button"
            onClick={() =>
              onUpdateAiConfig({ autonomousStreamEnabled: !aiConfig.autonomousStreamEnabled })
            }
            className={`px-3.5 py-2 rounded border text-xs font-mono uppercase tracking-wider transition cursor-pointer flex items-center gap-2 ${
              aiConfig.autonomousStreamEnabled
                ? 'bg-[#1a2618] border-[#a3e635] text-[#a3e635]'
                : 'bg-[#161616] border-[#2a2a2a] text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${aiConfig.autonomousStreamEnabled ? 'animate-pulse text-[#a3e635]' : ''}`} />
            <span>
              {aiConfig.autonomousStreamEnabled
                ? `Auto-Stream Active (${streamCountdown}s)`
                : 'Enable Autonomous Stream'}
            </span>
          </button>

          {/* Customize Agents in Settings */}
          <button
            type="button"
            onClick={onNavigateToSettings}
            className="px-3.5 py-2 bg-[#161616] hover:bg-[#1e1e1e] border border-[#2a2a2a] hover:border-[#c5a880] rounded text-xs font-mono text-[#c5a880] transition cursor-pointer flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize AI Agents</span>
          </button>
        </div>
      </div>

      {/* 1. LIVE MAGAZINE SEARCH & DIRECT ARTICLE URL SCRAPER */}
      <div className="p-5 sm:p-6 bg-[#121212] border border-[#222222] rounded space-y-6">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-mono uppercase tracking-wider text-[#c5a880] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Search Real Magazine Feeds OR Paste Any Live Article URL (Agent 1)</span>
            </label>
            <span className="text-[11px] font-mono text-[#8e8d8a]">
              Pulls real articles + extracts only the photographs belonging to that specific shoot
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search publication, brand, or paste live article URL (e.g. 'Vogue', 'Maison Margiela', or 'https://www.vogue.com/article/...')"
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
                <span className="text-[11px] font-mono text-[#8e8d8a] uppercase">Articles:</span>
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
                <span>{isProcessing ? 'Fetching Live Articles...' : 'Fetch Live Magazine Articles'}</span>
              </button>
            </div>
          </div>

          {/* 1-Click Live Magazine Publication Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase text-[#71717a] mr-1">
              Pull Directly From Publication:
            </span>
            {LIVE_PUBLICATION_FILTERS.map((pub) => (
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

        {/* LIVE API & SOURCE EXTRACTION TELEMETRY CONSOLE */}
        <div className="p-3.5 bg-[#0a0a0a] border border-[#262626] rounded space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c1c1c] pb-2">
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#c5a880] uppercase">
              <Terminal className="w-3.5 h-3.5" />
              <span>Live RSS & Article Shoot Extraction Log</span>
              {isProcessing && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#c5a880]/20 text-[#c5a880] text-[10px]">
                  SCRAPING LIVE ARTICLES...
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-[#8e8d8a]">
              {newlyDiscoveredIds.length > 0 && (
                <span className="text-[#a3e635]">
                  +{newlyDiscoveredIds.length} New Real Article(s) Added
                </span>
              )}
              {lastRunTimestamp && <span>Last Sync: {lastRunTimestamp}</span>}
            </div>
          </div>
          <ul className="space-y-1 text-[11px] font-mono text-[#d4d4d8]">
            {lastPipelineSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-[#c5a880] select-none">›</span>
                <span className="break-all">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 2. FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121212] rounded border border-[#222222]">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'all' ? 'bg-[#222222] text-[#f4f3ef]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            All Articles ({posts.filter(p => p.status !== 'rejected').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('in_queue')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'in_queue' ? 'bg-[#222222] text-[#c5a880]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            Sent to Approval Queue ({posts.filter(p => p.status === 'selected').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('approved')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'approved' ? 'bg-[#222222] text-[#a3e635]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            Approved in Post Packages ({posts.filter(p => p.status === 'approved' || p.status === 'scheduled').length})
          </button>
        </div>

        <div className="text-xs font-mono text-[#c5a880]">
          Step 1: Select photos from shoot gallery → Step 2: Send to Approval Queue → Step 3: Approve for Post Packages
        </div>
      </div>

      {/* 3. DISCOVERED ARTICLES WITH COHERENT SHOOT PHOTO GALLERY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                {/* Top Active Carousel Preview */}
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

                  <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                    <div className="flex items-center gap-1.5">
                      <span className="bg-[#0a0a0a]/90 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626] text-xs font-mono font-semibold text-[#f4f3ef]">
                        SCORE {post.score.overall}/100
                      </span>
                      {isNewDiscovery && (
                        <span className="bg-[#c5a880] text-[#0a0a0a] px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                          New Live Article
                        </span>
                      )}
                      <span className="bg-[#0a0a0a]/90 text-[#c5a880] px-2.5 py-1 rounded border border-[#c5a880]/40 text-[10px] font-mono uppercase flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        Frame {currentSlide + 1} / {selectedFrames.length} Selected
                      </span>
                    </div>
                    <div className="bg-[#0a0a0a]/90 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626]">
                      {renderRightsBadge(post.rightsStatus)}
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-3 bg-[#0a0a0a]/90 backdrop-blur-md px-2.5 py-1 rounded border border-[#c5a880]/40 text-[10px] font-mono text-[#c5a880] uppercase">
                    {post.publication}
                  </div>

                  <div className="absolute bottom-3 right-3 bg-[#0a0a0a]/90 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626] text-[10px] font-mono uppercase text-[#f4f3ef]">
                    {post.status === 'selected' ? 'In Approval Queue' : post.status}
                  </div>
                </div>

                {/* THIS ARTICLE'S COHERENT SHOOT GALLERY SELECTOR */}
                <div className="p-4 bg-[#0e0e0e] border-b border-[#1e1e1e] space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase text-[#c5a880]">
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>
                        Shoot Gallery from This Article ({shootGallery.length} Coherent Photos)
                      </span>
                    </div>

                    <span className="text-[10px] font-mono text-[#a3e635]">
                      {selectedFrames.length} Photo(s) Selected for Single Post
                    </span>
                  </div>

                  <p className="text-[11px] text-[#8e8d8a] font-sans">
                    Click any photo from this shoot to include or remove it from this post's Carousel:
                  </p>

                  {/* Thumbnail Strip of This Article's Shoot Images */}
                  <div className="grid grid-cols-4 gap-2 pt-1 max-h-[220px] overflow-y-auto pr-1">
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
                                ? `Selected as Frame #${orderIdx + 1} (click to remove)`
                                : 'Click to add this shoot photograph to the post'
                            }
                          >
                            <img
                              src={imgUrl}
                              alt={`Shoot frame ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top"
                            />
                          </button>

                          {/* Top-left Frame Order Badge */}
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

                          {/* Make Cover Button if selected and not #1 */}
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

                {/* Body Content & Real Verifiable Source URL */}
                <div className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#8e8d8a]">
                    <div className="flex items-center gap-2">
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

                  <h2 className="font-editorial text-2xl text-[#f4f3ef] font-normal leading-snug">
                    {post.title}
                  </h2>

                  {post.sourceUrl && (
                    <div className="text-[11px] font-mono text-[#8e8d8a] truncate">
                      <span className="text-[#71717a]">Article URL: </span>
                      <a
                        href={post.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#c5a880] underline hover:text-[#f4f3ef]"
                      >
                        {post.sourceUrl}
                      </a>
                    </div>
                  )}

                  <p className="text-xs text-[#a1a1aa] leading-relaxed">
                    {post.creativeDirection}
                  </p>
                </div>
              </div>

              {/* Footer Pipeline Actions: Send Selected Carousel Frames to Approval Queue */}
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
                        ? `In Approval Queue (${selectedFrames.length} Frames)`
                        : `Send ${selectedFrames.length} Frame(s) to Approval Queue`}
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
                    className="px-3 py-2 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] text-xs font-mono font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve Directly</span>
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
    </div>
  );
};
