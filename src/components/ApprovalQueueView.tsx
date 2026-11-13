import React, { useState } from 'react';
import { AiAgentConfig, EditorialPost } from '../types/editorial';
import { 
  Check, 
  X, 
  AlertTriangle, 
  Send, 
  CheckSquare, 
  Square,
  Edit3,
  Bot,
  Sparkles,
  RefreshCw,
  Layers,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { computeContentHash, needsReapproval } from '../lib/publishingRules';
import { useLanguage } from '../i18n/LanguageContext';

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
  const { tx, formatPostStatus } = useLanguage();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeSlideIndex, setActiveSlideIndex] = useState<Record<string, number>>({});

  // Filter posts that are selected (sent to queue), approved, or scheduled
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

  // Toggle shoot photo in/out of the post's Carousel inside Approval Queue
  const handleToggleFrame = async (post: EditorialPost, photoUrl: string) => {
    const current = post.imageUrls || [];
    const exists = current.includes(photoUrl);
    let nextUrls: string[];
    if (exists) {
      if (current.length <= 1) return;
      nextUrls = current.filter((u) => u !== photoUrl);
    } else {
      nextUrls = [...current, photoUrl];
    }
    await onAction(post.id, 'select_images', {
      imageUrls: nextUrls,
      candidateImages: post.candidateImages,
    });
  };

  const handleMakeCover = async (post: EditorialPost, photoUrl: string) => {
    const rest = (post.imageUrls || []).filter((u) => u !== photoUrl);
    setActiveSlideIndex((prev) => ({ ...prev, [post.id]: 0 }));
    await onAction(post.id, 'select_images', {
      imageUrls: [photoUrl, ...rest],
      candidateImages: post.candidateImages,
    });
  };

  const threshold = aiConfig?.minApprovalScore || 89;

  return (
    <div className="space-y-8 w-full max-w-full overflow-hidden">
      {/* Header and Bulk Control Bar */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>{tx('Aşama 2 · Editöryal İnceleme Kuyruğu', 'Stage 2 · Editorial Review Queue')}</span>
            <span>·</span>
            <span>{tx('Çoklu Fotoğraf Carousel İnceleme & Onay', 'Multi-Photo Carousel Review & Sign-Off')}</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            {tx('Onay Kuyruğu & Carousel İmzası', 'Approval Queue & Carousel Sign-Off')}
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            {tx(
              'Günlük Seçim veya AI Arama Motorundan gönderilen çoklu fotoğraf Carousel paketlerini inceleyin. Seçili çekim karelerini aşağıdan doğrulayıp düzenleyin ve Post Paketlerine taşımak için Onayla butonuna tıklayın.',
              'Review the multi-photo Carousel packages sent from Daily Selection or AI Search Engine. Verify or adjust the selected shoot frames below and click Approve to move them to Post Packages.'
            )}
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
            <span>{tx('Tümünü Seç', 'Select All')} ({queuePosts.length})</span>
          </button>

          <button
            onClick={() => handleBulk('approve')}
            disabled={selectedIds.size === 0 || isProcessingAction}
            className="px-4 py-2 bg-[#f4f3ef] text-[#0a0a0a] disabled:opacity-40 text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{tx('Toplu Onayla', 'Bulk Approve')} ({selectedIds.size})</span>
          </button>

          <button
            onClick={() => handleBulk('reject')}
            disabled={selectedIds.size === 0 || isProcessingAction}
            className="px-3.5 py-2 bg-[#1e1414] border border-[#3b1f1f] text-[#ef4444] disabled:opacity-40 text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>{tx('Reddet', 'Reject')} ({selectedIds.size})</span>
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
                <span>{tx('Ajan 2 · Baş Küratör & Kalite Denetçi AI', 'Agent 2 · Chief Curator & Quality Auditor AI')}</span>
                <span>·</span>
                <span className="text-[#c5a880]">{tx('Eşik', 'Threshold')}: ≥{threshold}/100</span>
              </div>
              <p className="text-xs text-[#8e8d8a] mt-0.5 font-sans">
                {tx(
                  `Bekleyen tüm adaylar üzerinde Ajan 2'yi çalıştırarak eleştirel kürasyon kararları üretin veya ≥${threshold}/100 puan alan adayların otomatik onaylanmasını sağlayın.`,
                  `Run Agent 2 across all pending candidates to generate critical curatorial verdicts, or let Agent 2 automatically approve all candidates scoring ≥${threshold}/100.`
                )}
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
              <span>{tx('Yalnızca Ajan 2 Denetimi', 'Run Agent 2 Audit Only')}</span>
            </button>
            <button
              type="button"
              onClick={() => onAuditAll(true)}
              disabled={isProcessingAction}
              className="px-4 py-2 bg-[#c5a880] hover:bg-[#d4b992] text-[#0a0a0a] rounded text-xs font-mono font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{tx(`AI Denetimi & Oto-Onay (≥${threshold})`, `AI Audit & Auto-Approve (≥${threshold})`)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Visual Editorial Gallery */}
      {queuePosts.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#222222] rounded bg-[#121212]">
          <p className="text-sm text-[#8e8d8a]">
            {tx(
              'Onay Kuyruğunda henüz gönderi yok. Günlük Seçim veya AI Arama Motorunda çekim fotoğraflarını seçip "Onay Kuyruğuna Gönder" butonuna tıklayın.',
              'No posts in the Approval Queue yet. Select shoot photographs in Daily Selections or AI Search Engine and click "Send to Approval Queue".'
            )}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {queuePosts.map((post) => {
            const isSelected = selectedIds.has(post.id);
            const isApproved = post.status === 'approved' || post.status === 'scheduled';
            const currentHash = computeContentHash(post);
            const hasMaterialChange = isApproved && post.approvalRecord?.contentHash 
              ? needsReapproval(post.approvalRecord.contentHash, currentHash) 
              : false;
            const passesThreshold = post.score.overall >= threshold;

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
                  isSelected ? 'border-[#c5a880] ring-1 ring-[#c5a880]' : 'border-[#222222] hover:border-[#333333]'
                }`}
              >
                <div>
                  {/* Media Preview & Carousel Slider */}
                  <div className="relative aspect-[4/3] bg-[#0a0a0a] overflow-hidden border-b border-[#222222]">
                    {selectedFrames.length > 0 ? (
                      <img
                        src={selectedFrames[currentSlide] || selectedFrames[0]}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-[#71717a]">
                        {tx('Görsel Önizleme Yok', 'No Image Preview')}
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

                    {/* Select Checkbox Overlay */}
                    <button
                      onClick={() => toggleSelect(post.id)}
                      className="absolute top-3 left-3 bg-[#0a0a0a]/85 backdrop-blur-md p-1.5 rounded border border-[#333333] text-[#f4f3ef] cursor-pointer hover:bg-[#1a1a1a]"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#c5a880]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#a1a1aa]" />
                      )}
                    </button>

                    {/* Score, Carousel Frame Count & Status Overlay */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <div className="bg-[#0a0a0a]/90 backdrop-blur-md px-2 py-1 rounded border border-[#c5a880]/40 text-[11px] font-mono text-[#c5a880] flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        <span>
                          {tx('Kare', 'Frame')} {currentSlide + 1}/{selectedFrames.length}
                        </span>
                      </div>
                      <div className="bg-[#0a0a0a]/90 backdrop-blur-md px-2 py-1 rounded border border-[#262626] text-[11px] font-mono text-[#f4f3ef] font-semibold">
                        {post.score.overall}/100
                      </div>
                      <div
                        className={`px-2.5 py-1 rounded border text-[11px] font-mono uppercase tracking-wider ${
                          isApproved
                            ? 'bg-[#1a2618] border-[#a3e635] text-[#a3e635]'
                            : 'bg-[#0a0a0a]/90 border-[#262626] text-[#f4f3ef]'
                        }`}
                      >
                        {post.status === 'selected' ? tx('Onay Bekliyor', 'Pending Approval') : formatPostStatus(post.status)}
                      </div>
                    </div>

                    {/* Warning: Material Change Detected */}
                    {hasMaterialChange && (
                      <div className="absolute bottom-3 left-3 right-3 bg-[#450a0a]/90 backdrop-blur-md border border-[#7f1d1d] px-3 py-1.5 rounded flex items-center gap-2 text-xs text-[#fca5a5]">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-[#ef4444]" />
                        <span className="text-[11px] font-sans">
                          {tx('Onay sonrası içerik değiştirildi. Yeniden onay önerilir.', 'Content altered post-approval. Renewed sign-off recommended.')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* SELECTED CAROUSEL FRAMES & SHOOT GALLERY STRIP */}
                  <div className="p-3.5 bg-[#0e0e0e] border-b border-[#1e1e1e] space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                      <span className="text-[#c5a880]">
                        {tx('Carousel Paketi', 'Carousel Package')} ({selectedFrames.length} {tx('Seçili', 'Selected')} / {shootGallery.length} {tx('Çekimde', 'in Shoot')})
                      </span>
                      <span className="text-[#8e8d8a]">{tx('Kare eklemek/kaldırmak için tıklayın', 'Click to add/remove frames')}</span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
                      {shootGallery.map((imgUrl, idx) => {
                        const orderIdx = selectedFrames.indexOf(imgUrl);
                        const isFrameSelected = orderIdx !== -1;

                        return (
                          <div
                            key={`${imgUrl}-${idx}`}
                            className={`relative aspect-[3/4] rounded overflow-hidden border transition ${
                              orderIdx === 0
                                ? 'border-[#c5a880] ring-2 ring-[#c5a880]/40 opacity-100'
                                : isFrameSelected
                                ? 'border-[#a3e635] opacity-100'
                                : 'border-[#262626] opacity-50 hover:opacity-90'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleFrame(post, imgUrl)}
                              className="w-full h-full block cursor-pointer"
                            >
                              <img
                                src={imgUrl}
                                alt={`Frame ${idx + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover object-top"
                              />
                            </button>
                            <span
                              className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase pointer-events-none ${
                                orderIdx === 0
                                  ? 'bg-[#c5a880] text-[#0a0a0a] font-bold'
                                  : isFrameSelected
                                  ? 'bg-[#a3e635] text-[#0a0a0a] font-bold'
                                  : 'bg-[#0a0a0a]/80 text-[#a1a1aa]'
                              }`}
                            >
                              {orderIdx === 0
                                ? tx('1. Kapak', '1. Cover')
                                : isFrameSelected
                                ? `${orderIdx + 1}. ${tx('Kare', 'Frame')}`
                                : tx('+ Ekle', '+ Add')}
                            </span>
                            {isFrameSelected && orderIdx > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMakeCover(post, imgUrl);
                                }}
                                className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-[#0a0a0a]/90 border border-[#c5a880]/40 text-[8px] font-mono text-[#c5a880] cursor-pointer"
                              >
                                {tx('#1 Yap', 'Make #1')}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#8e8d8a] mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[#c5a880] uppercase font-semibold">{post.publication}</span>
                        <span>·</span>
                        <span>{post.publicationDate}</span>
                      </div>
                      {post.sourceUrl && (
                        <a
                          href={post.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#c5a880] hover:text-[#f4f3ef] inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>{tx('Kaynağı Doğrula', 'Verify Source')}</span>
                        </a>
                      )}
                    </div>
                    <h3 className="font-editorial text-xl text-[#f4f3ef] font-normal leading-snug mb-2">
                      {post.title}
                    </h3>
                    <p className="text-xs text-[#a1a1aa] font-sans line-clamp-1">
                      <span className="text-[#71717a]">{tx('Yazar / Fotoğraf:', 'Author / Photo:')}</span> {post.photographer}
                    </p>

                    {/* Agent 2 Audit Report Box */}
                    <div className="mt-3 p-2.5 bg-[#161513] rounded border border-[#2a2620] space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                        <span className="text-[#c5a880] flex items-center gap-1">
                          <Bot className="w-3 h-3" />
                          {tx('Ajan 2 Kararı', 'Agent 2 Verdict')}
                        </span>
                        <span className={passesThreshold ? 'text-[#a3e635]' : 'text-[#facc15]'}>
                          {post.aiAuditReport?.verdict === 'approved_by_ai'
                            ? tx('AI OTO-ONAYLI', 'AI AUTO-APPROVED')
                            : passesThreshold
                            ? tx('ÖNERİLEN', 'RECOMMENDED')
                            : tx('İNCELEME ÖNERİLİR', 'REVIEW SUGGESTED')}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#d4d4d8] font-sans line-clamp-2 leading-relaxed">
                        {post.aiAuditReport?.auditorNotes || post.score.rationale}
                      </p>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[#222222] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onOpenCaptionEditor(post)}
                        className="px-2.5 py-1.5 text-xs text-[#8e8d8a] hover:text-[#f4f3ef] bg-[#181818] border border-[#262626] rounded transition cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{tx('Metni Düzenle', 'Edit Copy')}</span>
                      </button>

                      <button
                        onClick={() => onAction(post.id, 'publish_now')}
                        disabled={isProcessingAction}
                        className="px-2.5 py-1.5 text-xs text-[#f4f3ef] hover:border-[#c5a880] bg-[#181818] border border-[#262626] rounded transition cursor-pointer flex items-center gap-1"
                        title={tx("Instagram'a Hemen Yayınla", 'Publish Immediately to Instagram')}
                      >
                        <Send className="w-3 h-3 text-[#c5a880]" />
                        <span>{tx('Yayınla', 'Publish')}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onAction(post.id, 'reject')}
                        disabled={isProcessingAction}
                        className="p-1.5 text-xs text-[#8e8d8a] hover:text-[#ef4444] bg-[#181818] border border-[#262626] rounded transition cursor-pointer"
                        title={tx('Gönderiyi Reddet', 'Reject Post')}
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() =>
                          onAction(post.id, 'approve', {
                            imageUrls: selectedFrames,
                          })
                        }
                        disabled={isProcessingAction}
                        className="px-4 py-1.5 bg-[#f4f3ef] text-[#0a0a0a] hover:bg-white text-xs font-mono font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {isApproved && !hasMaterialChange
                            ? tx(`Onaylandı (${selectedFrames.length} Kare)`, `Approved (${selectedFrames.length} Frames)`)
                            : tx(`Onayla (${selectedFrames.length} Kare) → Post Paketleri`, `Approve (${selectedFrames.length} Frames) → Post Packages`)}
                        </span>
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
