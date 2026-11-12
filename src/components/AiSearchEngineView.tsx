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
  Calendar,
  Send,
  Edit3,
  Bookmark,
  Bot,
  Sliders,
  RefreshCw,
  Layers
} from 'lucide-react';

interface AiSearchEngineViewProps {
  posts: EditorialPost[];
  aiConfig: AiAgentConfig;
  onUpdateAiConfig: (updates: Partial<AiAgentConfig>) => Promise<void>;
  onDiscoverBatch: (params: { query?: string; topics?: string[]; count?: number }) => Promise<void>;
  onAuditAll: (autoApprove?: boolean) => Promise<void>;
  onPostAction: (postId: string, action: string, payload?: any) => Promise<void>;
  onOpenCaptionEditor: (post: EditorialPost) => void;
  onNavigateToSettings: () => void;
  isProcessing?: boolean;
}

const QUICK_SEARCH_PROMPTS = [
  '90s Steven Meisel grunge chiaroscuro portraiture for Vogue Italia',
  'Paolo Roversi 8x10 Polaroid tungsten light haute couture drapery',
  'Brutalist concrete architecture with sharp Saint Laurent monochrome tailoring',
  'Avant-garde Japanese deconstructed silhouettes by Yohji Yamamoto & Comme des Garçons',
];

