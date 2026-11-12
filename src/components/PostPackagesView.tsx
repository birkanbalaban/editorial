import React, { useState, useMemo, useEffect } from 'react';
import { EditorialPost } from '../types/editorial';
import { 
  Copy, 
  Check, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar,
  Clock,
  Sparkles,
  Edit3,
  Send,
  ChevronDown,
  ChevronUp,
  FastForward,
  Plus,
  Sliders,
  X,
  Save,
  Trash2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Layers,
  ExternalLink
} from 'lucide-react';

interface PostPackagesViewProps {
  posts: EditorialPost[];
  onEditPost?: (post: EditorialPost) => void;
  onPostAction?: (postId: string, action: string, payload?: any) => Promise<void>;
  isProcessing?: boolean;
}

const TIME_PRESETS = [
  { label: '10:00 · Morning Archive', time: '10:00', slotName: 'Morning Archive' },
  { label: '14:00 · First Window', time: '14:00', slotName: 'First Daily Window' },
  { label: '18:00 · Golden Hour', time: '18:00', slotName: 'Golden Hour Editorial' },
  { label: '20:00 · Second Window', time: '20:00', slotName: 'Evening Prime Slot' },
  { label: '22:30 · Late Night', time: '22:30', slotName: 'Late Night Monograph' },
];

