import React from 'react';
import { EditorialLearningSignal } from '../types/editorial';
import { Sparkles, TrendingUp, ThumbsUp, ThumbsDown, Bookmark, ShieldCheck } from 'lucide-react';

interface EditorialLearningViewProps {
  signals: EditorialLearningSignal[];
  onNavigateToAnalytics?: () => void;
}

export const EditorialLearningView: React.FC<EditorialLearningViewProps> = ({ 
  signals,
  onNavigateToAnalytics 
}) => {
  const approvedCount = signals.filter(s => s.action === 'approved').length;
  const rejectedCount = signals.filter(s => s.action === 'rejected').length;
  const savedCount = signals.filter(s => s.action === 'saved').length;

  // Aggregate aesthetic preferences
  const tagCounts: Record<string, number> = {};
  signals.forEach(s => {
    if (s.action === 'approved' || s.action === 'saved') {
      s.aestheticTags.forEach(t => {
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    }
  });

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Aesthetic Feedback Heuristics</span>
            <span>·</span>
            <span>Preference Vectors</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Editorial Learning System
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            The curation engine learns from human editorial approvals, rejections, and saves to refine visual candidate discovery. Source facts, copyrights, and verified credits are strictly immutable.
          </p>
        </div>

        {onNavigateToAnalytics && (
          <button
            onClick={onNavigateToAnalytics}
            className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] hover:border-[#c5a880] text-xs font-mono uppercase tracking-wider text-[#f4f3ef] rounded transition cursor-pointer flex items-center gap-2 font-medium shrink-0"
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#c5a880]" />
            <span>Engagement Analytics</span>
          </button>
        )}
      </div>

      {/* Signal Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 bg-[#121212] border border-[#222222] rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#71717a] block">Approved Selections</span>
            <span className="text-2xl font-bold font-mono text-[#f4f3ef]">{approvedCount}</span>
          </div>
          <ThumbsUp className="w-5 h-5 text-[#a3e635]" />
        </div>

        <div className="p-5 bg-[#121212] border border-[#222222] rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#71717a] block">Saved Works</span>
            <span className="text-2xl font-bold font-mono text-[#f4f3ef]">{savedCount}</span>
          </div>
          <Bookmark className="w-5 h-5 text-[#c5a880]" />
        </div>

        <div className="p-5 bg-[#121212] border border-[#222222] rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#71717a] block">Rejected Discoveries</span>
            <span className="text-2xl font-bold font-mono text-[#f4f3ef]">{rejectedCount}</span>
          </div>
          <ThumbsDown className="w-5 h-5 text-[#ef4444]" />
        </div>
      </div>

      {/* Learned Aesthetic Preferences */}
      <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-editorial text-xl text-[#f4f3ef]">Active Aesthetic Preference Weights</h2>
            <p className="text-xs text-[#8e8d8a]">Inferred visual traits weighted higher in candidate scoring algorithms.</p>
          </div>
          <Sparkles className="w-4 h-4 text-[#c5a880]" />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {sortedTags.length > 0 ? (
            sortedTags.map(([tag, count]) => (
              <div
                key={tag}
                className="px-3 py-1.5 bg-[#1a1a1a] border border-[#262626] rounded text-xs font-mono text-[#d4d4d8] flex items-center gap-2"
              >
                <span>{tag}</span>
                <span className="text-[#c5a880] text-[10px] font-bold">+{count * 12}% weight</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-[#71717a]">Awaiting editorial interaction signals.</div>
          )}
        </div>
      </div>

      {/* Signal History Table */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
          Recent Learning Signal Ingestion Log
        </h2>

        <div className="bg-[#121212] border border-[#222222] rounded divide-y divide-[#1e1e1e] overflow-hidden">
          {signals.map((sig) => (
            <div key={sig.id} className="p-4 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                  sig.action === 'approved' 
                    ? 'bg-[#182618] text-[#a3e635] border border-[#224022]' 
                    : sig.action === 'rejected'
                    ? 'bg-[#291717] text-[#ef4444] border border-[#4d2222]'
                    : 'bg-[#262217] text-[#c5a880] border border-[#42371e]'
                }`}>
                  {sig.action}
                </span>
                <span className="text-[#f4f3ef]">{sig.photographer}</span>
                <span className="text-[#71717a]">·</span>
                <span className="text-[#8e8d8a]">{sig.publication}</span>
              </div>

              <span className="text-[#71717a] text-[11px]">
                {new Date(sig.timestamp).toLocaleDateString('en-GB')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