export const AiSearchEngineView: React.FC<AiSearchEngineViewProps> = ({
  posts,
  aiConfig,
  onUpdateAiConfig,
  onDiscoverBatch,
  onAuditAll,
  onPostAction,
  onOpenCaptionEditor,
  onNavigateToSettings,
  isProcessing,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [batchSize, setBatchSize] = useState<number>(aiConfig.defaultBatchSize || 2);
  const [newTopicInput, setNewTopicInput] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'recommended' | 'approved'>('all');
  const [streamCountdown, setStreamCountdown] = useState<number>(45);

  useEffect(() => {
    setBatchSize(aiConfig.defaultBatchSize || 2);
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
            onDiscoverBatch({
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
    await onDiscoverBatch({
      query: searchQuery.trim() || undefined,
      topics: aiConfig.activeTopics,
      count: batchSize,
    });
  };

  const filteredPosts = posts.filter((post) => {
    if (post.status === 'rejected') return false;
    if (filterMode === 'recommended') {
      return post.score.overall >= aiConfig.minApprovalScore;
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
          Verified Rights
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#facc15]">
          <Clock className="w-3.5 h-3.5" />
          Rights Pending (Advisory)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[#c5a880]">
        <ShieldAlert className="w-3.5 h-3.5" />
        Reference Rights (Unlocked)
      </span>
    );
  };

  return (
    <div className="space-y-8 w-full max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>Dual-Agent Intelligence</span>
            <span>·</span>
            <span>Agent 1 Discovery + Agent 2 Auditor</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Autonomous AI Editorial Search Engine
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Select autonomous curatorial topics or query the archive in natural language. Agent 1 discovers and synthesizes editorial monographs while Agent 2 audits quality and auto-approves qualified works.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
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

      {/* 1. NATURAL LANGUAGE AI SEARCH & AUTONOMOUS TOPIC MATRIX */}
      <div className="p-5 sm:p-6 bg-[#121212] border border-[#222222] rounded space-y-6">
        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-mono uppercase tracking-wider text-[#c5a880] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span>Natural-Language Editorial Discovery Prompt (Agent 1)</span>
            </label>
            <span className="text-[11px] font-mono text-[#8e8d8a]">
              Leave blank to sweep selected autonomous topics below
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search photographer, era, lighting mood, fashion house, or magazine (e.g. '90s Helmut Newton architectural monoliths')..."
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
                <span className="text-[11px] font-mono text-[#8e8d8a] uppercase">Batch:</span>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="bg-transparent text-xs font-mono text-[#f4f3ef] focus:outline-none cursor-pointer"
                >
                  <option value={1} className="bg-[#121212]">1 Editorial</option>
                  <option value={2} className="bg-[#121212]">2 Editorials</option>
                  <option value={3} className="bg-[#121212]">3 Editorials</option>
                  <option value={4} className="bg-[#121212]">4 Editorials</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="px-5 py-3 bg-[#c5a880] hover:bg-[#d4b992] disabled:opacity-50 text-[#0a0a0a] font-mono text-xs uppercase tracking-wider font-semibold rounded transition cursor-pointer flex items-center gap-2"
              >
                <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Agent 1 & 2 Running...' : 'Discover & Curate Now'}</span>
              </button>
            </div>
          </div>

          {/* Quick Prompt Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono uppercase text-[#71717a] mr-1">
              Quick Prompts:
            </span>
            {QUICK_SEARCH_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setSearchQuery(prompt)}
                className="px-2.5 py-1 bg-[#181818] hover:bg-[#222222] border border-[#262626] rounded text-[11px] font-sans text-[#a1a1aa] hover:text-[#f4f3ef] transition cursor-pointer truncate max-w-xs"
              >
                {prompt}
              </button>
            ))}
          </div>
        </form>

        {/* Autonomous Topics Matrix */}
        <div className="pt-4 border-t border-[#1e1e1e] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#f4f3ef]">
                Autonomous Discovery Topics ({aiConfig.activeTopics.length} Active)
              </h3>
              <p className="text-[11px] text-[#8e8d8a] font-sans">
                Click topics to toggle them in Agent 1's continuous discovery stream, or add your own custom curatorial themes.
              </p>
            </div>

            {/* Add Custom Topic Form */}
            <form onSubmit={handleAddCustomTopic} className="flex items-center gap-1.5">
              <input
                type="text"
                value={newTopicInput}
                onChange={(e) => setNewTopicInput(e.target.value)}
                placeholder="Add new topic (e.g. '70s Guy Bourdin')..."
                className="px-3 py-1.5 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-[#1e1c18] hover:bg-[#28241d] border border-[#c5a880]/40 rounded text-xs font-mono text-[#c5a880] cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Topic</span>
              </button>
            </form>
          </div>

          <div className="flex flex-wrap gap-2">
            {aiConfig.availableTopics.map((topic) => {
              const isActive = aiConfig.activeTopics.includes(topic);
              return (
                <div
                  key={topic}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-mono transition ${
                    isActive
                      ? 'bg-[#1e1c18] border-[#c5a880] text-[#f4f3ef]'
                      : 'bg-[#161616] border-[#262626] text-[#8e8d8a] hover:text-[#d4d4d8]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleTopic(topic)}
                    className="flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#c5a880]' : 'bg-[#3f3f46]'}`} />
                    <span>{topic}</span>
                  </button>
                  {aiConfig.availableTopics.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTopic(topic)}
                      className="text-[#71717a] hover:text-[#f87171] ml-1 cursor-pointer"
                      title="Remove topic"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Agent 2 Auditor Status Bar */}
        <div className="pt-4 border-t border-[#1e1e1e] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#161513] p-3.5 rounded border border-[#c5a880]/20">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-[#c5a880] shrink-0" />
            <div className="text-xs">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[#f4f3ef]">
                <span>AGENT 2 (AUDITOR & AUTO-APPROVAL ENGINE)</span>
                <span>·</span>
                <span className="text-[#c5a880]">Threshold: ≥{aiConfig.minApprovalScore}/100</span>
                <span>·</span>
                <span className={aiConfig.autoApproveEnabled ? 'text-[#a3e635]' : 'text-[#8e8d8a]'}>
                  {aiConfig.autoApproveEnabled ? 'Auto-Approval ON' : 'Manual Sign-Off Mode'}
                </span>
              </div>
              <p className="text-[11px] text-[#8e8d8a] font-sans mt-0.5">
                Agent 2 audits every discovered editorial and attaches a quality verdict. Toggle Auto-Approval to automatically promote ≥{aiConfig.minApprovalScore} works to Approved.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onUpdateAiConfig({ autoApproveEnabled: !aiConfig.autoApproveEnabled })}
              className={`px-3 py-1.5 rounded border text-xs font-mono transition cursor-pointer ${
                aiConfig.autoApproveEnabled
                  ? 'bg-[#1a2618] border-[#a3e635] text-[#a3e635]'
                  : 'bg-[#1c1c1c] border-[#333333] text-[#d4d4d8]'
              }`}
            >
              {aiConfig.autoApproveEnabled ? 'Auto-Approve: ON' : 'Auto-Approve: OFF'}
            </button>

            <button
              type="button"
              onClick={() => onAuditAll(true)}
              disabled={isProcessing}
              className="px-3 py-1.5 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] rounded text-xs font-mono font-semibold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Audit & Auto-Approve Qualified</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. DISCOVERY FEED FILTER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121212] rounded border border-[#222222]">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'all' ? 'bg-[#222222] text-[#f4f3ef]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            All Discovered ({posts.filter(p => p.status !== 'rejected').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('recommended')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'recommended' ? 'bg-[#222222] text-[#c5a880]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            Agent 2 Qualified ≥{aiConfig.minApprovalScore} ({posts.filter(p => p.status !== 'rejected' && p.score.overall >= aiConfig.minApprovalScore).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('approved')}
            className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer ${
              filterMode === 'approved' ? 'bg-[#222222] text-[#a3e635]' : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
            }`}
          >
            Approved / Scheduled ({posts.filter(p => p.status === 'approved' || p.status === 'scheduled').length})
          </button>
        </div>

        <div className="text-xs font-mono text-[#8e8d8a]">
          Rights Status: Advisory Only · Full Publishing Unlocked
        </div>
      </div>

      {/* 3. DISCOVERED EDITORIALS STREAM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPosts.map((post) => {
          const passesThreshold = post.score.overall >= aiConfig.minApprovalScore;
          return (
            <article
              key={post.id}
              className="bg-[#121212] border border-[#222222] hover:border-[#333333] rounded overflow-hidden flex flex-col justify-between transition"
            >
              <div>
                {/* Top Image & Overlay */}
                <div className="relative aspect-[4/3] bg-[#0a0a0a] overflow-hidden border-b border-[#222222]">
                  {post.imageUrls && post.imageUrls[0] ? (
                    <img
                      src={post.imageUrls[0]}
                      alt={post.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#71717a]">
                      Editorial Preview
                    </div>
                  )}

                  <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="bg-[#0a0a0a]/85 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626] text-xs font-mono font-semibold text-[#f4f3ef]">
                      SCORE {post.score.overall}/100
                    </span>
                    <div className="bg-[#0a0a0a]/85 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626]">
                      {renderRightsBadge(post.rightsStatus)}
                    </div>
                  </div>

                  {post.discoveryTopic && (
                    <div className="absolute bottom-3 left-3 bg-[#0a0a0a]/85 backdrop-blur-md px-2.5 py-1 rounded border border-[#c5a880]/40 text-[10px] font-mono text-[#c5a880] uppercase">
                      Topic: {post.discoveryTopic}
                    </div>
                  )}

                  <div className="absolute bottom-3 right-3 bg-[#0a0a0a]/85 backdrop-blur-md px-2.5 py-1 rounded border border-[#262626] text-[10px] font-mono uppercase text-[#f4f3ef]">
                    {post.status}
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#8e8d8a]">
                    <span className="text-[#c5a880] uppercase">{post.publication}</span>
                    <span>·</span>
                    <span>{post.photographer}</span>
                    <span>·</span>
                    <span>{post.publicationDate}</span>
                  </div>

                  <h2 className="font-editorial text-2xl text-[#f4f3ef] font-normal leading-snug">
                    {post.title}
                  </h2>

                  <p className="text-xs text-[#a1a1aa] leading-relaxed">
                    {post.creativeDirection}
                  </p>

                  {/* Agent 2 Auditor Report Box */}
                  <div className="p-3 bg-[#161513] border border-[#2a2620] rounded space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                      <span className="text-[#c5a880] flex items-center gap-1">
                        <Bot className="w-3 h-3" />
                        Agent 2 Auditor Verdict
                      </span>
                      <span className={passesThreshold ? 'text-[#a3e635]' : 'text-[#facc15]'}>
                        {post.aiAuditReport?.verdict === 'approved_by_ai'
                          ? 'AUTO-APPROVED BY AI'
                          : passesThreshold
                          ? 'RECOMMENDED FOR APPROVAL'
                          : 'BELOW SCORE THRESHOLD'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#d4d4d8] font-sans leading-relaxed">
                      {post.aiAuditReport?.auditorNotes ||
                        `Scored ${post.score.overall}/100 across 5 curatorial dimensions. "${post.score.rationale}"`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Actions (All Unlocked Regardless of Rights Status) */}
              <div className="p-5 pt-3 border-t border-[#1e1e1e] flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPostAction(post.id, 'schedule', { scheduledTime: '14:00' })}
                    disabled={isProcessing}
                    className="px-3.5 py-1.5 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Approve & Schedule</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onPostAction(post.id, 'publish_now')}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-[#1a1a1a] border border-[#333333] hover:border-[#c5a880] text-[#f4f3ef] text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3 text-[#c5a880]" />
                    <span>Publish Now</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  {post.rightsStatus !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => onPostAction(post.id, 'verify_rights')}
                      disabled={isProcessing}
                      className="px-2.5 py-1.5 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded text-[10px] font-mono text-[#a3e635] cursor-pointer"
                      title="Mark Rights as Verified"
                    >
                      Verify Rights
                    </button>
                  )}

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
