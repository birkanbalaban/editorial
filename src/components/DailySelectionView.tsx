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
  Clock
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
  const [scheduleTimeInput, setScheduleTimeInput] = useState<Record<string, string>>({});

  const toggleScoreExpand = (id: string) => {
    setExpandedScores(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentDisplayList = activeTab === 'top5' ? top5Posts : candidates;

  const rightsBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#a3e635] font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Rights
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#facc15] font-medium">
            <Clock className="w-3.5 h-3.5" />
            Rights Pending (Advisory)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-[#c5a880] font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            Reference Rights (Advisory)
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Editorial Status & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Archive Index · Vol. XXIV</span>
            <span>·</span>
            <span>2026 Daily Curation</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Daily Editorial Selection
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Autonomous daily discovery filtered from 20 high-fashion editorial candidates. Top 5 selected based on composition, lighting chiaroscuro, and cultural relevance.
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

      {/* Curation Sub-Metrics & Segmented Filter Bar */}
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

        {/* Clean unboxed stats */}
        <div className="flex items-center gap-3 text-xs text-[#8e8d8a] font-mono">
          <span>20 Discovered</span>
          <span aria-hidden="true">·</span>
          <span>5 Top Ranked</span>
          <span aria-hidden="true">·</span>
          <span className="text-[#f4f3ef]">{top5Posts.filter(p => p.rightsStatus === 'verified').length} Rights-Cleared</span>
          <span aria-hidden="true">·</span>
          <span>Max 2 Posts/Day</span>
        </div>
      </div>

      {/* Editorial Selection Cards Grid */}
      <div className="grid grid-cols-1 gap-8">
        {currentDisplayList.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-[#222222] rounded bg-[#121212]">
            <p className="text-sm text-[#8e8d8a] font-sans">No editorial selections found in this category.</p>
          </div>
        ) : (
          currentDisplayList.map((post) => {
            const isScoreExpanded = !!expandedScores[post.id];
            const isVerified = post.rightsStatus === 'verified';
            const scheduledVal = scheduleTimeInput[post.id] || '14:00';

            return (
              <article
                key={post.id}
                className="bg-[#121212] border border-[#222222] hover:border-[#333333] transition rounded overflow-hidden grid grid-cols-1 lg:grid-cols-12"
              >
                {/* Visual Media Column (5 cols) */}
                <div className="lg:col-span-5 relative bg-[#0a0a0a] min-h-[380px] flex items-center justify-center overflow-hidden border-b lg:border-b-0 lg:border-r border-[#222222]">
                  {post.imageUrls && post.imageUrls.length > 0 ? (
                    <img
                      src={post.imageUrls[0]}
                      alt={post.altText || post.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top max-h-[540px]"
                    />
                  ) : (
                    <div className="p-8 text-center text-xs text-[#8e8d8a]">
                      No authorized visual preview available
                    </div>
                  )}

                  {/* Top Overlay Badge for Score & Rights */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                    <div className="bg-[#0a0a0a]/80 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626] text-xs font-mono font-semibold text-[#f4f3ef]">
                      SCORE {post.score.overall}/100
                    </div>
                    <div className="bg-[#0a0a0a]/80 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626]">
                      {rightsBadge(post.rightsStatus)}
                    </div>
                  </div>

                  {/* Aspect Ratio Framing Indicator */}
                  <div className="absolute bottom-3 left-3 bg-[#0a0a0a]/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] uppercase font-mono text-[#8e8d8a] border border-[#222222]">
                    Ratio: {post.aspectRatio}
                  </div>
                </div>

                {/* Editorial Metadata & Actions Column (7 cols) */}
                <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between space-y-6">
                  <div>
                    {/* Publication & Date Header */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#8e8d8a] font-mono mb-2">
                      <span className="text-[#c5a880] uppercase tracking-wider">{post.publication}</span>
                      <span aria-hidden="true">·</span>
                      {post.brand && (
                        <>
                          <span className="text-[#d4d4d8]">{post.brand}</span>
                          <span aria-hidden="true">·</span>
                        </>
                      )}
                      <span>{post.publicationDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase">{post.status}</span>
                    </div>

                    {/* Editorial Title */}
                    <h2 className="font-editorial text-2xl lg:text-3xl text-[#f4f3ef] font-normal tracking-tight mb-3">
                      {post.title}
                    </h2>

                    {/* Creative Team Credits */}
                    <div className="text-xs text-[#a1a1aa] space-y-1 mb-4 font-sans">
                      <p>
                        <span className="text-[#71717a] uppercase tracking-wider text-[10px]">Photographer: </span>
                        <span className="text-[#f4f3ef] font-medium">{post.photographer}</span>
                        {post.photographerHandle && (
                          <span className="text-[#8e8d8a] ml-1">({post.photographerHandle})</span>
                        )}
                      </p>
                      {post.credits.stylist && (
                        <p>
                          <span className="text-[#71717a] uppercase tracking-wider text-[10px]">Stylist: </span>
                          <span className="text-[#d4d4d8]">{post.credits.stylist}</span>
                        </p>
                      )}
                    </div>

                    {/* Creative Direction Summary */}
                    <div className="p-3.5 bg-[#181818] rounded border border-[#262626] text-xs text-[#d4d4d8] leading-relaxed mb-4">
                      <span className="text-[10px] uppercase tracking-wider text-[#8e8d8a] block font-mono mb-1">
                        Creative Direction & Aesthetic Analysis
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
                          <span>Edit</span>
                        </button>
                      </div>
                      <div className="p-3 bg-[#0a0a0a] rounded border border-[#1e1e1e] text-xs text-[#a1a1aa] font-mono whitespace-pre-line line-clamp-3">
                        {post.caption}
                      </div>
                    </div>
                  </div>

                  {/* Primary & Secondary Actions Bar */}
                  <div className="pt-4 border-t border-[#222222] space-y-3">
                    {/* Primary Publication Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onAction(post.id, 'schedule', { scheduledTime: scheduledVal })}
                        disabled={isProcessingAction}
                        className="px-4 py-2 bg-[#f4f3ef] text-[#0a0a0a] text-xs font-semibold uppercase tracking-wider rounded hover:bg-white transition cursor-pointer flex items-center gap-1.5 shadow"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Approve & Schedule</span>
                      </button>

                      <button
                        onClick={() => onAction(post.id, 'publish_now')}
                        disabled={isProcessingAction}
                        className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] hover:border-[#f4f3ef] text-[#f4f3ef] text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5 text-[#c5a880]" />
                        <span>Publish Now</span>
                      </button>

                      {!isVerified && (
                        <button
                          onClick={() => onAction(post.id, 'verify_rights')}
                          disabled={isProcessingAction}
                          className="px-3 py-2 bg-[#161616] border border-[#2a2a2a] hover:border-[#a3e635] text-[#a3e635] text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                          title="Optional: Mark rights status as verified"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verify Rights</span>
                        </button>
                      )}

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

                      {post.sourceUrl && (
                        <a
                          href={post.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-[#161616] border border-[#262626] hover:text-[#f4f3ef] text-[#8e8d8a] rounded transition cursor-pointer ml-auto"
                          title="Inspect Editorial Source"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    {/* Schedule Time Slot Quick Selector */}
                    <div className="flex items-center gap-2 text-xs text-[#8e8d8a] font-mono">
                      <span>Schedule Slot:</span>
                      <select
                        value={scheduledVal}
                        onChange={(e) => setScheduleTimeInput({ ...scheduleTimeInput, [post.id]: e.target.value })}
                        className="bg-[#181818] border border-[#262626] text-[#f4f3ef] rounded px-2 py-1 text-xs focus:outline-none"
                      >
                        <option value="14:00">14:00 (Slot 1 · Europe/Istanbul)</option>
                        <option value="20:00">20:00 (Slot 2 · Europe/Istanbul)</option>
                        <option value="Tomorrow 14:00">Tomorrow 14:00</option>
                      </select>
                      <span className="text-[11px] text-[#71717a]">· Europe/Istanbul</span>
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
