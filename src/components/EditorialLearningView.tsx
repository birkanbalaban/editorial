import React from 'react';
import { EditorialLearningSignal, EditorialPost } from '../types/editorial';
import { computeLearningProfile, calculatePostLearningDelta } from '../lib/scoring';
import {
  Sparkles,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Trash2,
  RotateCcw,
  ExternalLink,
  Cpu,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface EditorialLearningViewProps {
  signals: EditorialLearningSignal[];
  posts?: EditorialPost[];
  onNavigateToAnalytics?: () => void;
  onDeleteSignal?: (signalId: string) => void;
  onClearSignals?: () => void;
  onPostAction?: (postId: string, action: string, payload?: any) => void;
  isProcessing?: boolean;
}

export const EditorialLearningView: React.FC<EditorialLearningViewProps> = ({
  signals,
  posts = [],
  onNavigateToAnalytics,
  onDeleteSignal,
  onClearSignals,
  onPostAction,
  isProcessing = false,
}) => {
  const profile = computeLearningProfile(signals);
  const approvedCount = signals.filter((s) => s.action === 'approved').length;
  const savedCount = signals.filter((s) => s.action === 'saved').length;
  const rejectedCount = signals.filter((s) => s.action === 'rejected').length;

  const sortedPhotographers = Object.entries(profile.photographerWeights).sort(
    (a, b) => b[1] - a[1]
  );
  const sortedPublications = Object.entries(profile.publicationWeights).sort(
    (a, b) => b[1] - a[1]
  );
  const sortedTags = Object.entries(profile.tagWeights).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Active Curatorial Feedback Loop</span>
            <span>·</span>
            <span>Real-Time Ranking & AI Agent Weights</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Editorial Learning System
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Every approval, queue promotion, save, or rejection dynamically updates photographer, magazine, and aesthetic weights. These weights directly alter Daily Selection ranking, Agent 1 discovery filtering, and Agent 2 scoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {signals.length > 0 && onClearSignals && (
            <button
              onClick={onClearSignals}
              disabled={isProcessing}
              className="px-3.5 py-2 bg-[#1a1313] border border-[#3d2222] hover:border-[#ef4444] text-xs font-mono uppercase tracking-wider text-[#f87171] rounded transition cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Learning Weights</span>
            </button>
          )}
          {onNavigateToAnalytics && (
            <button
              onClick={onNavigateToAnalytics}
              className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] hover:border-[#c5a880] text-xs font-mono uppercase tracking-wider text-[#f4f3ef] rounded transition cursor-pointer flex items-center gap-2 font-medium"
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#c5a880]" />
              <span>Engagement Analytics</span>
            </button>
          )}
        </div>
      </div>

      {/* Signal Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 bg-[#121212] border border-[#222222] rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#71717a] block">
              Approved & Queued Signals (+Boost)
            </span>
            <span className="text-2xl font-bold font-mono text-[#f4f3ef] tabular-nums">
              {approvedCount}
            </span>
            <span className="text-[11px] font-mono text-[#a3e635] block mt-0.5">
              +6 pts Photographer · +4 pts Magazine
            </span>
          </div>
          <ThumbsUp className="w-5 h-5 text-[#a3e635]" />
        </div>

        <div className="p-5 bg-[#121212] border border-[#222222] rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#71717a] block">
              Saved Archival Works (+Boost)
            </span>
            <span className="text-2xl font-bold font-mono text-[#f4f3ef] tabular-nums">
              {savedCount}
            </span>
            <span className="text-[11px] font-mono text-[#c5a880] block mt-0.5">
              +4 pts Photographer · +2 pts Magazine
            </span>
          </div>
          <Bookmark className="w-5 h-5 text-[#c5a880]" />
        </div>

        <div className="p-5 bg-[#121212] border border-[#222222] rounded flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-[#71717a] block">
              Rejected Discoveries (-Penalty)
            </span>
            <span className="text-2xl font-bold font-mono text-[#f4f3ef] tabular-nums">
              {rejectedCount}
            </span>
            <span className="text-[11px] font-mono text-[#ef4444] block mt-0.5">
              -7 pts Photographer · -4 pts Magazine
            </span>
          </div>
          <ThumbsDown className="w-5 h-5 text-[#ef4444]" />
        </div>
      </div>

      {/* Active AI Agent Directive Preview */}
      <div className="p-5 bg-[#121212] border border-[#262626] rounded space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#c5a880]">
            <Cpu className="w-4 h-4 text-[#c5a880]" />
            <span>Live Agent 1 (Discovery) & Agent 2 (Auditor) Prompt Directive</span>
          </div>
          <span className="text-[11px] font-mono text-[#a3e635] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Active in Scoring & Discovery
          </span>
        </div>
        <div className="p-3.5 bg-[#0d0d0d] border border-[#1f1f1f] rounded font-mono text-xs text-[#d4d4d8] leading-relaxed">
          {profile.promptDirectiveSummary}
        </div>
      </div>

      {/* 3-Column Active Weights Matrix: Photographers, Publications, Aesthetic Tags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Photographer Weights */}
        <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-3">
            <div>
              <h2 className="font-editorial text-lg text-[#f4f3ef]">Photographer Weights</h2>
              <p className="text-[11px] text-[#8e8d8a] font-mono">Direct score delta on matching shoots</p>
            </div>
            <Sliders className="w-4 h-4 text-[#c5a880]" />
          </div>
          <div className="space-y-2">
            {sortedPhotographers.length > 0 ? (
              sortedPhotographers.map(([name, weight]) => (
                <div
                  key={name}
                  className="px-3 py-2 bg-[#181818] border border-[#262626] rounded flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-[#f4f3ef] truncate pr-2">{name}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold tabular-nums ${
                      weight > 0
                        ? 'bg-[#182618] text-[#a3e635] border border-[#224022]'
                        : weight < 0
                        ? 'bg-[#291717] text-[#ef4444] border border-[#4d2222]'
                        : 'bg-[#222222] text-[#8e8d8a]'
                    }`}
                  >
                    {weight > 0 ? `+${weight} pts` : `${weight} pts`}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs font-mono text-[#71717a] py-4">
                Approve, save, or reject any editorial shoot below to train photographer weights.
              </div>
            )}
          </div>
        </div>

        {/* Publication Weights */}
        <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-3">
            <div>
              <h2 className="font-editorial text-lg text-[#f4f3ef]">Magazine Source Weights</h2>
              <p className="text-[11px] text-[#8e8d8a] font-mono">Publication authority adjustments</p>
            </div>
            <Sparkles className="w-4 h-4 text-[#c5a880]" />
          </div>
          <div className="space-y-2">
            {sortedPublications.length > 0 ? (
              sortedPublications.map(([pub, weight]) => (
                <div
                  key={pub}
                  className="px-3 py-2 bg-[#181818] border border-[#262626] rounded flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-[#f4f3ef] truncate pr-2">{pub}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold tabular-nums ${
                      weight > 0
                        ? 'bg-[#182618] text-[#a3e635] border border-[#224022]'
                        : weight < 0
                        ? 'bg-[#291717] text-[#ef4444] border border-[#4d2222]'
                        : 'bg-[#222222] text-[#8e8d8a]'
                    }`}
                  >
                    {weight > 0 ? `+${weight} pts` : `${weight} pts`}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs font-mono text-[#71717a] py-4">
                No publication preference deltas recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Aesthetic Tag Weights */}
        <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-4">
          <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-3">
            <div>
              <h2 className="font-editorial text-lg text-[#f4f3ef]">Aesthetic Vector Weights</h2>
              <p className="text-[11px] text-[#8e8d8a] font-mono">Visual traits & hashtag affinities</p>
            </div>
            <Sparkles className="w-4 h-4 text-[#c5a880]" />
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedTags.length > 0 ? (
              sortedTags.map(([tag, weight]) => (
                <div
                  key={tag}
                  className="px-3 py-1.5 bg-[#181818] border border-[#262626] rounded text-xs font-mono text-[#d4d4d8] flex items-center gap-2"
                >
                  <span>{tag}</span>
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      weight > 0 ? 'text-[#a3e635]' : weight < 0 ? 'text-[#ef4444]' : 'text-[#8e8d8a]'
                    }`}
                  >
                    {weight > 0 ? `+${weight}` : weight}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs font-mono text-[#71717a] py-4">
                Aesthetic tag vectors populate automatically when you curate works.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Ranking Impact on Current Archive Works */}
      {posts.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs uppercase tracking-widest text-[#c5a880] font-mono">
                Live Curatorial Ranking Impact & Signal Trainer
              </h2>
              <p className="text-xs text-[#8e8d8a] font-sans mt-0.5">
                See how active learning signals modify each real shoot's effective score in real time, or trigger a curatorial signal directly.
              </p>
            </div>
            <span className="text-xs font-mono text-[#71717a]">
              {posts.length} Active Editorial Shoots
            </span>
          </div>

          <div className="bg-[#121212] border border-[#222222] rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#181818] border-b border-[#222222] text-[#8e8d8a] uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Editorial Monograph</th>
                    <th className="py-3 px-4">Photographer · Magazine</th>
                    <th className="py-3 px-4 text-right">Base Score</th>
                    <th className="py-3 px-4 text-right">Learning Delta</th>
                    <th className="py-3 px-4 text-right">Effective Score</th>
                    {onPostAction && <th className="py-3 px-4 text-right">Record Signal</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e1e]">
                  {posts.slice(0, 8).map((post) => {
                    const { delta, matchedReasons } = calculatePostLearningDelta(post, signals);
                    const effectiveScore = Math.max(0, Math.min(100, post.score.overall + delta));
                    return (
                      <tr key={post.id} className="hover:bg-[#161616] transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {post.imageUrls?.[0] && (
                              <img
                                src={post.imageUrls[0]}
                                alt={post.title}
                                className="w-9 h-11 object-cover rounded border border-[#262626] shrink-0"
                              />
                            )}
                            <div>
                              <div className="text-[#f4f3ef] font-sans font-medium line-clamp-1">
                                {post.title}
                              </div>
                              {matchedReasons.length > 0 && (
                                <div className="text-[10px] text-[#8e8d8a] line-clamp-1 mt-0.5">
                                  {matchedReasons.join(' · ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[#c5a880]">{post.photographer}</span>
                          <span className="text-[#71717a] mx-1.5">·</span>
                          <span className="text-[#8e8d8a]">{post.publication}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-[#8e8d8a] tabular-nums">
                          {post.score.overall}/100
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              delta > 0
                                ? 'bg-[#182618] text-[#a3e635]'
                                : delta < 0
                                ? 'bg-[#291717] text-[#ef4444]'
                                : 'text-[#71717a]'
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta} pts
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-[#f4f3ef] tabular-nums">
                          {effectiveScore}/100
                        </td>
                        {onPostAction && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => onPostAction(post.id, 'approve')}
                                disabled={isProcessing}
                                title="Approve (+Boost photographer & publication)"
                                className="px-2 py-1 bg-[#182618] hover:bg-[#223822] text-[#a3e635] border border-[#224022] rounded text-[10px] uppercase cursor-pointer transition"
                              >
                                +Approve
                              </button>
                              <button
                                onClick={() => onPostAction(post.id, 'save')}
                                disabled={isProcessing}
                                title="Save (+Boost aesthetic & photographer)"
                                className="px-2 py-1 bg-[#262217] hover:bg-[#362f1f] text-[#c5a880] border border-[#42371e] rounded text-[10px] uppercase cursor-pointer transition"
                              >
                                +Save
                              </button>
                              <button
                                onClick={() => onPostAction(post.id, 'reject')}
                                disabled={isProcessing}
                                title="Reject (-Penalty photographer & publication)"
                                className="px-2 py-1 bg-[#291717] hover:bg-[#3b1f1f] text-[#ef4444] border border-[#4d2222] rounded text-[10px] uppercase cursor-pointer transition"
                              >
                                -Reject
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Signal History Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
            Verified Curatorial Learning Signal Log ({signals.length})
          </h2>
          <span className="text-[11px] font-mono text-[#8e8d8a]">
            Real-time persistence in editorial database
          </span>
        </div>

        <div className="bg-[#121212] border border-[#222222] rounded divide-y divide-[#1e1e1e] overflow-hidden">
          {signals.length > 0 ? (
            signals.map((sig) => (
              <div
                key={sig.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono hover:bg-[#161616] transition"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                      sig.action === 'approved'
                        ? 'bg-[#182618] text-[#a3e635] border border-[#224022]'
                        : sig.action === 'rejected'
                        ? 'bg-[#291717] text-[#ef4444] border border-[#4d2222]'
                        : 'bg-[#262217] text-[#c5a880] border border-[#42371e]'
                    }`}
                  >
                    {sig.action}
                  </span>
                  {typeof sig.scoreDelta === 'number' && (
                    <span
                      className={`text-[11px] font-bold tabular-nums ${
                        sig.scoreDelta > 0 ? 'text-[#a3e635]' : 'text-[#ef4444]'
                      }`}
                    >
                      ({sig.scoreDelta > 0 ? `+${sig.scoreDelta}` : sig.scoreDelta} pts)
                    </span>
                  )}
                  <span className="text-[#f4f3ef] font-semibold">{sig.photographer}</span>
                  <span className="text-[#71717a]">·</span>
                  <span className="text-[#c5a880]">{sig.publication}</span>
                  {sig.postTitle && (
                    <>
                      <span className="text-[#71717a]">·</span>
                      <span className="text-[#d4d4d8] font-sans">{sig.postTitle}</span>
                    </>
                  )}
                  {sig.sourceUrl && (
                    <a
                      href={sig.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] text-[#c5a880] hover:underline"
                    >
                      <span>Source</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[#71717a] text-[11px] tabular-nums">
                    {new Date(sig.timestamp).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {onDeleteSignal && (
                    <button
                      onClick={() => onDeleteSignal(sig.id)}
                      title="Remove learning signal"
                      className="p-1.5 text-[#71717a] hover:text-[#ef4444] rounded hover:bg-[#1f1f1f] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center space-y-2">
              <div className="text-sm font-editorial text-[#f4f3ef]">
                No Curatorial Signals Recorded Yet
              </div>
              <p className="text-xs text-[#8e8d8a] max-w-md mx-auto">
                All legacy mock signals have been purged. Approve, send to queue, save, or reject any real fashion editorial above or in Daily Selection / AI Search to train your active learning profile.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