function toLocalDateStr(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalTimeStr(isoString?: string): string {
  const d = isoString ? new Date(isoString) : new Date();
  if (isNaN(d.getTime())) return '14:00';
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

function combineDateAndTimeToIso(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1, hours || 14, minutes || 0, 0, 0);
  return d.toISOString();
}

export const PostPackagesView: React.FC<PostPackagesViewProps> = ({ 
  posts,
  onEditPost,
  onPostAction,
  isProcessing,
}) => {
  const [selectedPostId, setSelectedPostId] = useState<string>(posts[0]?.id || '');
  const [activeRatio, setActiveRatio] = useState<'4:5' | '1:1'>('4:5');
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [showQueueExpanded, setShowQueueExpanded] = useState(true);
  const [quickAiLoading, setQuickAiLoading] = useState(false);

  // Add New Slot Drawer State
  const [showAddSlotForm, setShowAddSlotForm] = useState(false);
  const [newSlotPostId, setNewSlotPostId] = useState<string>(posts[0]?.id || '');
  const [newSlotDate, setNewSlotDate] = useState<string>(() => toLocalDateStr());
  const [newSlotTime, setNewSlotTime] = useState<string>('14:00');
  const [newSlotLabel, setNewSlotLabel] = useState<string>('First Daily Window');

  // Inline Queue Slot Editor State (per postId)
  const [editingSlotPostId, setEditingSlotPostId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('14:00');
  const [editLabel, setEditLabel] = useState<string>('');

  // Right-panel Direct Inline Text & Schedule Editor for Selected Post
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [inlineCaption, setInlineCaption] = useState('');
  const [inlineHashtags, setInlineHashtags] = useState('');
  const [selectedScheduleDate, setSelectedScheduleDate] = useState('');
  const [selectedScheduleTime, setSelectedScheduleTime] = useState('14:00');
  const [selectedScheduleLabel, setSelectedScheduleLabel] = useState('');
  const [scheduleSavedToast, setScheduleSavedToast] = useState(false);

  // Carousel Frame Studio State
  const [activeCarouselSlide, setActiveCarouselSlide] = useState<number>(0);
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState<string>('');

  const selectedPost = posts.find(p => p.id === selectedPostId) || posts[0];

  useEffect(() => {
    if (selectedPost) {
      setInlineCaption(selectedPost.caption);
      setInlineHashtags(selectedPost.hashtags.join(' '));
      setSelectedScheduleDate(toLocalDateStr(selectedPost.scheduledTime));
      setSelectedScheduleTime(selectedPost.scheduledTime ? toLocalTimeStr(selectedPost.scheduledTime) : '14:00');
      setSelectedScheduleLabel(selectedPost.slotLabel || selectedPost.approvalRecord?.slotLabel || '');
      setActiveCarouselSlide(0);
    }
  }, [selectedPost?.id, selectedPost?.caption, selectedPost?.scheduledTime, selectedPost?.slotLabel]);

  // Carousel Frame Manipulation Handlers
  const handleMoveCarouselFrame = async (index: number, direction: -1 | 1) => {
    if (!selectedPost || !onPostAction) return;
    const current = [...(selectedPost.imageUrls || [])];
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[index];
    current[index] = current[targetIdx];
    current[targetIdx] = temp;
    setActiveCarouselSlide(targetIdx);
    await onPostAction(selectedPost.id, 'select_images', {
      imageUrls: current,
      candidateImages: selectedPost.candidateImages,
    });
  };

  const handleMakeCoverFrame = async (photoUrl: string) => {
    if (!selectedPost || !onPostAction) return;
    const rest = (selectedPost.imageUrls || []).filter((u) => u !== photoUrl);
    const nextUrls = [photoUrl, ...rest];
    setActiveCarouselSlide(0);
    await onPostAction(selectedPost.id, 'select_images', {
      imageUrls: nextUrls,
      candidateImages: selectedPost.candidateImages,
    });
  };

  const handleRemoveCarouselFrame = async (photoUrl: string) => {
    if (!selectedPost || !onPostAction) return;
    const current = selectedPost.imageUrls || [];
    if (current.length <= 1) return; // Keep at least 1 photo
    const nextUrls = current.filter((u) => u !== photoUrl);
    setActiveCarouselSlide((prev) => Math.min(prev, Math.max(0, nextUrls.length - 1)));
    await onPostAction(selectedPost.id, 'select_images', {
      imageUrls: nextUrls,
      candidateImages: selectedPost.candidateImages,
    });
  };

  const handleAddShootFrameToPost = async (photoUrl: string) => {
    if (!selectedPost || !onPostAction) return;
    const current = selectedPost.imageUrls || [];
    if (current.includes(photoUrl)) return;
    const nextUrls = [...current, photoUrl];
    setActiveCarouselSlide(nextUrls.length - 1);
    await onPostAction(selectedPost.id, 'select_images', {
      imageUrls: nextUrls,
      candidateImages: selectedPost.candidateImages,
    });
  };

  const handleAddCustomPhotoToPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !onPostAction) return;
    const trimmed = newPhotoUrlInput.trim();
    if (!trimmed.startsWith('http')) return;
    const nextUrls = Array.from(new Set([...(selectedPost.imageUrls || []), trimmed]));
    const nextCandidates = Array.from(new Set([...(selectedPost.candidateImages || []), trimmed]));
    setNewPhotoUrlInput('');
    setActiveCarouselSlide(nextUrls.length - 1);
    await onPostAction(selectedPost.id, 'select_images', {
      imageUrls: nextUrls,
      candidateImages: nextCandidates,
    });
  };

  // Filter & sort scheduled and approved posts in chronological queue
  const queuePosts = useMemo(() => {
    const active = posts.filter(p => p.status === 'scheduled' || p.status === 'approved');
    return active.sort((a, b) => {
      const timeA = a.scheduledTime ? new Date(a.scheduledTime).getTime() : Infinity;
      const timeB = b.scheduledTime ? new Date(b.scheduledTime).getTime() : Infinity;
      return timeA - timeB;
    });
  }, [posts]);

  const handleCopyCaption = () => {
    if (!selectedPost) return;
    const fullText = `${selectedPost.caption}\n\n${selectedPost.hashtags.join(' ')}`;
    navigator.clipboard.writeText(fullText);
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  };

  const handlePostponeSlot = async (post: EditorialPost, offsetHours: number, slotHour?: number) => {
    if (!onPostAction) return;
    await onPostAction(post.id, 'postpone', { offsetHours, slotHour });
  };

  const handleMoveToTop = async (post: EditorialPost) => {
    if (!onPostAction) return;
    await onPostAction(post.id, 'move_to_top');
  };

  const handleOpenInlineSlotEditor = (post: EditorialPost) => {
    if (editingSlotPostId === post.id) {
      setEditingSlotPostId(null);
      return;
    }
    setEditingSlotPostId(post.id);
    setEditDate(toLocalDateStr(post.scheduledTime));
    setEditTime(post.scheduledTime ? toLocalTimeStr(post.scheduledTime) : '14:00');
    setEditLabel(post.slotLabel || post.approvalRecord?.slotLabel || 'Custom Slot');
  };

  const handleSaveInlineSlot = async (postId: string) => {
    if (!onPostAction || !editDate || !editTime) return;
    const iso = combineDateAndTimeToIso(editDate, editTime);
    await onPostAction(postId, 'schedule', {
      scheduledTime: iso,
      slotLabel: editLabel.trim() || undefined,
    });
    setEditingSlotPostId(null);
  };

  const handleCreateNewSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onPostAction || !newSlotPostId || !newSlotDate || !newSlotTime) return;
    const iso = combineDateAndTimeToIso(newSlotDate, newSlotTime);
    await onPostAction(newSlotPostId, 'schedule', {
      scheduledTime: iso,
      slotLabel: newSlotLabel.trim() || 'Scheduled Slot',
    });
    setSelectedPostId(newSlotPostId);
    setShowAddSlotForm(false);
  };

  const handleSaveSelectedPostSchedule = async () => {
    if (!selectedPost || !onPostAction || !selectedScheduleDate || !selectedScheduleTime) return;
    const iso = combineDateAndTimeToIso(selectedScheduleDate, selectedScheduleTime);
    await onPostAction(selectedPost.id, 'schedule', {
      scheduledTime: iso,
      slotLabel: selectedScheduleLabel.trim() || undefined,
    });
    setScheduleSavedToast(true);
    setTimeout(() => setScheduleSavedToast(false), 2500);
  };

  const handleSaveInlineCaption = async () => {
    if (!selectedPost || !onPostAction || !inlineCaption.trim()) return;
    const parsedHashtags = inlineHashtags
      .split(/[\s,]+/)
      .map(t => t.trim())
      .filter(Boolean)
      .map(t => (t.startsWith('#') ? t : `#${t}`));

    await onPostAction(selectedPost.id, 'edit_caption', {
      caption: inlineCaption.trim(),
      hashtags: parsedHashtags,
    });
    setInlineEditMode(false);
  };

  const handleQuickToneRegenerate = async (tone: 'archival' | 'poetic' | 'minimal' | 'couture') => {
    if (!selectedPost || !onPostAction) return;
    setQuickAiLoading(true);
    try {
      const res = await fetch('/api/ai/regenerate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: selectedPost.id,
          tone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.caption) {
        await onPostAction(selectedPost.id, 'edit_caption', {
          caption: data.caption,
          hashtags: data.hashtags,
        });
      }
    } catch (e) {
      console.error('Quick tone regeneration failed:', e);
    } finally {
      setQuickAiLoading(false);
    }
  };

  const setDayOffset = (days: number, setter: (val: string) => void) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setter(toLocalDateStr(d.toISOString()));
  };

  const formatSlotTime = (isoString?: string) => {
    if (!isoString) return 'Slot: Next Available Window';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Slot: Custom';
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today · ${timeStr} (UTC+3)`;
    if (isTomorrow) return `Tomorrow · ${timeStr} (UTC+3)`;
    return `${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · ${timeStr} (UTC+3)`;
  };

  if (!selectedPost) {
    return (
      <div className="text-center py-20 border border-dashed border-[#222222] rounded bg-[#121212]">
        <p className="text-sm text-[#8e8d8a]">No editorial posts available to package.</p>
      </div>
    );
  }

  const isUnlicensed = selectedPost.rightsStatus !== 'verified';

  return (
    <div className="space-y-8 w-full max-w-full overflow-hidden">
      {/* View Header */}
      <div className="border-b border-[#222222] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Social Media Engineering</span>
            <span>·</span>
            <span>Customizable Slots & Feed Packages</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Complete Instagram Post Packages
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Create custom publishing slots, set exact dates and times, edit or AI-regenerate captions inline, and manage the chronological publishing queue on a single page.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowAddSlotForm(!showAddSlotForm);
              setShowQueueExpanded(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#c5a880] hover:bg-[#d4b992] text-[#0a0a0a] font-mono text-xs uppercase tracking-wider font-semibold rounded transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddSlotForm ? 'Close Slot Creator' : '+ Add Publishing Slot'}</span>
          </button>
        </div>
      </div>

      {/* 1. CHRONOLOGICAL PUBLISHING QUEUE & SLOT CREATOR */}
      <div className="p-4 sm:p-5 bg-[#121212] border border-[#222222] rounded space-y-4 w-full max-w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Calendar className="w-5 h-5 text-[#c5a880] shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-editorial text-xl text-[#f4f3ef]">
                  Chronological Publishing Queue & Custom Slots
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#1c1c1c] text-[#c5a880] border border-[#c5a880]/20">
                  {queuePosts.length} Active Slots
                </span>
              </div>
              <p className="text-xs text-[#8e8d8a] font-mono mt-0.5">
                Fully customizable date, time (HH:mm), slot labels, and priority ordering
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddSlotForm(!showAddSlotForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1c18] hover:bg-[#28241d] border border-[#c5a880]/40 rounded text-xs font-mono text-[#c5a880] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Custom Slot</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQueueExpanded(!showQueueExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded text-xs font-mono text-[#f4f3ef] transition cursor-pointer"
            >
              <span>{showQueueExpanded ? 'Collapse' : 'Expand Queue'}</span>
              {showQueueExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* NEW PUBLISHING SLOT CREATOR DRAWER */}
        {showAddSlotForm && (
          <form
            onSubmit={handleCreateNewSlot}
            className="p-4 bg-[#161513] border border-[#c5a880]/40 rounded space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#c5a880]" />
                <span className="text-xs font-mono uppercase tracking-wider text-[#f4f3ef] font-semibold">
                  Create & Assign Custom Publishing Slot
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSlotForm(false)}
                className="text-[#8e8d8a] hover:text-[#f4f3ef] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Step 1: Select Editorial Post */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase text-[#8e8d8a]">
                  1. Editorial Package to Assign
                </label>
                <select
                  value={newSlotPostId}
                  onChange={(e) => setNewSlotPostId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                >
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.status.toUpperCase()}] {p.title} — {p.photographer}
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Date + Quick Day Buttons */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase text-[#8e8d8a]">
                  2. Publishing Date
                </label>
                <input
                  type="date"
                  value={newSlotDate}
                  onChange={(e) => setNewSlotDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setDayOffset(0, setNewSlotDate)}
                    className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#262626] text-[10px] font-mono text-[#c5a880] rounded cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayOffset(1, setNewSlotDate)}
                    className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#262626] text-[10px] font-mono text-[#c5a880] rounded cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayOffset(2, setNewSlotDate)}
                    className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#262626] text-[10px] font-mono text-[#8e8d8a] hover:text-[#f4f3ef] rounded cursor-pointer"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setDayOffset(3, setNewSlotDate)}
                    className="px-2 py-0.5 bg-[#1c1c1c] hover:bg-[#262626] text-[10px] font-mono text-[#8e8d8a] hover:text-[#f4f3ef] rounded cursor-pointer"
                  >
                    +3 Days
                  </button>
                </div>
              </div>

              {/* Step 3: Exact Time (HH:mm) */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-mono uppercase text-[#8e8d8a]">
                  3. Custom Time (24h)
                </label>
                <input
                  type="time"
                  value={newSlotTime}
                  onChange={(e) => setNewSlotTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {TIME_PRESETS.map((preset) => (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => {
                        setNewSlotTime(preset.time);
                        setNewSlotLabel(preset.slotName);
                      }}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded cursor-pointer transition ${
                        newSlotTime === preset.time
                          ? 'bg-[#c5a880] text-[#0a0a0a] font-semibold'
                          : 'bg-[#1c1c1c] hover:bg-[#262626] text-[#a1a1aa]'
                      }`}
                    >
                      {preset.time}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 4: Custom Slot Label & Submit */}
              <div className="space-y-1.5 flex flex-col justify-between">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8e8d8a] mb-1.5">
                    4. Slot Label / Window Name
                  </label>
                  <input
                    type="text"
                    value={newSlotLabel}
                    onChange={(e) => setNewSlotLabel(e.target.value)}
                    placeholder="e.g. Evening Couture Drop"
                    className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full mt-2 px-4 py-2 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] font-mono text-xs uppercase tracking-wider font-semibold rounded transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Add Slot to Queue</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* QUEUE TIMELINE LIST */}
        {showQueueExpanded && (
          <div className="pt-1">
            {queuePosts.length === 0 ? (
              <div className="p-6 text-center text-xs font-mono text-[#8e8d8a] bg-[#161616] border border-[#222222] rounded space-y-2">
                <p>No posts are currently in the publishing queue.</p>
                <button
                  type="button"
                  onClick={() => setShowAddSlotForm(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1c18] border border-[#c5a880]/40 rounded text-[#c5a880] hover:bg-[#28241d] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create First Publishing Slot</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {queuePosts.map((post, idx) => {
                  const rankNum = String(idx + 1).padStart(2, '0');
                  const isReadyToPublish = post.rightsStatus === 'verified';
                  const isEditingThisSlot = editingSlotPostId === post.id;
                  const slotLabel = post.slotLabel || post.approvalRecord?.slotLabel;

                  return (
                    <div
                      key={post.id}
                      className={`p-3.5 sm:p-4 bg-[#161616] border rounded transition space-y-3 ${
                        selectedPost.id === post.id
                          ? 'border-[#c5a880]/60 bg-[#191816]'
                          : 'border-[#262626] hover:border-[#333333]'
                      }`}
                    >
                      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                        {/* Left: Queue Rank & Thumbnail & Info */}
                        <div
                          onClick={() => setSelectedPostId(post.id)}
                          className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                        >
                          <div className="flex flex-col items-center justify-center w-11 h-14 bg-[#1e1c18] border border-[#c5a880]/30 rounded shrink-0">
                            <span className="text-[9px] font-mono text-[#c5a880] uppercase">Slot</span>
                            <span className="font-mono text-sm font-bold text-[#c5a880]">#{rankNum}</span>
                          </div>

                          <div className="w-11 h-14 bg-[#0a0a0a] rounded overflow-hidden shrink-0 border border-[#222222]">
                            {post.imageUrls && post.imageUrls[0] ? (
                              <img
                                src={post.imageUrls[0]}
                                alt={post.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-[#71717a]">
                                Ref
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-[#f4f3ef] truncate">
                                {post.title}
                              </span>
                              {slotLabel && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#221f1a] border border-[#c5a880]/30 text-[10px] font-mono text-[#c5a880]">
                                  <Tag className="w-2.5 h-2.5" />
                                  {slotLabel}
                                </span>
                              )}
                              {post.rightsStatus === 'verified' ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#7cd38b]">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified Rights
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-[#c5a880]">
                                  <ShieldAlert className="w-3 h-3" />
                                  Advisory Rights (Ready)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#8e8d8a] truncate font-sans">
                              {post.photographer} · {post.publication}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-[#c5a880] mt-0.5">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{formatSlotTime(post.scheduledTime)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Flexible Action Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                          {/* Customize Date/Time Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenInlineSlotEditor(post)}
                            className={`px-2.5 py-1.5 border rounded text-[11px] transition cursor-pointer flex items-center gap-1 ${
                              isEditingThisSlot
                                ? 'bg-[#c5a880] text-[#0a0a0a] border-[#c5a880] font-semibold'
                                : 'bg-[#202020] hover:bg-[#282828] border-[#333333] hover:border-[#c5a880] text-[#f4f3ef]'
                            }`}
                          >
                            <Sliders className="w-3 h-3" />
                            <span>{isEditingThisSlot ? 'Close Time Editor' : 'Customize Time'}</span>
                          </button>

                          {/* Quick Postpone +2h */}
                          <button
                            type="button"
                            onClick={() => handlePostponeSlot(post, 2)}
                            disabled={isProcessing}
                            className="px-2 py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#333333] hover:border-[#c5a880] rounded text-[11px] text-[#f4f3ef] transition cursor-pointer flex items-center gap-1"
                            title="Postpone by +2 hours"
                          >
                            <FastForward className="w-3 h-3 text-[#c5a880]" />
                            <span>+2h</span>
                          </button>

                          {/* Quick Postpone +6h */}
                          <button
                            type="button"
                            onClick={() => handlePostponeSlot(post, 6)}
                            disabled={isProcessing}
                            className="px-2 py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#333333] hover:border-[#c5a880] rounded text-[11px] text-[#f4f3ef] transition cursor-pointer"
                            title="Push +6 hours"
                          >
                            +6h
                          </button>

                          {/* Postpone to Tomorrow 14:00 */}
                          <button
                            type="button"
                            onClick={() => handlePostponeSlot(post, 24, 14)}
                            disabled={isProcessing}
                            className="px-2 py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#333333] hover:border-[#c5a880] rounded text-[11px] text-[#f4f3ef] transition cursor-pointer"
                          >
                            Tomorrow 14:00
                          </button>

                          {/* Move to Top #1 */}
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveToTop(post)}
                              disabled={isProcessing}
                              className="px-2 py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#333333] rounded text-[11px] text-[#c5a880] transition cursor-pointer"
                            >
                              Top #1
                            </button>
                          )}

                          {/* Edit Copy Modal Trigger */}
                          {onEditPost && (
                            <button
                              type="button"
                              onClick={() => onEditPost(post)}
                              className="px-2.5 py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#333333] rounded text-[11px] text-[#8e8d8a] hover:text-[#f4f3ef] transition cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit Copy</span>
                            </button>
                          )}

                          {/* Remove from Queue */}
                          {onPostAction && (
                            <button
                              type="button"
                              onClick={() => onPostAction(post.id, 'unschedule')}
                              disabled={isProcessing}
                              className="p-1.5 bg-[#202020] hover:bg-[#2a1a1a] border border-[#333333] hover:border-[#f87171]/50 rounded text-[#8e8d8a] hover:text-[#f87171] transition cursor-pointer"
                              title="Remove from scheduled slots"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Immediate Publish Now button (Unlocked for all posts) */}
                          {onPostAction && (
                            <button
                              type="button"
                              onClick={() => onPostAction(post.id, 'publish_now')}
                              disabled={isProcessing}
                              className="px-2.5 py-1.5 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] text-[11px] font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>Publish</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* INLINE CUSTOM DATE/TIME/PRESET EDITOR FOR THIS QUEUE ITEM */}
                      {isEditingThisSlot && (
                        <div className="pt-3 border-t border-[#262626] bg-[#121212] p-3 rounded space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-[#8e8d8a] mb-1">
                                Custom Date
                              </label>
                              <input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-[#8e8d8a] mb-1">
                                Exact Time (HH:mm)
                              </label>
                              <input
                                type="time"
                                value={editTime}
                                onChange={(e) => setEditTime(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-[#8e8d8a] mb-1">
                                Custom Slot Label
                              </label>
                              <input
                                type="text"
                                value={editLabel}
                                onChange={(e) => setEditLabel(e.target.value)}
                                placeholder="e.g. Evening Feature"
                                className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-mono text-[#71717a] uppercase mr-1">
                                Quick Window Presets:
                              </span>
                              {TIME_PRESETS.map((p) => (
                                <button
                                  key={p.time}
                                  type="button"
                                  onClick={() => {
                                    setEditTime(p.time);
                                    setEditLabel(p.slotName);
                                  }}
                                  className={`px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer ${
                                    editTime === p.time
                                      ? 'bg-[#c5a880] text-[#0a0a0a] font-semibold'
                                      : 'bg-[#1c1c1c] hover:bg-[#262626] text-[#a1a1aa]'
                                  }`}
                                >
                                  {p.label}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingSlotPostId(null)}
                                className="px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#262626] text-xs font-mono text-[#8e8d8a] rounded cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveInlineSlot(post.id)}
                                className="px-3 py-1.5 bg-[#c5a880] hover:bg-[#d4b992] text-[#0a0a0a] text-xs font-mono font-semibold rounded cursor-pointer flex items-center gap-1"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Update Slot</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. MAIN WORKSPACE GRID: LEFT PACKAGE SELECTOR, CENTER FEED PREVIEW, RIGHT CUSTOMIZATION STUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 w-full max-w-full">
        
        {/* Left: Package Selector (3 cols) */}
        <div className="lg:col-span-3 space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-mono block">
              All Packages ({posts.length})
            </span>
            <span className="text-[10px] font-mono text-[#8e8d8a]">
              Select to customize
            </span>
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {posts.map((post) => {
              const isSelected = post.id === selectedPost.id;
              return (
                <button
                  key={post.id}
                  onClick={() => setSelectedPostId(post.id)}
                  className={`w-full p-3 rounded text-left transition cursor-pointer flex items-center gap-3 border min-w-0 ${
                    isSelected
                      ? 'bg-[#1c1c1c] border-[#c5a880] text-[#f4f3ef]'
                      : 'bg-[#121212] border-[#222222] text-[#a1a1aa] hover:bg-[#181818]'
                  }`}
                >
                  <div className="w-12 h-14 bg-[#0a0a0a] rounded overflow-hidden shrink-0">
                    {post.imageUrls && post.imageUrls[0] ? (
                      <img
                        src={post.imageUrls[0]}
                        alt={post.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-[#71717a]">
                        Ref
                      </div>
                    )}
                  </div>
                  <div className="overflow-hidden flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-[#f4f3ef]">{post.title}</p>
                    <p className="text-[11px] text-[#8e8d8a] truncate">{post.photographer}</p>
                    {post.scheduledTime && (
                      <p className="text-[10px] font-mono text-[#c5a880] truncate mt-0.5">
                        {formatSlotTime(post.scheduledTime)}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] font-mono text-[#c5a880]">{post.rightsStatus}</span>
                      <span className="text-[10px] font-mono text-[#71717a] uppercase">{post.status}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center: Simulated Feed Presentation & Multi-Photo Carousel Studio (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center space-y-5 min-w-0">
          {/* Aspect Ratio Switcher & Original Article Link */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 bg-[#121212] p-1 rounded border border-[#222222]">
              <button
                onClick={() => setActiveRatio('4:5')}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
                  activeRatio === '4:5' ? 'bg-[#222222] text-[#f4f3ef]' : 'text-[#8e8d8a]'
                }`}
              >
                Feed 4:5
              </button>
              <button
                onClick={() => setActiveRatio('1:1')}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
                  activeRatio === '1:1' ? 'bg-[#222222] text-[#f4f3ef]' : 'text-[#8e8d8a]'
                }`}
              >
                Square 1:1
              </button>
            </div>

            {selectedPost.sourceUrl && (
              <a
                href={selectedPost.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#161616] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-mono text-[#c5a880] hover:text-[#f4f3ef]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Original Article ({selectedPost.publication})</span>
              </a>
            )}
          </div>

          {/* Instagram Mobile Feed Shell with Interactive Carousel */}
          <div className="w-full max-w-[390px] bg-[#000000] border border-[#262626] rounded-xl overflow-hidden shadow-2xl">
            {/* Instagram Post Header */}
            <div className="px-3.5 py-3 flex items-center justify-between border-b border-[#1c1c1c]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#262626] border border-[#333333] flex items-center justify-center text-[11px] font-editorial uppercase font-bold text-[#f4f3ef] shrink-0">
                  EI
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-[#f4f3ef] truncate">theeditorialindex</span>
                    <span className="text-[#c5a880] text-[10px]">●</span>
                  </div>
                  <span className="text-[10px] text-[#71717a] block -mt-0.5 truncate">{selectedPost.publication}</span>
                </div>
              </div>
              <span className="text-xs text-[#71717a]">•••</span>
            </div>

            {/* Media Area with Multi-Photo Carousel Navigation */}
            {(() => {
              const frames = selectedPost.imageUrls || [];
              const safeIdx = Math.min(activeCarouselSlide, Math.max(0, frames.length - 1));
              return (
                <div 
                  className={`relative bg-[#050505] overflow-hidden flex items-center justify-center ${
                    activeRatio === '4:5' ? 'aspect-[4/5]' : 'aspect-square'
                  }`}
                >
                  {frames.length > 0 ? (
                    <img
                      src={frames[safeIdx] || frames[0]}
                      alt={selectedPost.altText}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top transition-all duration-300"
                    />
                  ) : (
                    <div className="text-xs text-[#71717a]">Media Preview</div>
                  )}

                  {/* Top-Right Carousel Counter Pill */}
                  {frames.length > 1 && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#0a0a0a]/85 border border-[#333333] text-[11px] font-mono text-[#f4f3ef]">
                      {safeIdx + 1} / {frames.length}
                    </div>
                  )}

                  {/* Left / Right Carousel Arrows */}
                  {frames.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveCarouselSlide((safeIdx - 1 + frames.length) % frames.length)
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#0a0a0a]/85 border border-[#333333] text-[#f4f3ef] hover:border-[#c5a880] cursor-pointer"
                        title="Previous frame"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveCarouselSlide((safeIdx + 1) % frames.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[#0a0a0a]/85 border border-[#333333] text-[#f4f3ef] hover:border-[#c5a880] cursor-pointer"
                        title="Next frame"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  <div className="absolute inset-2 border border-white/10 pointer-events-none rounded" />
                </div>
              );
            })()}

            {/* Simulated Action Row + Carousel Dots */}
            <div className="px-3.5 py-2.5 flex items-center justify-between text-sm text-[#f4f3ef]">
              <div className="flex items-center gap-4">
                <span>♡</span>
                <span>💬</span>
                <span>↗</span>
              </div>

              {/* Carousel Dots */}
              {(selectedPost.imageUrls || []).length > 1 && (
                <div className="flex items-center gap-1.5">
                  {(selectedPost.imageUrls || []).map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveCarouselSlide(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition cursor-pointer ${
                        idx === activeCarouselSlide ? 'bg-[#c5a880] scale-125' : 'bg-[#3f3f46]'
                      }`}
                    />
                  ))}
                </div>
              )}

              <span>🔖</span>
            </div>

            {/* Caption Area in Feed */}
            <div className="px-3.5 pb-4 text-xs font-sans text-[#e4e4e7] space-y-1 break-words">
              <p>
                <span className="font-semibold text-white mr-1.5">theeditorialindex</span>
                <span className="text-[#d4d4d8] leading-relaxed whitespace-pre-line text-[11px]">
                  {selectedPost.caption}
                </span>
              </p>
              <p className="text-[11px] text-[#71717a] pt-1 break-words">
                {selectedPost.hashtags.join(' ')}
              </p>
            </div>
          </div>

          {/* CAROUSEL & SHOOT FRAME STUDIO: Reorder, Remove & Add Photos to This Post */}
          <div className="w-full p-4 bg-[#121212] border border-[#222222] rounded space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1e1e1e] pb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase text-[#c5a880]">
                <Layers className="w-3.5 h-3.5" />
                <span>
                  Carousel & Frame Studio ({(selectedPost.imageUrls || []).length} Selected Photos)
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#8e8d8a]">
                Reorder (←/→), Make Cover (#1), Remove (×), or Add
              </span>
            </div>

            {/* 1. Selected Carousel Frames (Reorderable & Removable) */}
            <div className="space-y-2">
              <span className="block text-[10px] font-mono uppercase text-[#f4f3ef]">
                1. Active Post Frames (Published in This Order):
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {(selectedPost.imageUrls || []).map((imgUrl, idx) => {
                  const isActivePreview = activeCarouselSlide === idx;
                  const totalSelected = (selectedPost.imageUrls || []).length;

                  return (
                    <div
                      key={`${imgUrl}-${idx}`}
                      className={`relative aspect-[3/4] rounded overflow-hidden border transition ${
                        isActivePreview
                          ? 'border-[#c5a880] ring-2 ring-[#c5a880]/40'
                          : 'border-[#333333]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveCarouselSlide(idx)}
                        className="w-full h-full block cursor-pointer"
                      >
                        <img
                          src={imgUrl}
                          alt={`Selected frame ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                        />
                      </button>

                      {/* Frame Number Badge */}
                      <span
                        className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase ${
                          idx === 0
                            ? 'bg-[#c5a880] text-[#0a0a0a] font-bold'
                            : 'bg-[#0a0a0a]/85 text-[#f4f3ef]'
                        }`}
                      >
                        {idx === 0 ? '#1 Cover' : `#${idx + 1}`}
                      </span>

                      {/* Remove Frame Button */}
                      {totalSelected > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveCarouselFrame(imgUrl)}
                          className="absolute top-1 right-1 p-1 rounded bg-[#0a0a0a]/85 hover:bg-[#ef4444] text-[#f4f3ef] cursor-pointer"
                          title="Remove this photo from post"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}

                      {/* Reorder & Make Cover Controls */}
                      <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between gap-1 bg-[#0a0a0a]/90 px-1 py-0.5 rounded">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveCarouselFrame(idx, -1)}
                          className="text-[10px] font-mono text-[#d4d4d8] hover:text-[#c5a880] disabled:opacity-30 cursor-pointer px-1"
                          title="Move left"
                        >
                          ←
                        </button>
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMakeCoverFrame(imgUrl)}
                            className="text-[8px] font-mono uppercase text-[#c5a880] hover:underline cursor-pointer"
                            title="Make #1 Cover"
                          >
                            #1
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={idx === totalSelected - 1}
                          onClick={() => handleMoveCarouselFrame(idx, 1)}
                          className="text-[10px] font-mono text-[#d4d4d8] hover:text-[#c5a880] disabled:opacity-30 cursor-pointer px-1"
                          title="Move right"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Remaining Photographs from This Article's Shoot */}
            {(() => {
              const unselectedShootPhotos = (selectedPost.candidateImages || []).filter(
                (u) => !(selectedPost.imageUrls || []).includes(u)
              );
              if (unselectedShootPhotos.length === 0) return null;

              return (
                <div className="pt-3 border-t border-[#1e1e1e] space-y-2">
                  <span className="block text-[10px] font-mono uppercase text-[#8e8d8a]">
                    2. Other Photos from This Article's Shoot (Click to Add to Post):
                  </span>
                  <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {unselectedShootPhotos.map((imgUrl, idx) => (
                      <button
                        key={`${imgUrl}-${idx}`}
                        type="button"
                        onClick={() => handleAddShootFrameToPost(imgUrl)}
                        className="group relative aspect-[3/4] rounded overflow-hidden border border-[#262626] opacity-70 hover:opacity-100 hover:border-[#c5a880] transition cursor-pointer"
                        title="Add this shoot photograph to the Carousel"
                      >
                        <img
                          src={imgUrl}
                          alt={`Available shoot frame ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                        />
                        <span className="absolute bottom-1 left-1 right-1 bg-[#0a0a0a]/90 text-[#c5a880] text-[9px] font-mono uppercase py-0.5 rounded text-center">
                          + Add Frame
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* 3. Add Custom Image URL to This Post */}
            <form onSubmit={handleAddCustomPhotoToPost} className="pt-2 border-t border-[#1e1e1e] flex items-center gap-2">
              <input
                type="text"
                value={newPhotoUrlInput}
                onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                placeholder="Paste additional image URL (https://...) to add to this post..."
                className="flex-1 px-2.5 py-1.5 bg-[#0a0a0a] border border-[#262626] rounded text-xs font-mono text-[#f4f3ef] focus:outline-none focus:border-[#c5a880]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#1e1c18] hover:bg-[#28241d] border border-[#c5a880]/40 rounded text-xs font-mono text-[#c5a880] cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Photo</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right: Slot Scheduler, Post Text Studio & Rights Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-5 min-w-0">
          
          {/* DIRECT SLOT & SCHEDULE CUSTOMIZER FOR SELECTED POST */}
          <div className="p-4 sm:p-5 bg-[#121212] border border-[#222222] rounded space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-[#c5a880] font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Slot & Time Customizer
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1a1a1a] text-[#a1a1aa] uppercase">
                {selectedPost.status}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#71717a] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedScheduleDate}
                  onChange={(e) => setSelectedScheduleDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#262626] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-[#71717a] mb-1">
                  Exact Time (24h)
                </label>
                <input
                  type="time"
                  value={selectedScheduleTime}
                  onChange={(e) => setSelectedScheduleTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#262626] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase text-[#71717a] mb-1">
                Slot Label / Campaign Tag
              </label>
              <input
                type="text"
                value={selectedScheduleLabel}
                onChange={(e) => setSelectedScheduleLabel(e.target.value)}
                placeholder="e.g. Afternoon Editorial Drop"
                className="w-full px-2.5 py-1.5 bg-[#0a0a0a] border border-[#262626] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
              />
            </div>

            {/* Time Presets */}
            <div className="space-y-1">
              <span className="block text-[10px] font-mono uppercase text-[#71717a]">
                Quick Slot Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {TIME_PRESETS.map((preset) => (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => {
                      setSelectedScheduleTime(preset.time);
                      setSelectedScheduleLabel(preset.slotName);
                    }}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition cursor-pointer ${
                      selectedScheduleTime === preset.time
                        ? 'bg-[#c5a880] text-[#0a0a0a] font-semibold'
                        : 'bg-[#1a1a1a] hover:bg-[#242424] text-[#a1a1aa] border border-[#262626]'
                    }`}
                  >
                    {preset.time}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveSelectedPostSchedule}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 bg-[#c5a880] hover:bg-[#d4b992] text-[#0a0a0a] font-mono text-xs uppercase tracking-wider font-semibold rounded transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{selectedPost.status === 'scheduled' ? 'Update Slot Time' : 'Assign to Queue Slot'}</span>
              </button>
              {scheduleSavedToast && (
                <span className="text-[11px] font-mono text-[#7cd38b] flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Saved
                </span>
              )}
            </div>
          </div>

          {/* Interactive Post Text Package Box with Inline Edit, Modal Studio & AI Re-Draft */}
          <div className="p-4 sm:p-5 bg-[#121212] border border-[#222222] rounded space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-mono">
                Post Text Package & AI Studio
              </span>
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInlineEditMode(!inlineEditMode)}
                  className="text-xs font-mono text-[#c5a880] hover:text-[#e4d4c0] flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{inlineEditMode ? 'Cancel Edit' : 'Inline Edit'}</span>
                </button>
                {onEditPost && (
                  <button
                    type="button"
                    onClick={() => onEditPost(selectedPost)}
                    className="text-xs font-mono text-[#8e8d8a] hover:text-[#f4f3ef] flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#c5a880]" />
                    <span>Studio Modal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="text-xs font-mono text-[#8e8d8a] hover:text-[#f4f3ef] flex items-center gap-1 cursor-pointer"
                >
                  {copiedCaption ? <Check className="w-3.5 h-3.5 text-[#7cd38b]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCaption ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Quick 1-Click AI Tone Selector */}
            <div className="space-y-1.5 p-3 bg-[#0a0a0a] rounded border border-[#1e1e1e]">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#71717a]">
                <span className="flex items-center gap-1 text-[#c5a880]">
                  <Sparkles className="w-3 h-3" />
                  1-Click AI Re-write by Tone:
                </span>
                {quickAiLoading && <span className="animate-pulse text-[#c5a880]">Drafting...</span>}
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-mono">
                <button
                  type="button"
                  disabled={quickAiLoading}
                  onClick={() => handleQuickToneRegenerate('archival')}
                  className="p-1.5 rounded bg-[#141414] hover:bg-[#1a1a1a] border border-[#222222] hover:border-[#c5a880] text-[#d4d4d8] text-left transition cursor-pointer truncate"
                >
                  Archival Monograph
                </button>
                <button
                  type="button"
                  disabled={quickAiLoading}
                  onClick={() => handleQuickToneRegenerate('poetic')}
                  className="p-1.5 rounded bg-[#141414] hover:bg-[#1a1a1a] border border-[#222222] hover:border-[#c5a880] text-[#d4d4d8] text-left transition cursor-pointer truncate"
                >
                  Poetic Chiaroscuro
                </button>
                <button
                  type="button"
                  disabled={quickAiLoading}
                  onClick={() => handleQuickToneRegenerate('minimal')}
                  className="p-1.5 rounded bg-[#141414] hover:bg-[#1a1a1a] border border-[#222222] hover:border-[#c5a880] text-[#d4d4d8] text-left transition cursor-pointer truncate"
                >
                  Minimal Modern
                </button>
                <button
                  type="button"
                  disabled={quickAiLoading}
                  onClick={() => handleQuickToneRegenerate('couture')}
                  className="p-1.5 rounded bg-[#141414] hover:bg-[#1a1a1a] border border-[#222222] hover:border-[#c5a880] text-[#d4d4d8] text-left transition cursor-pointer truncate"
                >
                  Haute Couture
                </button>
              </div>
            </div>

            {/* Inline Editable or Displayed Caption & Hashtags */}
            {inlineEditMode ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#8e8d8a] mb-1">
                    Editorial Caption
                  </label>
                  <textarea
                    rows={5}
                    value={inlineCaption}
                    onChange={(e) => setInlineCaption(e.target.value)}
                    className="w-full p-2.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs font-mono text-[#f4f3ef] focus:outline-none focus:border-[#c5a880]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#8e8d8a] mb-1">
                    Hashtags (space separated)
                  </label>
                  <input
                    type="text"
                    value={inlineHashtags}
                    onChange={(e) => setInlineHashtags(e.target.value)}
                    className="w-full p-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs font-mono text-[#c5a880] focus:outline-none focus:border-[#c5a880]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveInlineCaption}
                  className="w-full py-2 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] font-mono text-xs uppercase tracking-wider font-semibold rounded transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Caption Changes</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#0a0a0a] rounded border border-[#1e1e1e] text-xs font-mono text-[#a1a1aa] whitespace-pre-line max-h-48 overflow-y-auto leading-relaxed break-words">
                {selectedPost.caption}
                {'\n\n'}
                {selectedPost.hashtags.join(' ')}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-[#71717a] font-mono pt-1">
              <span>{selectedPost.caption.length} chars</span>
              <span>{selectedPost.hashtags.length} hashtags</span>
            </div>
          </div>

          {/* Rights Verification Record Panel (Informational Advisory) */}
          <div className="p-4 sm:p-5 bg-[#121212] border border-[#222222] rounded space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] uppercase tracking-wider text-[#71717a] font-mono">
                Rights Status (Informational)
              </span>
              {selectedPost.rightsStatus === 'verified' ? (
                <span className="inline-flex items-center gap-1 text-xs text-[#7cd38b] font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Rights
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-[#c5a880] font-mono">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {selectedPost.rightsStatus.toUpperCase()} (Publishing Unlocked)
                </span>
              )}
            </div>

            <div className="text-xs font-mono space-y-2 text-[#a1a1aa] pt-2 border-t border-[#1e1e1e] break-words">
              <div>
                <span className="text-[#71717a] block text-[10px]">License Framework:</span>
                <span className="text-[#f4f3ef]">{selectedPost.rightsVerificationRecord.sourceLicense}</span>
              </div>
              <div>
                <span className="text-[#71717a] block text-[10px]">Curatorial Policy:</span>
                <span className="text-[#d4d4d8] text-[11px] font-sans">
                  Rights status is displayed for reference only. Full scheduling and Instagram publishing are unlocked for all packages.
                </span>
              </div>
            </div>

            {onPostAction && (
              <div className="pt-2 flex flex-wrap items-center gap-2">
                {selectedPost.rightsStatus !== 'verified' && (
                  <button
                    type="button"
                    onClick={() => onPostAction(selectedPost.id, 'verify_rights')}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#242424] border border-[#333333] rounded text-xs font-mono text-[#7cd38b] cursor-pointer flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Mark Rights Verified</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onPostAction(selectedPost.id, 'publish_now')}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-1.5 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] rounded text-xs font-mono font-semibold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish Now</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
