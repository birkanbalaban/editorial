import React, { useState, useEffect } from 'react';
import { AiAgentConfig, OperationMode, SystemSettings, InstagramAccountConfig, RssFeedConfig } from '../types/editorial';
import { 
  Shield, 
  Zap, 
  CheckCircle2, 
  AlertOctagon, 
  Lock, 
  Bell, 
  Globe,
  BookOpen,
  Bot,
  Sparkles,
  Save,
  Check,
  RefreshCw,
  Terminal,
  Rss,
  Plus,
  Trash2,
  FlaskConical,
  Filter
} from 'lucide-react';

import { InstagramCredentialsCard } from './InstagramCredentialsCard';

interface SettingsViewProps {
  settings: SystemSettings;
  instagram: InstagramAccountConfig;
  aiConfig?: AiAgentConfig;
  geminiConnected?: boolean;
  rssFeeds?: RssFeedConfig[];
  excludedKeywords?: string[];
  onAddRssFeed?: (feed: { name: string; rssUrl: string; handle: string; defaultCategory: string }) => Promise<void>;
  onToggleRssFeed?: (feedId: string, enabled: boolean) => Promise<void>;
  onDeleteRssFeed?: (feedId: string) => Promise<void>;
  onUpdateExcludedKeywords?: (keywords: string[]) => Promise<void>;
  onUpdateSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  onUpdateAiConfig?: (updates: Partial<AiAgentConfig>) => Promise<void>;
  onTestAiPipeline?: () => Promise<void>;
  onTriggerAutopilotModal: () => void;
  onOpenAgentGuide?: () => void;
  onConnectInstagram?: (params: { accessToken?: string; accountId?: string; mockConnected?: boolean }) => Promise<void>;
  onDisconnectInstagram?: () => Promise<void>;
  isProcessing?: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  instagram,
  aiConfig,
  geminiConnected,
  rssFeeds = [],
  excludedKeywords = [],
  onAddRssFeed,
  onToggleRssFeed,
  onDeleteRssFeed,
  onUpdateExcludedKeywords,
  onUpdateSettings,
  onUpdateAiConfig,
  onTestAiPipeline,
  onTriggerAutopilotModal,
  onOpenAgentGuide,
  onConnectInstagram,
  onDisconnectInstagram,
  isProcessing,
}) => {
  const [discoveryPrompt, setDiscoveryPrompt] = useState(aiConfig?.discoveryPersonaPrompt || '');
  const [auditorPrompt, setAuditorPrompt] = useState(aiConfig?.auditorPersonaPrompt || '');
  const [minScore, setMinScore] = useState(aiConfig?.minApprovalScore ?? 89);
  const [batchSize, setBatchSize] = useState(aiConfig?.defaultBatchSize ?? 2);
  const [defaultTone, setDefaultTone] = useState<AiAgentConfig['defaultCaptionTone']>(
    aiConfig?.defaultCaptionTone || 'archival'
  );
  const [savedToast, setSavedToast] = useState(false);

  // RSS Feed Management State
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedHandle, setNewFeedHandle] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('Fashion Editorial');
  const [testingFeedId, setTestingFeedId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    feedLabel: string;
    ok: boolean;
    itemCount: number;
    sampleItems: { title: string; link: string; author: string; pubDate: string }[];
    error?: string;
  } | null>(null);
  const [keywordsText, setKeywordsText] = useState(excludedKeywords.join(', '));

  useEffect(() => {
    setKeywordsText(excludedKeywords.join(', '));
  }, [excludedKeywords]);

  useEffect(() => {
    if (aiConfig) {
      setDiscoveryPrompt(aiConfig.discoveryPersonaPrompt);
      setAuditorPrompt(aiConfig.auditorPersonaPrompt);
      setMinScore(aiConfig.minApprovalScore);
      setBatchSize(aiConfig.defaultBatchSize);
      setDefaultTone(aiConfig.defaultCaptionTone);
    }
  }, [aiConfig]);

  const handleTestRssUrl = async (rssUrl: string, feedLabel: string, idKey: string) => {
    if (!rssUrl.trim()) return;
    setTestingFeedId(idKey);
    try {
      const res = await fetch('/api/rss/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rssUrl: rssUrl.trim() }),
      });
      const data = await res.json();
      setTestResult({
        feedLabel,
        ok: Boolean(data.ok),
        itemCount: data.itemCount || 0,
        sampleItems: data.sampleItems || [],
        error: data.error,
      });
    } catch (e: any) {
      setTestResult({
        feedLabel,
        ok: false,
        itemCount: 0,
        sampleItems: [],
        error: e?.message || 'Test request failed.',
      });
    } finally {
      setTestingFeedId(null);
    }
  };

  const handleCreateRssFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddRssFeed || !newFeedName.trim() || !newFeedUrl.trim()) return;
    await onAddRssFeed({
      name: newFeedName.trim(),
      rssUrl: newFeedUrl.trim(),
      handle: newFeedHandle.trim() || `@${newFeedName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      defaultCategory: newFeedCategory.trim() || 'Fashion Editorial',
    });
    setNewFeedName('');
    setNewFeedUrl('');
    setNewFeedHandle('');
  };

  const handleSaveKeywords = async () => {
    if (!onUpdateExcludedKeywords) return;
    const list = keywordsText
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    await onUpdateExcludedKeywords(list);
  };

  const handleSaveAiStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateAiConfig) return;
    await onUpdateAiConfig({
      discoveryPersonaPrompt: discoveryPrompt,
      auditorPersonaPrompt: auditorPrompt,
      minApprovalScore: minScore,
      defaultBatchSize: batchSize,
      defaultCaptionTone: defaultTone,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  const handleModeChange = (targetMode: OperationMode) => {
    if (targetMode === 'AUTOPILOT') {
      onTriggerAutopilotModal();
    } else {
      onUpdateSettings({ mode: targetMode });
    }
  };

  const modes: { id: OperationMode; name: string; tag: string; description: string; icon: any }[] = [
    {
      id: 'MANUAL',
      name: 'MODE A — MANUAL',
      tag: 'Full Manual Discretion',
      description: 'AI discovers and scores editorial photography. You manually select works, craft captions, and explicitly trigger all publications.',
      icon: Shield,
    },
    {
      id: 'APPROVAL',
      name: 'MODE B — APPROVAL (DEFAULT)',
      tag: 'Recommended Editorial Workflow',
      description: 'AI researches daily, ranks top 5 works, and prepares complete Instagram drafts. Posts publish automatically at scheduled times after your or Agent 2 sign-off.',
      icon: CheckCircle2,
    },
    {
      id: 'AUTOPILOT',
      name: 'MODE C — AUTOPILOT',
      tag: 'Autonomous Scheduled Publishing',
      description: 'AI discovers, scores, prepares, schedules, and publishes works autonomously up to your daily post limit. Requires connected Instagram Professional account.',
      icon: Zap,
    },
  ];

  return (
    <div className="space-y-10 w-full max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-[#222222] pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
            <span>System Governance</span>
            <span>·</span>
            <span>Dual-Agent AI Studio & Operations</span>
          </div>
          <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
            Settings, AI Agents & Operating Modes
          </h1>
          <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
            Customize Agent 1 (Discovery AI) and Agent 2 (Auditor AI) prompts and thresholds, manage Instagram credentials, and control operating modes from a single dashboard.
          </p>
        </div>

        {onOpenAgentGuide && (
          <div className="shrink-0">
            <button
              onClick={onOpenAgentGuide}
              className="flex items-center gap-2 px-4 py-2 bg-[#181818] hover:bg-[#222222] border border-[#c5a880]/50 hover:border-[#c5a880] rounded text-xs font-mono text-[#c5a880] transition cursor-pointer shadow-lg"
            >
              <BookOpen className="w-4 h-4 text-[#c5a880]" />
              <span className="font-semibold">Open Agent Integration Guide</span>
            </button>
          </div>
        )}
      </div>

      {/* 1. AI ENGINE & DUAL-AGENT CUSTOMIZATION STUDIO */}
      {aiConfig && onUpdateAiConfig && (
        <div className="p-5 sm:p-6 bg-[#121212] border border-[#c5a880]/40 rounded space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#222222] pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#c5a880]">
                <Bot className="w-4 h-4 text-[#c5a880]" />
                <span>Centralized AI Engine & Dual-Agent Studio</span>
                <span>·</span>
                <span className={geminiConnected ? 'text-[#a3e635]' : 'text-[#c5a880]'}>
                  {geminiConnected ? '● Live Gemini 3.8 Flash Connected' : '● Dual-Layer Autonomous Engine Active'}
                </span>
              </div>
              <h2 className="font-editorial text-2xl text-[#f4f3ef]">
                Customize Agent 1 (Discovery AI) & Agent 2 (Auditor AI)
              </h2>
              <p className="text-xs text-[#8e8d8a] max-w-3xl font-sans">
                All AI features across the platform (AI Search Engine, Approval Queue Auditor, and Post Packages Copywriting Studio) read directly from these instructions and thresholds.
              </p>
            </div>

            {onTestAiPipeline && (
              <button
                type="button"
                onClick={onTestAiPipeline}
                disabled={isProcessing}
                className="px-4 py-2 bg-[#1e1c18] hover:bg-[#28241d] border border-[#c5a880] rounded text-xs font-mono text-[#c5a880] transition cursor-pointer flex items-center gap-2 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>Test Dual-Agent Sweep Now</span>
              </button>
            )}
          </div>

          <form onSubmit={handleSaveAiStudio} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AGENT 1: DISCOVERY & RESEARCH AI */}
              <div className="p-4 bg-[#161616] border border-[#262626] rounded space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#c5a880] font-semibold">
                    Agent 1 · Discovery & Research AI
                  </span>
                  <span className="text-[11px] font-mono text-[#8e8d8a]">
                    Finds & Synthesizes Editorials
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8e8d8a] mb-1.5">
                    Agent 1 System Persona & Curatorial Directive
                  </label>
                  <textarea
                    rows={4}
                    value={discoveryPrompt}
                    onChange={(e) => setDiscoveryPrompt(e.target.value)}
                    className="w-full p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs font-mono text-[#f4f3ef] focus:outline-none focus:border-[#c5a880] leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#8e8d8a] mb-1">
                      Default Discovery Batch Size
                    </label>
                    <select
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs font-mono text-[#f4f3ef] focus:outline-none focus:border-[#c5a880]"
                    >
                      <option value={1}>1 Editorial per Sweep</option>
                      <option value={2}>2 Editorials per Sweep</option>
                      <option value={3}>3 Editorials per Sweep</option>
                      <option value={4}>4 Editorials per Sweep</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#8e8d8a] mb-1">
                      Continuous Auto-Stream
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateAiConfig({ autonomousStreamEnabled: !aiConfig.autonomousStreamEnabled })
                      }
                      className={`w-full px-3 py-2 rounded border text-xs font-mono transition cursor-pointer ${
                        aiConfig.autonomousStreamEnabled
                          ? 'bg-[#1a2618] border-[#a3e635] text-[#a3e635]'
                          : 'bg-[#0a0a0a] border-[#2a2a2a] text-[#8e8d8a]'
                      }`}
                    >
                      {aiConfig.autonomousStreamEnabled ? 'Active (Background Feed)' : 'Off (Manual Trigger)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* AGENT 2: CURATOR & AUDITOR AI */}
              <div className="p-4 bg-[#161616] border border-[#262626] rounded space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#c5a880] font-semibold">
                    Agent 2 · Chief Curator & Auditor AI
                  </span>
                  <span className="text-[11px] font-mono text-[#8e8d8a]">
                    Audits & Auto-Approves
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-[#8e8d8a] mb-1.5">
                    Agent 2 Auditor Persona & Quality Standards
                  </label>
                  <textarea
                    rows={4}
                    value={auditorPrompt}
                    onChange={(e) => setAuditorPrompt(e.target.value)}
                    className="w-full p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded text-xs font-mono text-[#f4f3ef] focus:outline-none focus:border-[#c5a880] leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase text-[#8e8d8a] mb-1">
                      <span>Min Score Threshold</span>
                      <span className="text-[#c5a880] font-bold">{minScore}/100</span>
                    </div>
                    <input
                      type="range"
                      min={75}
                      max={98}
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                      className="w-full accent-[#c5a880] cursor-pointer mt-1"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase text-[#8e8d8a] mb-1">
                      Agent 2 Auto-Approve (≥{minScore})
                    </label>
                    <button
                      type="button"
                      onClick={() => onUpdateAiConfig({ autoApproveEnabled: !aiConfig.autoApproveEnabled })}
                      className={`w-full px-3 py-2 rounded border text-xs font-mono transition cursor-pointer ${
                        aiConfig.autoApproveEnabled
                          ? 'bg-[#1a2618] border-[#a3e635] text-[#a3e635]'
                          : 'bg-[#0a0a0a] border-[#2a2a2a] text-[#8e8d8a]'
                      }`}
                    >
                      {aiConfig.autoApproveEnabled ? 'Enabled (Auto Sign-Off)' : 'Disabled (Advisory Only)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Copywriting Tone Default & Save Bar */}
            <div className="p-4 bg-[#161616] border border-[#262626] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-mono uppercase text-[#8e8d8a] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#c5a880]" />
                  <span>Default AI Copywriting Tone:</span>
                </span>
                {(['archival', 'poetic', 'minimal', 'couture'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDefaultTone(t)}
                    className={`px-3 py-1 rounded text-xs font-mono uppercase transition cursor-pointer ${
                      defaultTone === t
                        ? 'bg-[#c5a880] text-[#0a0a0a] font-semibold'
                        : 'bg-[#0a0a0a] border border-[#2a2a2a] text-[#a1a1aa]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {savedToast && (
                  <span className="text-xs font-mono text-[#a3e635] flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    AI Studio Config Saved
                  </span>
                )}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] font-mono text-xs uppercase tracking-wider font-semibold rounded transition cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save AI Agent Configuration</span>
                </button>
              </div>
            </div>

            {/* Portable Setup Note for Friends / External Servers */}
            <div className="p-3.5 bg-[#0e0e0e] border border-[#222222] rounded flex items-start gap-3 text-xs font-mono text-[#8e8d8a]">
              <Terminal className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-[#f4f3ef]">
                  Portable Deployment & Team Sharing Ready:
                </div>
                <p className="text-[11px] font-sans text-[#a1a1aa]">
                  When sharing this app or running on any server, set <code className="text-[#c5a880]">GEMINI_API_KEY</code> in the server <code className="text-[#c5a880]">.env</code> file for live Gemini 3.8 Flash generation. Even without a key configured, the built-in Dual-Agent Curatorial Engine guarantees 100% uptime for discovery, auditing, and multi-tone copywriting.
                </p>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 1b. DYNAMIC RSS FEEDS & SOURCE MANAGEMENT */}
      {onAddRssFeed && (
        <div className="p-5 sm:p-6 bg-[#121212] border border-[#262626] rounded space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#c5a880]">
                <Rss className="w-4 h-4 text-[#c5a880]" />
                <span>RSS Feed & Magazine Source Control</span>
              </div>
              <h2 className="font-editorial text-2xl text-[#f4f3ef]">
                Manage Live Editorial Feeds & Exclusion Filters
              </h2>
              <p className="text-xs text-[#8e8d8a] max-w-3xl font-sans">
                Enable, disable, test, or add new fashion magazine/blog RSS feeds. Agent 1 reads exclusively from active sources listed below.
              </p>
            </div>
            <span className="text-xs font-mono text-[#a3e635] shrink-0">
              {rssFeeds.filter((f) => f.enabled).length} / {rssFeeds.length} Feeds Active
            </span>
          </div>

          {/* Add New RSS Source Form */}
          <form onSubmit={handleCreateRssFeed} className="p-4 bg-[#161616] border border-[#262626] rounded space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#f4f3ef]">
              Add New Magazine or Blog RSS Feed
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                required
                placeholder="Publication Name (e.g. AnOther)"
                value={newFeedName}
                onChange={(e) => setNewFeedName(e.target.value)}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
              />
              <input
                type="url"
                required
                placeholder="https://www.anothermag.com/feed"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                className="md:col-span-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
              />
              <input
                type="text"
                placeholder="@handle (optional)"
                value={newFeedHandle}
                onChange={(e) => setNewFeedHandle(e.target.value)}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <input
                type="text"
                placeholder="Default Category (e.g. Avant-Garde Editorial)"
                value={newFeedCategory}
                onChange={(e) => setNewFeedCategory(e.target.value)}
                className="w-full sm:w-72 bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!newFeedUrl.trim() || testingFeedId !== null}
                  onClick={() => handleTestRssUrl(newFeedUrl, newFeedName || 'New RSS Feed', 'NEW_FEED')}
                  className="px-3.5 py-2 bg-[#1e1e1e] hover:bg-[#282828] border border-[#333333] text-xs font-mono text-[#d4d4d8] rounded transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-[#c5a880]" />
                  <span>{testingFeedId === 'NEW_FEED' ? 'Testing...' : 'Test Feed URL'}</span>
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#c5a880] hover:bg-[#d4b992] text-[#0a0a0a] text-xs font-mono font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add RSS Feed</span>
                </button>
              </div>
            </div>
          </form>

          {/* Live RSS Test Preview Box */}
          {testResult && (
            <div
              className={`p-4 rounded border space-y-2 text-xs font-mono ${
                testResult.ok
                  ? 'bg-[#131d13] border-[#264226] text-[#d4d4d8]'
                  : 'bg-[#261414] border-[#4d2222] text-[#fca5a5]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  Test Result for "{testResult.feedLabel}":{' '}
                  {testResult.ok
                    ? `OK (${testResult.itemCount} articles parsed)`
                    : testResult.error || 'Failed'}
                </span>
                <button
                  type="button"
                  onClick={() => setTestResult(null)}
                  className="text-[#8e8d8a] hover:text-white cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              {testResult.sampleItems.length > 0 && (
                <ul className="space-y-1 text-[11px] text-[#a1a1aa] pt-1 border-t border-[#222222]">
                  {testResult.sampleItems.map((it, idx) => (
                    <li key={idx} className="truncate">
                      • [{it.pubDate}] {it.title} ({it.author})
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Configured RSS Feeds List */}
          <div className="bg-[#0e0e0e] border border-[#222222] rounded divide-y divide-[#1e1e1e] overflow-hidden">
            {rssFeeds.map((feed) => (
              <div
                key={feed.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#151515] transition text-xs font-mono"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[#f4f3ef] font-semibold">{feed.name}</span>
                    <span className="text-[#c5a880] text-[11px]">{feed.handle}</span>
                    <span className="text-[#71717a] text-[11px]">· {feed.defaultCategory}</span>
                  </div>
                  <div className="text-[11px] text-[#71717a] truncate">{feed.rssUrl}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTestRssUrl(feed.rssUrl, feed.name, feed.id)}
                    disabled={testingFeedId !== null}
                    className="px-2.5 py-1.5 bg-[#1a1a1a] hover:bg-[#242424] border border-[#2e2e2e] text-[#d4d4d8] rounded text-[11px] cursor-pointer flex items-center gap-1"
                  >
                    <FlaskConical className="w-3 h-3 text-[#c5a880]" />
                    <span>{testingFeedId === feed.id ? 'Testing...' : 'Test'}</span>
                  </button>

                  {onToggleRssFeed && (
                    <button
                      type="button"
                      onClick={() => onToggleRssFeed(feed.id, !feed.enabled)}
                      className={`px-3 py-1.5 rounded text-[11px] uppercase cursor-pointer border transition ${
                        feed.enabled
                          ? 'bg-[#182618] text-[#a3e635] border-[#264226]'
                          : 'bg-[#1a1a1a] text-[#71717a] border-[#2a2a2a]'
                      }`}
                    >
                      {feed.enabled ? 'Active' : 'Paused'}
                    </button>
                  )}

                  {onDeleteRssFeed && (
                    <button
                      type="button"
                      onClick={() => onDeleteRssFeed(feed.id)}
                      title="Remove RSS feed"
                      className="p-1.5 text-[#71717a] hover:text-[#ef4444] rounded hover:bg-[#1f1f1f] transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Commercial / Non-Editorial Exclusion Filter */}
          {onUpdateExcludedKeywords && (
            <div className="p-4 bg-[#161616] border border-[#262626] rounded space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#c5a880]">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Excluded Non-Editorial Keywords (Comma Separated)</span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveKeywords}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] text-[11px] font-mono font-semibold uppercase rounded cursor-pointer"
                >
                  Save Filters
                </button>
              </div>
              <input
                type="text"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="rolex, men's shoes, rimowa, handbags, gift guide..."
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2 text-xs font-mono text-[#f4f3ef] focus:outline-none focus:border-[#c5a880]"
              />
              <p className="text-[11px] text-[#8e8d8a] font-sans">
                Articles containing any of these terms are automatically skipped during live RSS discovery so only true fashion photography series enter your index.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Meta Graph API Credentials & Connected Account */}
      {onConnectInstagram && onDisconnectInstagram && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
              Instagram Professional Credentials & Account Management
            </h2>
            <span className="text-xs font-mono text-[#8e8d8a]">
              Direct In-App Credential Management
            </span>
          </div>
          <InstagramCredentialsCard
            config={instagram}
            onConnect={onConnectInstagram}
            onDisconnect={onDisconnectInstagram}
            isProcessing={isProcessing}
          />
        </div>
      )}

      {/* Operation Mode Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
            Operating Mode Selection
          </h2>
          <span className="text-xs font-mono text-[#c5a880]">Active: {settings.mode}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((m) => {
            const isSelected = settings.mode === m.id;
            const Icon = m.icon;

            return (
              <div
                key={m.id}
                onClick={() => !isProcessing && handleModeChange(m.id)}
                className={`p-6 rounded border cursor-pointer transition flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? 'bg-[#181818] border-[#c5a880] ring-1 ring-[#c5a880]'
                    : 'bg-[#121212] border-[#222222] hover:border-[#333333]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#c5a880]' : 'text-[#8e8d8a]'}`} />
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                      {m.tag}
                    </span>
                  </div>
                  <h3 className="font-editorial text-xl text-[#f4f3ef] font-normal mb-2">
                    {m.name}
                  </h3>
                  <p className="text-xs text-[#8e8d8a] font-sans leading-relaxed">
                    {m.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1e1e1e] flex items-center justify-between">
                  <span className="text-xs font-mono text-[#71717a]">
                    {isSelected ? '● Currently Active' : 'Select Mode'}
                  </span>
                  <div className={`w-3.5 h-3.5 rounded-full border ${isSelected ? 'bg-[#c5a880] border-[#c5a880]' : 'border-[#333333]'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Publishing Quota & Emergency Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f4f3ef]">Maximum Daily Publishing Quota</h3>
            <span className="font-mono text-base font-bold text-[#c5a880]">
              {settings.maxDailyPosts} Posts / Day
            </span>
          </div>
          <p className="text-xs text-[#8e8d8a]">
            Limits autonomous publishing output per 24-hour cycle. The default baseline is 2 posts per day (14:00 & 20:00 slots).
          </p>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={settings.maxDailyPosts}
            onChange={(e) => onUpdateSettings({ maxDailyPosts: parseInt(e.target.value, 10) })}
            className="w-full accent-[#c5a880] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-[#71717a]">
            <span>1 post (Conservative)</span>
            <span>2 posts (Default)</span>
            <span>5 posts (Aggressive)</span>
          </div>
        </div>

        <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[#ef4444] mb-1">
              <AlertOctagon className="w-4 h-4" />
              <h3 className="text-sm font-semibold">Emergency Publishing Stop</h3>
            </div>
            <p className="text-xs text-[#8e8d8a]">
              Instantly kills all automated scheduled execution, autopilot routines, and outgoing Meta API requests.
            </p>
          </div>

          <button
            onClick={() => onUpdateSettings({ emergencyStop: !settings.emergencyStop })}
            className={`w-full py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-2 ${
              settings.emergencyStop
                ? 'bg-[#ef4444] text-white'
                : 'bg-[#221414] border border-[#4d1f1f] text-[#ef4444] hover:bg-[#2e1919]'
            }`}
          >
            <AlertOctagon className="w-4 h-4" />
            <span>{settings.emergencyStop ? 'Emergency Stop Engaged (Click to Reset)' : 'Engage Emergency Stop'}</span>
          </button>
        </div>
      </div>

      {/* Operational Timezone & Notifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-2">
          <div className="flex items-center gap-2 text-[#c5a880]">
            <Globe className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-[#f4f3ef]">Engine Timezone</h3>
          </div>
          <div className="font-mono text-xs text-[#d4d4d8] pt-1">
            Europe/Istanbul (UTC+03:00)
          </div>
          <p className="text-xs text-[#8e8d8a]">
            All automated research (08:00) and default publishing windows (14:00, 20:00) synchronize with this timezone.
          </p>
        </div>

        <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-2">
          <div className="flex items-center gap-2 text-[#c5a880]">
            <Bell className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-[#f4f3ef]">Daily Curation Alerts</h3>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-[#d4d4d8]">In-App Ready Notifications</span>
            <input
              type="checkbox"
              checked={settings.notificationsEnabled}
              onChange={(e) => onUpdateSettings({ notificationsEnabled: e.target.checked })}
              className="accent-[#c5a880] cursor-pointer"
            />
          </div>
          <p className="text-xs text-[#8e8d8a]">
            Alerts editorial staff when daily 10:00 top 5 curation is assembled.
          </p>
        </div>
      </div>

      {/* Safety & Publishing Policy Summary */}
      <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#c5a880]" />
          <h3 className="font-editorial text-xl text-[#f4f3ef]">Publishing Governance & Rights Advisory Policy</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono text-[#a1a1aa] pt-1">
          <div className="p-3 bg-[#181818] rounded border border-[#222222]">
            <span className="text-[#c5a880]">✓ ADVISORY RIGHTS MODE:</span> Rights status is displayed for reference; full approval and publishing are unlocked for all posts.
          </div>
          <div className="p-3 bg-[#181818] rounded border border-[#222222]">
            <span className="text-[#a3e635]">✓ INVARIANT 02:</span> Never exceed configured daily limit ({settings.maxDailyPosts}/day).
          </div>
          <div className="p-3 bg-[#181818] rounded border border-[#222222]">
            <span className="text-[#a3e635]">✓ INVARIANT 03:</span> Never publish duplicate posts.
          </div>
          <div className="p-3 bg-[#181818] rounded border border-[#222222]">
            <span className="text-[#a3e635]">✓ INVARIANT 04:</span> Instant Emergency Stop halts all automated jobs.
          </div>
        </div>
      </div>
    </div>
  );
};
