import React, { useState, useEffect } from 'react';
import { EditorialPost } from '../types/editorial';
import { 
  X, 
  Check, 
  Sparkles, 
  RefreshCw, 
  BookOpen, 
  Feather, 
  Minus, 
  Scissors, 
  Copy, 
  Info,
  Layers
} from 'lucide-react';

interface CaptionEditorModalProps {
  post: EditorialPost | null;
  onClose: () => void;
  onSave: (postId: string, newCaption: string, hashtags: string[]) => Promise<void>;
  isProcessing?: boolean;
}

export type CaptionTone = 'archival' | 'poetic' | 'minimal' | 'couture';

export const CaptionEditorModal: React.FC<CaptionEditorModalProps> = ({
  post,
  onClose,
  onSave,
  isProcessing,
}) => {
  if (!post) return null;

  const [caption, setCaption] = useState(post.caption);
  const [hashtagsStr, setHashtagsStr] = useState(post.hashtags.join(' '));
  const [selectedTone, setSelectedTone] = useState<CaptionTone>('archival');
  const [customNotes, setCustomNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [generationFeedback, setGenerationFeedback] = useState<string | null>(null);

  useEffect(() => {
    setCaption(post.caption);
    setHashtagsStr(post.hashtags.join(' '));
    setGenerationFeedback(null);
  }, [post]);

  const handleRegenerateWithAi = async (overrideTone?: CaptionTone) => {
    const activeTone = overrideTone || selectedTone;
    if (overrideTone) {
      setSelectedTone(overrideTone);
    }
    setIsGenerating(true);
    setGenerationFeedback(null);
    try {
      const res = await fetch('/api/ai/regenerate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          tone: activeTone,
          customNotes: customNotes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setGenerationFeedback(data.error || 'Failed to regenerate caption.');
      } else {
        setCaption(data.caption);
        if (Array.isArray(data.hashtags)) {
          setHashtagsStr(data.hashtags.join(' '));
        }
        setGenerationFeedback(`Draft regenerated in ${activeTone.toUpperCase()} tone.`);
      }
    } catch (e: any) {
      setGenerationFeedback(e.message || 'Network error.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = hashtagsStr
      .split(/\s+/)
      .map((t) => (t.startsWith('#') ? t : `#${t}`))
      .filter((t) => t.length > 1);

    await onSave(post.id, caption, tags);
    onClose();
  };

  const toneOptions: { id: CaptionTone; label: string; icon: any; summary: string }[] = [
    {
      id: 'archival',
      label: 'Archival Monograph',
      icon: BookOpen,
      summary: 'Museum-grade historical documentation, structured credits, austere reverence.',
    },
    {
      id: 'poetic',
      label: 'Poetic Chiaroscuro',
      icon: Feather,
      summary: 'Cinematic prose exploring shadow geometry, film grain, and emotional silence.',
    },
    {
      id: 'minimal',
      label: 'Minimal Modern',
      icon: Minus,
      summary: 'Brutalist, concise, zero adjectives, pure high-fashion data.',
    },
    {
      id: 'couture',
      label: 'Haute Couture Editorial',
      icon: Scissors,
      summary: 'Textile weight critique, sculptural draping silhouettes, atelier lineage.',
    },
  ];

  const charCount = caption.length;
  const tagCount = hashtagsStr.split(/\s+/).filter(t => t.trim().length > 1).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200 text-[#f4f3ef]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-[#222222] bg-[#141414] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#c5a880]">
              <span>Editorial Copywriting Studio</span>
              <span>·</span>
              <span>Gemini 3.8 Flash Assisted</span>
            </div>
            <h3 className="font-editorial text-2xl text-[#f4f3ef] font-normal mt-0.5">
              Edit Caption & AI Regeneration
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8e8d8a] hover:text-[#f4f3ef] p-1.5 rounded hover:bg-[#222222] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Tone Studio Panel */}
        <div className="p-5 bg-[#0e0e0e] border-b border-[#222222] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#c5a880]">
              <Sparkles className="w-4 h-4 text-[#c5a880]" />
              <span>AI Multi-Tone Regeneration Engine</span>
            </div>
            <span className="text-[11px] font-mono text-[#8e8d8a]">
              Click any tone to re-draft immediately
            </span>
          </div>

          {/* Tone Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {toneOptions.map((tone) => {
              const isSelected = selectedTone === tone.id;
              const Icon = tone.icon;
              return (
                <button
                  key={tone.id}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleRegenerateWithAi(tone.id)}
                  className={`p-2.5 rounded border text-left transition cursor-pointer flex flex-col justify-between disabled:opacity-60 ${
                    isSelected
                      ? 'bg-[#1e1c18] border-[#c5a880] text-[#f4f3ef]'
                      : 'bg-[#141414] border-[#222222] text-[#8e8d8a] hover:text-[#d4d4d8] hover:bg-[#181818]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#c5a880]' : 'text-[#71717a]'}`} />
                    <span className="text-[11px] font-mono font-medium truncate">{tone.label}</span>
                  </div>
                  <span className="text-[10px] text-[#71717a] leading-tight line-clamp-2">
                    {tone.summary}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Instruction Input & Generate Trigger */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <input
              type="text"
              placeholder="Optional curator directive (e.g. Highlight Lotta Volkova styling and architectural framing)..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="flex-1 bg-[#161616] border border-[#262626] rounded px-3 py-1.5 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880] placeholder:text-[#52525b]"
            />
            <button
              type="button"
              onClick={() => handleRegenerateWithAi()}
              disabled={isGenerating}
              className="px-4 py-1.5 bg-[#c5a880] hover:bg-[#d6bc96] text-[#0a0a0a] text-xs font-mono font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>{isGenerating ? 'Drafting...' : 'Regenerate with AI'}</span>
            </button>
          </div>

          {generationFeedback && (
            <div className="text-[11px] font-mono text-[#7cd38b] bg-[#122216] border border-[#1e4620] px-3 py-1.5 rounded flex items-center gap-2">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{generationFeedback}</span>
            </div>
          )}
        </div>

        {/* Tab Controls: Editor vs Live Preview */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[#222222] bg-[#121212] font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'editor'
                ? 'border-[#c5a880] text-[#c5a880] font-semibold'
                : 'border-transparent text-[#71717a] hover:text-[#d4d4d8]'
            }`}
          >
            Manual Copy Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
              activeTab === 'preview'
                ? 'border-[#c5a880] text-[#c5a880] font-semibold'
                : 'border-transparent text-[#71717a] hover:text-[#d4d4d8]'
            }`}
          >
            Simulated Instagram Feed Preview
          </button>
        </div>

        {/* Form / Preview Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'editor' ? (
            <>
              {/* Editorial Title Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-[#71717a] uppercase mb-1">
                    Editorial Title
                  </label>
                  <input
                    type="text"
                    disabled
                    value={post.title}
                    className="w-full bg-[#181818] border border-[#222222] rounded px-3 py-2 text-xs text-[#8e8d8a] font-mono cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#71717a] uppercase mb-1">
                    Credits (Photographer & Publication)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${post.photographer} · ${post.publication}`}
                    className="w-full bg-[#181818] border border-[#222222] rounded px-3 py-2 text-xs text-[#8e8d8a] font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Caption Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono text-[#71717a] uppercase">
                    Instagram Editorial Caption Copy
                  </label>
                  <span className={`text-[10px] font-mono ${charCount > 2000 ? 'text-[#ef4444]' : 'text-[#71717a]'}`}>
                    {charCount} / 2,200 chars
                  </span>
                </div>
                <textarea
                  rows={7}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-[#161616] border border-[#2a2a2a] rounded p-3 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880] leading-relaxed resize-y"
                  required
                />
              </div>

              {/* Hashtags Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono text-[#71717a] uppercase">
                    Curated Hashtags (Space separated)
                  </label>
                  <span className={`text-[10px] font-mono ${tagCount > 30 ? 'text-[#ef4444]' : 'text-[#71717a]'}`}>
                    {tagCount} / 30 tags
                  </span>
                </div>
                <input
                  type="text"
                  value={hashtagsStr}
                  onChange={(e) => setHashtagsStr(e.target.value)}
                  className="w-full bg-[#161616] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                  placeholder="#theeditorialindex #fashionphotography #monograph"
                />
              </div>

              <div className="p-3 bg-[#161616] border border-[#222222] rounded text-[11px] font-mono text-[#8e8d8a] flex items-center gap-2">
                <Info className="w-4 h-4 text-[#c5a880] shrink-0" />
                <span>
                  Saving updates content hash and updates package metadata. In Approval Mode, edited approved posts require re-sign-off.
                </span>
              </div>
            </>
          ) : (
            /* Live Instagram Feed Simulation Preview */
            <div className="flex justify-center p-2">
              <div className="w-full max-w-md bg-[#000000] border border-[#262626] rounded-xl overflow-hidden shadow-xl text-xs">
                <div className="p-3 border-b border-[#1c1c1c] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#262626] flex items-center justify-center font-bold text-[10px] text-[#f4f3ef]">
                      EI
                    </div>
                    <div>
                      <div className="font-semibold text-white">theeditorialindex</div>
                      <div className="text-[10px] text-[#71717a]">{post.publication}</div>
                    </div>
                  </div>
                  <span className="text-[#71717a]">•••</span>
                </div>

                <div className="p-4 space-y-2 font-sans text-xs">
                  <p className="whitespace-pre-line text-[#e4e4e7] leading-relaxed">
                    <span className="font-semibold text-white mr-1.5">theeditorialindex</span>
                    {caption}
                  </p>
                  <p className="text-[11px] text-[#8e8d8a] pt-1">
                    {hashtagsStr}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#222222] flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#71717a]">
              Post ID: {post.id}
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#8e8d8a] hover:text-[#f4f3ef] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-2 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Check className="w-4 h-4 text-[#0a0a0a]" />
                <span>Save to Package</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
