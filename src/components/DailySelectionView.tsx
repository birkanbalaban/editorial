import React, { useState } from 'react';
import { EditorialPost } from '../types/editorial';
import { 
  Check, 
  X, 
  Bookmark, 
  Edit3, 
  ExternalLink, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles, 
  Send, 
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowRight
} from 'lucide-react';

interface DailySelectionViewProps {
  top5Posts: EditorialPost[];
  candidates: EditorialPost[];
  onAction: (postId: string, action: string, payload?: any) => Promise<void>;
  onOpenCaptionEditor: (post: EditorialPost) => void;
  onOpenAiResearch: () => void;
  onNavigateToAiSearch?: () => void;
  isProcessingAction?: boolean;
}

export const DailySelectionView: React.FC<DailySelectionViewProps> = ({
  top5Posts,
  candidates,
  onAction,
  onOpenCaptionEditor,
  onOpenAiResearch,
  onNavigateToAiSearch,
  isProcessingAction,
}) => {
  const [activeTab, setActiveTab] = useState<'top5' | 'candidates'>('top5');
  const [expandedScores, setExpandedScores] = useState<Record<string, boolean>>({});
  const [activeSlideIndex, setActiveSlideIndex] = useState<Record<string, number>>({});

  const toggleScoreExpand = (id: string) => {
    setExpandedScores(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentDisplayList = activeTab === 'top5' ? top5Posts : candidates;

  // Toggle a shoot photograph in/out of this post's single-post Carousel
  const handleToggleShootFrame = async (post: EditorialPost, photoUrl: string) => {
    const current = post.imageUrls || [];
    const exists = current.includes(photoUrl);
    let nextUrls: string[];
    if (exists) {
      if (current.length <= 1) return; // Keep at least 1 photo in the post
      nextUrls = current.filter((u) => u !== photoUrl);
    } else {
      nextUrls = [...current, photoUrl];
    }
    await onAction(post.id, 'select_images', {
      imageUrls: nextUrls,
      candidateImages: post.candidateImages,
    });
  };

  // Promote a frame to #1 Cover
  const handleMakeCover = async (post: EditorialPost, photoUrl: string) => {
    const rest = (post.imageUrls || []).filter((u) => u !== photoUrl);
    const nextUrls = [photoUrl, ...rest];
    setActiveSlideIndex((prev) => ({ ...prev, [post.id]: 0 }));
    await onAction(post.id, 'select_images', {
      imageUrls: nextUrls,
      candidateImages: post.candidateImages,
    });
  };

  const rightsBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#a3e635] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Source
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#facc15] font-medium">
            <Clock className="w-3.5 h-3.5" />
            Rights Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#c5a880] font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            Reference Advisory
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 w-full max-w-full overflow-hidden">
      {/* Top Editorial Status & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Live Magazine Feeds · Vogue · Wallpaper* · Dazed · W · Bazaar</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Daily Editorial Selection
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Real editorial articles with verified source links and coherent shoot galleries. Select multiple frames from an article below to combine them into a single Carousel post and send to Approval Queue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onNavigateToAiSearch && (
            <button
              onClick={onNavigateToAiSearch}
              className="px-4 py-2 bg-[#c5a880] hover:bg-[#d4b992] text-[#0a0a0a] text-xs font-mono font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open AI Search Engine</span>
            </button>
          )}
          <button
            onClick={onOpenAiResearch}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] hover:border-[#c5a880] text-xs uppercase tracking-wider text-[#f4f3ef] rounded transition cursor-pointer flex items-center gap-2 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#c5a880]" />
            <span>Quick Add Entry</span>
          </button>
        </div>
      </div>

      {/* Segmented Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-2 p-1 bg-[#121212] rounded border border-[#222222]">
          <button
            onClick={() => setActiveTab('top5')}
            className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded transition cursor-pointer ${
              activeTab === 'top5'
                ? 'bg-[#222222] text-[#f4f3ef] shadow-sm'
                : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            Curated Top 5 ({top5Posts.length})
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-1.5 text-xs font-medium uppercase tracking-wider rounded transition cursor-pointer ${
              activeTab === 'candidates'
                ? 'bg-[#222222] text-[#f4f3ef] shadow-sm'
                : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            Discovery Pool ({candidates.length})
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-[#8e8d8a] font-mono">
          <span>Click shoot frames to select multiple photos for a single Carousel post</span>
        </div>
      </div>

      {/* Editorial Selection Cards Grid */}
      <div className="grid grid-cols-1 gap-8">
        {currentDisplayList.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#222222] rounded bg-[#121212] space-y-3">
            <p className="text-sm text-[#8e8d8a] font-sans">
              Loading live magazine editorials or pool is empty.
            </p>
            {onNavigateToAiSearch && (
              <button
                onClick={onNavigateToAiSearch}
                className="px-4 py-2 bg-[#c5a880] text-[#0a0a0a] text-xs font-mono font-semibold uppercase rounded cursor-pointer"
              >
                Fetch Live Articles in AI Search Engine
              </button>
            )}
          </div>
        ) : (
          currentDisplayList.map((post) => {
            const isScoreExpanded = !!expandedScores[post.id];
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
                className="bg-[#121212] border border-[#222222] hover:border-[#333333] transition rounded overflow-hidden grid grid-cols-1 lg:grid-cols-12"
              >
                {/* Visual Media & Shoot Gallery Column (5 cols) */}
                <div className="lg:col-span-5 bg-[#0a0a0a] flex flex-col justify-between overflow-hidden border-b lg:border-b-0 lg:border-r border-[#222222]">
                  {/* Active Carousel Preview */}
                  <div className="relative min-h-[360px] flex-1 flex items-center justify-center overflow-hidden">
                    {selectedFrames.length > 0 ? (
                      <img
                        src={selectedFrames[currentSlide] || selectedFrames[0]}
                        alt={post.altText || post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top max-h-[460px]"
                      />
                    ) : (
                      <div className="p-8 text-center text-xs text-[#8e8d8a]">
                        No preview available
                      </div>
                    )}

                    {/* Left / Right Carousel Navigation if multiple frames selected */}
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
                          title="Previous frame"
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
                          title="Next frame"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Top Overlay Badge for Score & Rights */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                      <div className="bg-[#0a0a0a]/85 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626] text-xs font-mono font-semibold text-[#f4f3ef]">
                        SCORE {post.score.overall}/100
                      </div>
                      <div className="bg-[#0a0a0a]/85 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626]">
                        {rightsBadge(post.rightsStatus)}
                      </div>
                    </div>

                    {/* Bottom Carousel Counter & Dots */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                      <span className="bg-[#0a0a0a]/85 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] uppercase font-mono text-[#c5a880] border border-[#c5a880]/40 flex items-center gap-1.5">
                        <Layers className="w-3 h-3" />
                        <span>
                          Frame {currentSlide + 1} of {selectedFrames.length} Selected for Post
                        </span>
                      </span>
                      <span className="bg-[#0a0a0a]/85 px-2 py-1 rounded text-[10px] font-mono text-[#8e8d8a] border border-[#222222]">
                        Shoot Total: {shootGallery.length} Photos
                      </span>
                    </div>
                  </div>

                  {/* COHERENT ARTICLE SHOOT GALLERY: Click to Select Multiple Frames for Single Post */}
                  <div className="p-3.5 bg-[#0e0e0e] border-t border-[#1e1e1e] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono uppercase">
                      <span className="text-[#c5a880] font-semibold">
                        This Article's Shoot Gallery ({shootGallery.length} Photos)
                      </span>
                      <span className="text-[#8e8d8a]">
                        Click photos to include/exclude in this post ({selectedFrames.length} selected)
                      </span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2 max-h-[210px] overflow-y-auto pr-1">
                      {shootGallery.map((imgUrl, idx) => {
                        const orderIndex = selectedFrames.indexOf(imgUrl);
                        const isSelected = orderIndex !== -1;

                        return (
                          <div
                            key={`${imgUrl}-${idx}`}
                            className={`relative aspect-[3/4] rounded overflow-hidden border transition ${
                              isSelected
                                ? 'border-[#c5a880] ring-2 ring-[#c5a880]/40 opacity-100'
                                : 'border-[#262626] opacity-55 hover:opacity-90'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleShootFrame(post, imgUrl)}
                              className="w-full h-full block cursor-pointer"
                              title={
                                isSelected
                                  ? `Selected as Frame #${orderIndex + 1} (click to remove)`
                                  : 'Click to add this photograph to the post Carousel'
                              }
                            >
                              <img
                                src={imgUrl}
                                alt={`Shoot frame ${idx + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover object-top"
                              />
                            </button>

                            {/* Order Badge */}
                            <span
                              className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase pointer-events-none ${
                                orderIndex === 0
                                  ? 'bg-[#c5a880] text-[#0a0a0a] font-bold'
                                  : isSelected
                                  ? 'bg-[#a3e635] text-[#0a0a0a] font-bold'
                                  : 'bg-[#0a0a0a]/80 text-[#a1a1aa]'
                              }`}
                            >
                              {orderIndex === 0
                                ? '1. Cover'
                                : isSelected
                                ? `${orderIndex + 1}. Frame`
                                : `+ Select`}
                            </span>

                            {/* Quick "Make Cover" button if selected but not #1 */}
                            {isSelected && orderIndex > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMakeCover(post, imgUrl);
                                }}
                                className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-[#0a0a0a]/90 border border-[#c5a880]/50 text-[8px] font-mono text-[#c5a880] hover:bg-[#c5a880] hover:text-[#0a0a0a] cursor-pointer"
                                title="Set as #1 Cover Photo"
                              >
                                Make #1
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Editorial Metadata & Actions Column (7 cols) */}
                <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between space-y-6">
                  <div>
                    {/* Publication, Real Source Link & Status Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#8e8d8a] font-mono">
                        <span className="text-[#c5a880] uppercase tracking-wider font-semibold">
                          {post.publication}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{post.publicationDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="uppercase px-2 py-0.5 rounded bg-[#1a1a1a] text-[#f4f3ef]">
                          {post.status === 'selected' ? 'In Approval Queue' : post.status}
                        </span>
                      </div>

                      {post.sourceUrl && (
                        <a
                          href={post.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#181818] hover:bg-[#222222] border border-[#2e2e2e] hover:border-[#c5a880] text-xs font-mono text-[#c5a880] transition"
                          title="Open real original article in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Verify Original Article ({post.publication})</span>
                        </a>
                      )}
                    </div>

                    {/* Editorial Title */}
                    <h2 className="font-editorial text-2xl lg:text-3xl text-[#f4f3ef] font-normal tracking-tight mb-2">
                      {post.title}
                    </h2>

                    {/* Real Clickable URL Line */}
                    {post.sourceUrl && (
                      <div className="mb-3 text-[11px] font-mono text-[#8e8d8a] truncate">
                        <span className="text-[#71717a]">Source URL: </span>
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

                    {/* Author / Photographer Credits */}
                    <div className="text-xs text-[#a1a1aa] space-y-1 mb-4 font-sans">
                      <p>
                        <span className="text-[#71717a] uppercase tracking-wider text-[10px]">
                          Author / Photographer:{' '}
                        </span>
                        <span className="text-[#f4f3ef] font-medium">{post.photographer}</span>
                      </p>
                    </div>

                    {/* Article Excerpt / Creative Direction */}
                    <div className="p-3.5 bg-[#181818] rounded border border-[#262626] text-xs text-[#d4d4d8] leading-relaxed mb-4">
                      <span className="text-[10px] uppercase tracking-wider text-[#8e8d8a] block font-mono mb-1">
                        Original Article Summary & Shoot Context
                      </span>
                      {post.creativeDirection}
                    </div>

                    {/* Detailed Scoring Expandable Box */}
                    <div className="border border-[#222222] rounded overflow-hidden mb-4">
                      <button
                        onClick={() => toggleScoreExpand(post.id)}
                        className="w-full px-3.5 py-2.5 bg-[#161616] flex items-center justify-between text-xs text-[#a1a1aa] hover:text-[#f4f3ef] transition cursor-pointer"
                      >
                        <span className="font-mono text-[11px] uppercase tracking-wider">
                          Evaluation Breakdown ({post.score.overall}/100)
                        </span>
                        {isScoreExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[#8e8d8a]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#8e8d8a]" />
                        )}
                      </button>

                      {isScoreExpanded && (
                        <div className="p-4 bg-[#141414] border-t border-[#222222] text-xs space-y-3 font-mono">
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                            <div className="p-2 bg-[#1c1c1c] rounded">
                              <span className="block text-[10px] text-[#71717a]">Composition</span>
                              <span className="text-sm font-semibold text-[#f4f3ef]">{post.score.composition}</span>
                            </div>
                            <div className="p-2 bg-[#1c1c1c] rounded">
                              <span className="block text-[10px] text-[#71717a]">Lighting</span>
                              <span className="text-sm font-semibold text-[#f4f3ef]">{post.score.lighting}</span>
                            </div>
                            <div className="p-2 bg-[#1c1c1c] rounded">
                              <span className="block text-[10px] text-[#71717a]">Styling</span>
                              <span className="text-sm font-semibold text-[#f4f3ef]">{post.score.styling}</span>
                            </div>
                            <div className="p-2 bg-[#1c1c1c] rounded">
                              <span className="block text-[10px] text-[#71717a]">Relevance</span>
                              <span className="text-sm font-semibold text-[#f4f3ef]">{post.score.culturalRelevance}</span>
                            </div>
                            <div className="p-2 bg-[#1c1c1c] rounded">
                              <span className="block text-[10px] text-[#71717a]">Narrative</span>
                              <span className="text-sm font-semibold text-[#f4f3ef]">{post.score.narrative}</span>
                            </div>
                          </div>
                          <p className="text-xs text-[#8e8d8a] font-sans pt-1 italic">
                            "{post.score.rationale}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Instagram Caption Preview */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-[#71717a] font-mono">
                        <span>Prepared Instagram Caption</span>
                        <button
                          onClick={() => onOpenCaptionEditor(post)}
                          className="text-[#c5a880] hover:text-[#e4d4c0] flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit Caption</span>
                        </button>
                      </div>
                      <div className="p-3 bg-[#0a0a0a] rounded border border-[#1e1e1e] text-xs text-[#a1a1aa] font-mono whitespace-pre-line line-clamp-3">
                        {post.caption}
                      </div>
                    </div>
                  </div>

                  {/* Pipeline Actions Bar: Send Selected Frames to Approval Queue -> Approve -> Post Packages */}
                  <div className="pt-4 border-t border-[#222222] space-y-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Primary Step 1: Send Selected Carousel Frames to Approval Queue */}
                      <button
                        onClick={() =>
                          onAction(post.id, 'send_to_queue', {
                            imageUrls: selectedFrames,
                          })
                        }
                        disabled={isProcessingAction}
                        className="px-4 py-2.5 bg-[#c5a880] hover:bg-[#d4b992] text-[#0a0a0a] text-xs font-mono font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-2 shadow"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>
                          {post.status === 'selected'
                            ? `Update in Approval Queue (${selectedFrames.length} Frames)`
                            : `Send to Approval Queue (${selectedFrames.length} Frames)`}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      {/* Direct Approve & Send to Post Packages */}
                      <button
                        onClick={() =>
                          onAction(post.id, 'approve', {
                            imageUrls: selectedFrames,
                          })
                        }
                        disabled={isProcessingAction}
                        className="px-4 py-2.5 bg-[#f4f3ef] text-[#0a0a0a] text-xs font-mono font-semibold uppercase tracking-wider rounded hover:bg-white transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve & Send to Post Packages</span>
                      </button>

                      <button
                        onClick={() => onAction(post.id, 'save')}
                        disabled={isProcessingAction}
                        className="p-2 bg-[#161616] border border-[#262626] hover:text-[#f4f3ef] text-[#8e8d8a] rounded transition cursor-pointer"
                        title="Save for Later"
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onAction(post.id, 'reject')}
                        disabled={isProcessingAction}
                        className="p-2 bg-[#161616] border border-[#262626] hover:text-[#ef4444] text-[#8e8d8a] rounded transition cursor-pointer"
                        title="Reject Selection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
