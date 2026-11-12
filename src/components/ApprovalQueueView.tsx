import React, { useState } from 'react';
import { AiAgentConfig, EditorialPost } from '../types/editorial';
import { 
  Check, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  Send, 
  CheckSquare, 
  Square,
  Edit3,
  Bot,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { computeContentHash, needsReapproval } from '../lib/publishingRules';

interface ApprovalQueueViewProps {
  posts: EditorialPost[];
  aiConfig?: AiAgentConfig;
  onAction: (postId: string, action: string, payload?: any) => Promise<void>;
  onBulkAction: (postIds: string[], action: 'approve' | 'reject') => Promise<void>;
  onAuditAll?: (autoApprove?: boolean) => Promise<void>;
  onOpenCaptionEditor: (post: EditorialPost) => void;
  isProcessingAction?: boolean;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  posts,
  aiConfig,
  onAction,
  onBulkAction,
  onAuditAll,
  onOpenCaptionEditor,
  isProcessingAction,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter posts that are selected, approved, or scheduled
  const queuePosts = posts.filter(
    (p) => p.status === 'selected' || p.status === 'approved' || p.status === 'scheduled'
  );

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === queuePosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(queuePosts.map((p) => p.id)));
    }
  };

  const handleBulk = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) return;
    await onBulkAction(Array.from(selectedIds), action);
    setSelectedIds(new Set());
  };

  const threshold = aiConfig?.minApprovalScore || 89;

  return (
    <div className="space-y-8 w-full max-w-full overflow-hidden">
      {/* Header and Bulk Control Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Stage 2 · Editorial Review Queue</span>
            <span>·</span>
            <span>Agent 2 Auditor & Sign-Off Desk</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Approval Queue & AI Quality Audit
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Review candidates selected from Daily Selection or AI Search Engine. Agent 2 evaluates quality against your threshold while leaving full publishing and approval unlocked regardless of rights status.
          </p>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={toggleSelectAll}
            className="px-3.5 py-2 bg-[#161616] border border-[#262626] text-xs uppercase tracking-wider text-[#a1a1aa] hover:text-[#f4f3ef] rounded transition cursor-pointer flex items-center gap-2 font-medium"
          >
            {selectedIds.size === queuePosts.length && queuePosts.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-[#c5a880]" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>Select All ({queuePosts.length})</span>
          </button>

          <button
            onClick={() => handleBulk('approve')}
            disabled={selectedIds.size === 0 || isProcessingAction}
            className="px-4 py-2 bg-[#f4f3ef] text-[#0a0a0a] disabled:opacity-40 text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Bulk Approve ({selectedIds.size})</span>
          </button>

          <button
            onClick={() => handleBulk('reject')}
            disabled={selectedIds.size === 0 || isProcessingAction}
            className="px-3.5 py-2 bg-[#1e1414] border border-[#3b1f1f] text-[#ef4444] disabled:opacity-40 text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reject ({selectedIds.size})</span>
          </button>
        </div>
      </div>

      {/* AGENT 2 AUDITOR CONTROL BAR */}
      {onAuditAll && (
        <div className="p-4 sm:p-5 bg-[#141311] border border-[#c5a880]/30 rounded flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded bg-[#1e1c18] border border-[#c5a880]/40 text-[#c5a880] shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#f4f3ef]">
                <span>Agent 2 · Chief Curator & Quality Auditor AI</span>
                <span>·</span>
                <span className="text-[#c5a880]">Threshold: ≥{threshold}/100</span>
              </div>
              <p className="text-xs text-[#8e8d8a] mt-0.5 font-sans">
                Run Agent 2 across all pending candidates to generate critical curatorial verdicts, or let Agent 2 automatically approve all candidates scoring ≥{threshold}/100.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onAuditAll(false)}
              disabled={isProcessingAction}
              className="px-3.5 py-2 bg-[#1c1c1c] hover:bg-[#242424] border border-[#333333] rounded text-xs font-mono text-[#f4f3ef] transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#c5a880] ${isProcessingAction ? 'animate-spin' : ''}`} />
              <span>Run Agent 2 Audit Only</span>
            </button>
            <button
              type="button"
              onClick={() => onAuditAll(true)}
              disabled={isProcessingAction}
              className="px-4 py-2 bg-[#c5a880] hover:bg-[#d4b992] text-[#0a0a0a] rounded text-xs font-mono font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Audit & Auto-Approve (≥{threshold})</span>
            </button>
          </div>
        </div>
      )}

      {/* Visual Editorial Gallery */}
      {queuePosts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#222222] rounded bg-[#121212]">
          <p className="text-sm text-[#8e8d8a]">No pending posts awaiting editorial approval.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {queuePosts.map((post) => {
            const isSelected = selectedIds.has(post.id);
            const isApproved = post.status === 'approved' || post.status === 'scheduled';
            const currentHash = computeContentHash(post);
            const hasMaterialChange = isApproved && post.approvalRecord?.contentHash 
              ? needsReapproval(post.approvalRecord.contentHash, currentHash) 
              : false;
            const passesThreshold = post.score.overall >= threshold;

            return (
              <article
                key={post.id}
                className={`bg-[#121212] border rounded overflow-hidden flex flex-col justify-between transition ${
                  isSelected ? 'border-[#c5a880] ring-1 ring-[#c5a880]' : 'border-[#222222] hover:border-[#333333]'
                }`}
              >
                {/* Media Preview & Checkbox */}
                <div className="relative aspect-[3/4] bg-[#0a0a0a] overflow-hidden">
                  {post.imageUrls && post.imageUrls[0] ? (
                    <img
                      src={post.imageUrls[0]}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#71717a]">
                      No Image Preview
                    </div>
                  )}

                  {/* Select Checkbox Overlay */}
                  <button
                    onClick={() => toggleSelect(post.id)}
                    className="absolute top-3 left-3 bg-[#0a0a0a]/80 backdrop-blur-md p-1.5 rounded border border-[#333333] text-[#f4f3ef] cursor-pointer hover:bg-[#1a1a1a]"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#c5a880]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#a1a1aa]" />
                    )}
                  </button>

                  {/* Score & Status Overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <div className="bg-[#0a0a0a]/85 backdrop-blur-md px-2 py-1 rounded border border-[#262626] text-[11px] font-mono text-[#c5a880] font-semibold">
                      {post.score.overall}/100
                    </div>
                    <div className="bg-[#0a0a0a]/85 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626] text-[11px] font-mono uppercase tracking-wider text-[#f4f3ef]">
                      {post.status}
                    </div>
                  </div>

                  {/* Warning: Material Change Detected */}
                  {hasMaterialChange && (
                    <div className="absolute bottom-3 left-3 right-3 bg-[#450a0a]/90 backdrop-blur-md border border-[#7f1d1d] px-3 py-1.5 rounded flex items-center gap-2 text-xs text-[#fca5a5]">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
                      <span className="text-[11px] font-sans">
                        Content altered post-approval. Renewed sign-off recommended.
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#8e8d8a] mb-1">
                      <span className="text-[#c5a880]">{post.publication}</span>
                      <span>·</span>
                      <span>{post.publicationDate}</span>
                    </div>
                    <h3 className="font-editorial text-xl text-[#f4f3ef] font-normal leading-snug mb-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-[#a1a1aa] font-sans line-clamp-1">
                      <span className="text-[#71717a]">Photo:</span> {post.photographer}
                    </p>

                    {/* Agent 2 Audit Report Box */}
                    <div className="mt-3 p-2.5 bg-[#161513] rounded border border-[#2a2620] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                        <span className="text-[#c5a880] flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          Agent 2 Verdict
                        </span>
                        <span className={passesThreshold ? 'text-[#a3e635]' : 'text-[#facc15]'}>
                          {post.aiAuditReport?.verdict === 'approved_by_ai'
                            ? 'AI AUTO-APPROVED'
                            : passesThreshold
                            ? 'RECOMMENDED'
                            : 'REVIEW SUGGESTED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#d4d4d8] font-sans line-clamp-2 leading-relaxed">
                        {post.aiAuditReport?.auditorNotes || post.score.rationale}
                      </p>
                    </div>

                    {/* Rights Status Record (Informational Only) */}
                    <div className="mt-2.5 py-1.5 px-2.5 bg-[#181818] rounded border border-[#222222] text-[11px] font-mono flex items-center justify-between text-[#8e8d8a]">
                      <span>Rights Advisory:</span>
                      <span className={post.rightsStatus === 'verified' ? 'text-[#a3e635]' : 'text-[#c5a880]'}>
                        {post.rightsStatus.toUpperCase()} (UNLOCKED)
                      </span>
                    </div>

                    {/* Version & Sign-off Tracking Record */}
                    {post.approvalRecord && (
                      <div className="mt-2 text-[10px] font-mono text-[#71717a] space-y-0.5">
                        <div>Approved by: {post.approvalRecord.approvedBy}</div>
                        <div>Timestamp: {new Date(post.approvalRecord.approvedAt).toLocaleString('en-GB')}</div>
                        <div>Target Slot: {post.approvalRecord.scheduledFor || 'Pending slot'}</div>
                        <div>Version: v{post.approvalRecord.version}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[#222222] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenCaptionEditor(post)}
                        className="px-2.5 py-1.5 text-xs text-[#8e8d8a] hover:text-[#f4f3ef] bg-[#181818] border border-[#262626] rounded transition cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => onAction(post.id, 'publish_now')}
                        disabled={isProcessingAction}
                        className="px-2.5 py-1.5 text-xs text-[#f4f3ef] hover:border-[#c5a880] bg-[#181818] border border-[#262626] rounded transition cursor-pointer flex items-center gap-1"
                        title="Publish Immediately to Instagram"
                      >
                        <Send className="w-3 h-3 text-[#c5a880]" />
                        <span>Publish</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onAction(post.id, 'reject')}
                        disabled={isProcessingAction}
                        className="p-1.5 text-xs text-[#8e8d8a] hover:text-[#ef4444] bg-[#181818] border border-[#262626] rounded transition cursor-pointer"
                        title="Reject Post"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onAction(post.id, 'approve')}
                        disabled={isProcessingAction}
                        className="px-3.5 py-1.5 bg-[#f4f3ef] text-[#0a0a0a] hover:bg-white text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{isApproved && !hasMaterialChange ? 'Re-Approve' : 'Approve'}</span>
                      </button>
                    </div>
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
