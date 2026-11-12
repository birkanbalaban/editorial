import React, { useState, useEffect } from 'react';
import { AiAgentConfig, OperationMode, SystemSettings, InstagramAccountConfig } from '../types/editorial';
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
  Terminal
} from 'lucide-react';

import { InstagramCredentialsCard } from './InstagramCredentialsCard';

interface SettingsViewProps {
  settings: SystemSettings;
  instagram: InstagramAccountConfig;
  aiConfig?: AiAgentConfig;
  geminiConnected?: boolean;
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

  useEffect(() => {
    if (aiConfig) {
      setDiscoveryPrompt(aiConfig.discoveryPersonaPrompt);
      setAuditorPrompt(aiConfig.auditorPersonaPrompt);
      setMinScore(aiConfig.minApprovalScore);
      setBatchSize(aiConfig.defaultBatchSize);
      setDefaultTone(aiConfig.defaultCaptionTone);
    }
  }, [aiConfig]);

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
