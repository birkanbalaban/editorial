import React, { useState } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';

interface AiResearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    photographer: string;
    publication: string;
    styling?: string;
    notes?: string;
    imageUrl?: string;
  }) => Promise<void>;
  isProcessing?: boolean;
}

export const AiResearchModal: React.FC<AiResearchModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [photographer, setPhotographer] = useState('');
  const [publication, setPublication] = useState('');
  const [styling, setStyling] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState('/src/assets/images/editorial_sculptural_couture_1794402215178.jpg');

  const presetExamples = [
    {
      title: 'Midnight Architectural Drapery',
      photographer: 'Nick Knight',
      publication: 'SHOWstudio',
      styling: 'Simon Foxton',
      notes: 'Experimental fluid motion study with dramatic high-contrast lighting.',
      img: '/src/assets/images/editorial_sculptural_couture_1794402215178.jpg',
    },
    {
      title: 'Monochrome Concrete Columns',
      photographer: 'Craig McDean',
      publication: 'AnOther Magazine',
      styling: 'Olivier Rizzo',
      notes: 'Brutalist European tailoring monograph.',
      img: '/src/assets/images/editorial_optic_tailoring_1794402217002.jpg',
    },
  ];

  const handleApplyPreset = (p: typeof presetExamples[0]) => {
    setTitle(p.title);
    setPhotographer(p.photographer);
    setPublication(p.publication);
    setStyling(p.styling);
    setNotes(p.notes);
    setSelectedImage(p.img);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !photographer || !publication) return;

    await onSubmit({
      title,
      photographer,
      publication,
      styling,
      notes,
      imageUrl: selectedImage,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2a2a2a] rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#222222] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-[#c5a880]" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a880] block">
                Autonomous Discovery Engine
              </span>
              <h3 className="font-editorial text-2xl text-[#f4f3ef] font-normal">
                AI Editorial Research & Evaluation
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8e8d8a] hover:text-[#f4f3ef] p-1.5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Quick Presets */}
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] block mb-2">
              Quick Test Discoveries:
            </span>
            <div className="flex flex-wrap gap-2">
              {presetExamples.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleApplyPreset(ex)}
                  className="px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#c5a880] text-[11px] font-mono text-[#d4d4d8] rounded transition cursor-pointer"
                >
                  + {ex.title} ({ex.photographer})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#71717a] uppercase mb-1">
                Editorial Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. The Architecture of Silence"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#71717a] uppercase mb-1">
                Photographer *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Peter Lindbergh"
                value={photographer}
                onChange={(e) => setPhotographer(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-[#71717a] uppercase mb-1">
                Publication *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vogue Italia, Self Service"
                value={publication}
                onChange={(e) => setPublication(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-[#71717a] uppercase mb-1">
                Stylist / Creative Direction (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Grace Coddington"
                value={styling}
                onChange={(e) => setStyling(e.target.value)}
                className="w-full bg-[#181818] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[#71717a] uppercase mb-1">
              Visual Context & Curatorial Notes
            </label>
            <textarea
              rows={3}
              placeholder="Aesthetic notes, lighting details, architectural references..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#181818] border border-[#2a2a2a] rounded p-3 text-xs text-[#f4f3ef] font-sans focus:outline-none focus:border-[#c5a880]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#222222] flex items-center justify-end gap-3">
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
              className="px-5 py-2 bg-[#f4f3ef] text-[#0a0a0a] text-xs font-semibold uppercase tracking-wider rounded hover:bg-white transition cursor-pointer flex items-center gap-1.5"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#c5a880]" />
                  <span>Curate & Score Discovery</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
