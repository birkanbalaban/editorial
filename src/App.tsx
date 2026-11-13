import React, { useState, useEffect } from 'react';
import { 
  AiAgentConfig,
  EditorialPost, 
  InstagramAccountConfig, 
  SystemSettings, 
  WorkflowExecutionLog,
  EditorialLearningSignal,
  EditorialEngagementPoint,
  RssFeedConfig
} from './types/editorial';
import { Header } from './components/Header';
import { DailySelectionView } from './components/DailySelectionView';
import { AiSearchEngineView } from './components/AiSearchEngineView';
import { ApprovalQueueView } from './components/ApprovalQueueView';
import { PostPackagesView } from './components/PostPackagesView';
import { AutomationEngineView } from './components/AutomationEngineView';
import { InstagramAdapterView } from './components/InstagramAdapterView';
import { EditorialLearningView } from './components/EditorialLearningView';
import { EditorialEngagementChart } from './components/EditorialEngagementChart';
import { SettingsView } from './components/SettingsView';
import { CaptionEditorModal } from './components/CaptionEditorModal';
import { AiResearchModal, ManualPostSubmissionPayload } from './components/AiResearchModal';
import { AutopilotConfirmModal } from './components/AutopilotConfirmModal';
import { AgentIntegrationModal } from './components/AgentIntegrationModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useLanguage } from './i18n/LanguageContext';

export default function App() {
  const { tx, formatMode } = useLanguage();
  const [currentTab, setCurrentTab] = useState<string>('daily-selection');
  
  // App data state
  const [settings, setSettings] = useState<SystemSettings>({
    mode: 'APPROVAL',
    maxDailyPosts: 2,
    emergencyStop: false,
    timezone: 'Europe/Istanbul',
    notificationsEnabled: true,
    notificationChannel: 'in_app',
    autopilotConfirmed: false,
    schedulePaused: false,
  });

  const [instagram, setInstagram] = useState<InstagramAccountConfig>({
    connected: false,
    accountType: 'NOT_CONNECTED',
    permissions: [],
    auditTrail: [],
  });

  const [aiAgentConfig, setAiAgentConfig] = useState<AiAgentConfig>({
    discoveryPersonaPrompt:
      'You are Agent 1 (Chief Archival Discovery & Research AI) for THE EDITORIAL INDEX. Prioritize high-contrast chiaroscuro lighting, sculptural haute couture silhouettes, brutalist architectural framing, and seminal fashion monographs.',
    activeTopics: [
      'Chiaroscuro Monochromes',
      '90s Minimalist Couture',
      'Sculptural Avant-Garde Tailoring',
      'Brutalist Architectural Framing',
    ],
    availableTopics: [
      'Chiaroscuro Monochromes',
      '90s Minimalist Couture',
      'Sculptural Avant-Garde Tailoring',
      'Brutalist Architectural Framing',
      'Deardorff 8x10 Polaroid Portraiture',
      'Subversive Street Casting & Raw Flash',
      'Paris Haute Couture Atelier Lineage',
      'Silver Gelatin Darkroom Solarization',
    ],
    autonomousStreamEnabled: false,
    defaultBatchSize: 2,
    auditorPersonaPrompt:
      'You are Agent 2 (Chief Curator & Quality Auditor AI). Evaluate each candidate with uncompromising museum-grade standards across composition, lighting tension, styling originality, and narrative weight.',
    minApprovalScore: 89,
    autoApproveEnabled: false,
    defaultCaptionTone: 'archival',
  });

  const [geminiConnected, setGeminiConnected] = useState<boolean>(false);

  const [top5Posts, setTop5Posts] = useState<EditorialPost[]>([]);
  const [candidates, setCandidates] = useState<EditorialPost[]>([]);
  const [allPosts, setAllPosts] = useState<EditorialPost[]>([]);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowExecutionLog[]>([]);
  const [learningSignals, setLearningSignals] = useState<EditorialLearningSignal[]>([]);
  const [engagementPoints, setEngagementPoints] = useState<EditorialEngagementPoint[]>([]);
  const [rssFeeds, setRssFeeds] = useState<RssFeedConfig[]>([]);
  const [excludedKeywords, setExcludedKeywords] = useState<string[]>([]);

  // UI Modals
  const [editingPost, setEditingPost] = useState<EditorialPost | null>(null);
  const [isAiResearchOpen, setIsAiResearchOpen] = useState(false);
  const [isAutopilotModalOpen, setIsAutopilotModalOpen] = useState(false);
  const [isAgentGuideOpen, setIsAgentGuideOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Initial and refresh load
  const loadAllData = async () => {
    try {
      // 1. Status
      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const data = await statusRes.json();
        setSettings(data.settings);
        setInstagram(data.instagram);
        if (data.aiAgentConfig) {
          setAiAgentConfig(data.aiAgentConfig);
        }
        setWorkflowLogs(data.workflowLogs || []);
        if (typeof data.geminiConnected === 'boolean') {
          setGeminiConnected(data.geminiConnected);
        }
      }

      // 2. Selections
      const selRes = await fetch('/api/selections/daily');
      if (selRes.ok) {
        const selData = await selRes.json();
        setTop5Posts(selData.top5 || []);
        setCandidates(selData.candidates || []);
        setAllPosts(selData.all || []);
      }

      // 3. Learning Signals
      const learnRes = await fetch('/api/learning/signals');
      if (learnRes.ok) {
        const learnData = await learnRes.json();
        setLearningSignals(learnData.signals || []);
      }

      // 4. Engagement Analytics
      const analyticsRes = await fetch('/api/analytics/engagement');
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setEngagementPoints(analyticsData.points || []);
      }

      // 5. RSS Feeds & Filters
      const rssRes = await fetch('/api/rss/feeds');
      if (rssRes.ok) {
        const rssData = await rssRes.json();
        setRssFeeds(rssData.feeds || []);
        setExcludedKeywords(rssData.excludedKeywords || []);
      }
    } catch (e) {
      console.error('Failed to fetch application data:', e);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Actions
  const handlePostAction = async (postId: string, action: string, payload?: any) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/selections/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action, payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || tx('İşlem başarısız oldu.', 'Action failed.'), 'error');
      } else {
        showToast(tx(`"${action}" işlemi başarıyla tamamlandı.`, `Action "${action}" succeeded.`));
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message || tx('İşlem sırasında ağ hatası oluştu.', 'Network error executing action.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAction = async (postIds: string[], action: 'approve' | 'reject') => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/approval-queue/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postIds, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || tx('Toplu işlem başarısız oldu.', 'Bulk action failed.'), 'error');
      } else {
        showToast(
          tx(
            `${data.count} öğe için toplu ${action === 'approve' ? 'onay' : 'red'} tamamlandı.`,
            `Bulk ${action} completed for ${data.count} items.`
          )
        );
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message || tx('Toplu yürütme hatası.', 'Bulk execution error.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAiConfig = async (updates: Partial<AiAgentConfig>) => {
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok && data.aiAgentConfig) {
        setAiAgentConfig(data.aiAgentConfig);
        showToast(tx('AI Ajan yapılandırması güncellendi.', 'AI Agent configuration updated.'));
      }
    } catch (e: any) {
      showToast(e.message || tx('AI yapılandırması güncellenemedi.', 'Failed to update AI config.'), 'error');
    }
  };

  const handleDiscoverBatch = async (params: { query?: string; topics?: string[]; count?: number }): Promise<{ count: number; posts: EditorialPost[]; steps: string[] } | null> => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/ai/discover-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || tx('AI Keşif taraması başarısız oldu.', 'AI Discovery sweep failed.'), 'error');
        return null;
      } else {
        showToast(
          tx(
            `Ajan 1 keşfetti ve Ajan 2 ${data.count} benzersiz editoryal seriyi denetledi.`,
            `Agent 1 discovered & Agent 2 audited ${data.count} unique editorial(s).`
          )
        );
        await loadAllData();
        return {
          count: data.count || 0,
          posts: data.posts || [],
          steps: data.steps || [],
        };
      }
    } catch (e: any) {
      showToast(e.message || tx('AI keşif taraması sırasında hata.', 'Error during AI discovery sweep.'), 'error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeduplicate = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/ai/deduplicate', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          data.removedCount > 0
            ? tx(
                `${data.removedCount} tekrarlayan editoryal kaldırıldı. Arşivde ${data.remainingCount} benzersiz çalışma var.`,
                `Removed ${data.removedCount} duplicate editorial(s). ${data.remainingCount} unique works in archive.`
              )
            : tx(
                `Arşiv doğrulandı: Kopya bulunamadı (${data.remainingCount} benzersiz çalışma).`,
                `Archive verified: 0 duplicates found (${data.remainingCount} unique works).`
              )
        );
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message || tx('Tekilleştirme başarısız oldu.', 'Deduplication failed.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAuditCandidates = async (autoApprove?: boolean) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/ai/audit-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoApprove }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || tx('Ajan 2 denetimi başarısız oldu.', 'Agent 2 audit failed.'), 'error');
      } else {
        showToast(
          tx(
            `Ajan 2, ${data.auditedCount} öğeyi denetledi${
              data.autoApprovedCount > 0 ? ` (${data.autoApprovedCount} otomatik onaylandı)` : ''
            }.`,
            `Agent 2 audited ${data.auditedCount} items${
              data.autoApprovedCount > 0 ? ` (${data.autoApprovedCount} auto-approved)` : ''
            }.`
          )
        );
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message || tx('Ajan 2 denetimi sırasında hata.', 'Error during Agent 2 audit.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleEmergencyStop = async () => {
    try {
      const res = await fetch('/api/emergency-stop', { method: 'POST' });
      const data = await res.json();
      setSettings(prev => ({ ...prev, emergencyStop: data.emergencyStop }));
      showToast(
        data.emergencyStop
          ? tx('ACİL DURDURMA DEVREDE. Tüm yayınlar durduruldu.', 'EMERGENCY STOP ENGAGED. All publishing halted.')
          : tx('Acil durdurma kaldırıldı. Normal program geri yüklendi.', 'Emergency stop cleared. Regular schedule restored.'),
        data.emergencyStop ? 'error' : 'success'
      );
      await loadAllData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleToggleSchedulePause = async () => {
    try {
      const res = await fetch('/api/automation/toggle', { method: 'POST' });
      const data = await res.json();
      setSettings(prev => ({ ...prev, schedulePaused: data.schedulePaused }));
      showToast(
        data.schedulePaused
          ? tx('Otomatik iş akışları duraklatıldı.', 'Automated workflows paused.')
          : tx('Otomatik iş akışları devam ediyor.', 'Automated workflows resumed.')
      );
      await loadAllData();
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  };

  const handleRunStage = async (stage: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/automation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || tx('Aşama çalıştırılamadı.', 'Stage execution failed.'), 'error');
      } else {
        showToast(tx('İş akışı aşaması çalıştırıldı.', 'Workflow stage executed.'));
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearWorkflowLogs = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/automation/logs/clear', { method: 'POST' });
      if (res.ok) {
        setWorkflowLogs([]);
        showToast(tx('Otomasyon günlükleri temizlendi.', 'Automation logs cleared.'));
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstagramConnect = async (params: { accessToken?: string; accountId?: string; mockConnected?: boolean }) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/instagram/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || tx('Instagram bağlantısı başarısız oldu.', 'Instagram connection failed.'), 'error');
      } else {
        setInstagram(data.instagram);
        showToast(
          tx(
            `Instagram Profesyonel Hesabı @${data.instagram.username} olarak bağlandı.`,
            `Instagram Professional Account connected as @${data.instagram.username}.`
          )
        );
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstagramDisconnect = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/instagram/disconnect', { method: 'POST' });
      const data = await res.json();
      setInstagram(data.instagram);
      showToast(tx('Instagram hesabı bağlantısı kesildi.', 'Instagram account disconnected.'));
      await loadAllData();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<SystemSettings>) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || tx('Ayarlar güncellenemedi.', 'Failed to update settings.'), 'error');
      } else {
        setSettings(data.settings);
        showToast(tx('Ayarlar başarıyla kaydedildi.', 'Settings saved successfully.'));
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiResearchSubmit = async (data: ManualPostSubmissionPayload) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/posts/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        showToast(resData.error || tx('Editoryal gönderi eklenemedi.', 'Failed to add editorial post.'), 'error');
      } else {
        const destLabel =
          data.targetStatus === 'approved'
            ? tx('Post Paketleri', 'Post Packages')
            : data.targetStatus === 'selected'
            ? tx('Onay Kuyruğu', 'Approval Queue')
            : tx('Günlük Seçim', 'Daily Selection');
        showToast(
          tx(
            `"${resData.post.title}" (${resData.post.imageUrls.length} kare) oluşturuldu → ${destLabel}`,
            `Created "${resData.post.title}" (${resData.post.imageUrls.length} frames) → ${destLabel}`
          )
        );
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddRssFeed = async (feed: {
    name: string;
    rssUrl: string;
    handle: string;
    defaultCategory: string;
  }) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/rss/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feed),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || tx('RSS kaynağı eklenemedi.', 'Failed to add RSS feed.'), 'error');
      } else {
        setRssFeeds(data.feeds || []);
        showToast(tx(`"${feed.name}" RSS kaynağı eklendi.`, `Added RSS feed "${feed.name}".`));
      }
    } catch (e: any) {
      showToast(e.message || tx('RSS kaynağı eklenirken hata.', 'Error adding RSS feed.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleRssFeed = async (feedId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/rss/feeds/${feedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (res.ok) {
        setRssFeeds(data.feeds || []);
        showToast(enabled ? tx('RSS kaynağı etkinleştirildi.', 'RSS feed activated.') : tx('RSS kaynağı duraklatıldı.', 'RSS feed paused.'));
      }
    } catch (e: any) {
      showToast(e.message || tx('RSS kaynağı güncellenemedi.', 'Failed to update RSS feed.'), 'error');
    }
  };

  const handleDeleteRssFeed = async (feedId: string) => {
    try {
      const res = await fetch(`/api/rss/feeds/${feedId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        setRssFeeds(data.feeds || []);
        showToast(tx('RSS kaynağı kaldırıldı.', 'RSS feed removed.'));
      }
    } catch (e: any) {
      showToast(e.message || tx('RSS kaynağı kaldırılamadı.', 'Failed to remove RSS feed.'), 'error');
    }
  };

  const handleUpdateExcludedKeywords = async (keywords: string[]) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/rss/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedKeywords: keywords }),
      });
      const data = await res.json();
      if (res.ok) {
        setExcludedKeywords(data.excludedKeywords || []);
        showToast(
          tx(
            `${data.excludedKeywords?.length || 0} hariç tutulan anahtar kelime güncellendi.`,
            `Updated ${data.excludedKeywords?.length || 0} exclusion keyword(s).`
          )
        );
      }
    } catch (e: any) {
      showToast(e.message || tx('Hariç tutma kelimeleri güncellenemedi.', 'Failed to update exclusion keywords.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptionSave = async (postId: string, newCaption: string, hashtags: string[]) => {
    await handlePostAction(postId, 'edit_caption', { caption: newCaption, hashtags });
  };

  const handleConfirmAutopilot = async () => {
    await handleUpdateSettings({ mode: 'AUTOPILOT', autopilotConfirmed: true });
    setIsAutopilotModalOpen(false);
  };

  const handleSyncInstagramInsights = async (postId?: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/analytics/sync-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || tx('Instagram istatistikleri senkronize edilemedi.', 'Failed to sync Instagram insights.'), 'error');
      } else {
        setEngagementPoints(data.points || []);
        showToast(
          tx(
            `Meta Graph API üzerinden ${data.syncedCount} yayın için canlı veriler eşitlendi.`,
            `Synced live telemetry for ${data.syncedCount} editorial release(s) via Meta Graph API.`
          )
        );
      }
    } catch (e: any) {
      showToast(e.message || tx('Instagram istatistikleri eşitlenirken hata.', 'Error syncing Instagram insights.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteLearningSignal = async (signalId: string) => {
    try {
      const res = await fetch(`/api/learning/signals/${signalId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast(tx('Öğrenme sinyali silindi ve sıralama ağırlıkları yeniden hesaplandı.', 'Learning signal removed and ranking weights recalculated.'));
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message || tx('Sinyal silinemedi.', 'Failed to remove signal.'), 'error');
    }
  };

  const handleClearLearningSignals = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/learning/signals/clear', {
        method: 'POST',
      });
      if (res.ok) {
        showToast(tx('Tüm öğrenme ağırlıkları nötr başlangıç seviyesine sıfırlandı.', 'All learning weights reset to neutral baseline.'));
        await loadAllData();
      }
    } catch (e: any) {
      showToast(e.message || tx('Sinyaller temizlenemedi.', 'Failed to clear signals.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingApprovalsCount = allPosts.filter(
    (p) => p.status === 'selected'
  ).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f4f3ef] flex flex-col font-sans selection:bg-[#262626] selection:text-white overflow-x-hidden max-w-full w-full">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#181818] border border-[#2e2e2e] rounded-lg shadow-2xl text-xs font-mono text-[#f4f3ef] animate-in fade-in slide-in-from-bottom-2">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#a3e635]" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#ef4444]" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Primary Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        mode={settings.mode}
        emergencyStop={settings.emergencyStop}
        onToggleEmergencyStop={handleToggleEmergencyStop}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 overflow-hidden">
        {currentTab === 'daily-selection' && (
          <DailySelectionView
            top5Posts={top5Posts}
            candidates={candidates}
            savedPosts={allPosts.filter((p) => p.status === 'saved')}
            onAction={handlePostAction}
            onOpenCaptionEditor={(post) => setEditingPost(post)}
            onOpenAiResearch={() => setIsAiResearchOpen(true)}
            onNavigateToAiSearch={() => setCurrentTab('ai-search-engine')}
            isProcessingAction={isProcessing}
          />
        )}

        {currentTab === 'ai-search-engine' && (
          <AiSearchEngineView
            posts={allPosts}
            aiConfig={aiAgentConfig}
            rssFeeds={rssFeeds}
            workflowLogs={workflowLogs}
            onUpdateAiConfig={handleUpdateAiConfig}
            onDiscoverBatch={handleDiscoverBatch}
            onDeduplicate={handleDeduplicate}
            onAuditAll={handleAuditCandidates}
            onPostAction={handlePostAction}
            onOpenCaptionEditor={(post) => setEditingPost(post)}
            onNavigateToSettings={() => setCurrentTab('settings')}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'approval-queue' && (
          <ApprovalQueueView
            posts={allPosts}
            aiConfig={aiAgentConfig}
            onAction={handlePostAction}
            onBulkAction={handleBulkAction}
            onAuditAll={handleAuditCandidates}
            onOpenCaptionEditor={(post) => setEditingPost(post)}
            isProcessingAction={isProcessing}
          />
        )}

        {currentTab === 'post-packages' && (
          <PostPackagesView
            posts={allPosts}
            onEditPost={(post) => setEditingPost(post)}
            onPostAction={handlePostAction}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'automation-engine' && (
          <AutomationEngineView
            workflowLogs={workflowLogs}
            schedulePaused={settings.schedulePaused}
            emergencyStop={settings.emergencyStop}
            mode={settings.mode}
            timezone={settings.timezone}
            automationSchedule={settings.automationSchedule}
            onUpdateSchedule={(automationSchedule) =>
              handleUpdateSettings({ automationSchedule })
            }
            onTogglePause={handleToggleSchedulePause}
            onToggleEmergencyStop={handleToggleEmergencyStop}
            onRunStage={handleRunStage}
            onClearLogs={handleClearWorkflowLogs}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'instagram-adapter' && (
          <InstagramAdapterView
            config={instagram}
            onConnect={handleInstagramConnect}
            onDisconnect={handleInstagramDisconnect}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'analytics' && (
          <EditorialEngagementChart
            data={engagementPoints}
            posts={allPosts}
            instagramConnected={instagram.connected}
            instagramUsername={instagram.username}
            onSyncInstagramInsights={handleSyncInstagramInsights}
            isSyncing={isProcessing}
          />
        )}

        {currentTab === 'editorial-learning' && (
          <EditorialLearningView
            signals={learningSignals}
            posts={allPosts}
            onNavigateToAnalytics={() => setCurrentTab('analytics')}
            onDeleteSignal={handleDeleteLearningSignal}
            onClearSignals={handleClearLearningSignals}
            onPostAction={handlePostAction}
            isProcessing={isProcessing}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            instagram={instagram}
            aiConfig={aiAgentConfig}
            geminiConnected={geminiConnected}
            rssFeeds={rssFeeds}
            excludedKeywords={excludedKeywords}
            onAddRssFeed={handleAddRssFeed}
            onToggleRssFeed={handleToggleRssFeed}
            onDeleteRssFeed={handleDeleteRssFeed}
            onUpdateExcludedKeywords={handleUpdateExcludedKeywords}
            onUpdateSettings={handleUpdateSettings}
            onUpdateAiConfig={handleUpdateAiConfig}
            onTestAiPipeline={async () => {
              await handleDiscoverBatch({ count: 1 });
            }}
            onTriggerAutopilotModal={() => setIsAutopilotModalOpen(true)}
            onOpenAgentGuide={() => setIsAgentGuideOpen(true)}
            onConnectInstagram={handleInstagramConnect}
            onDisconnectInstagram={handleInstagramDisconnect}
            isProcessing={isProcessing}
          />
        )}
      </main>

      {/* Modals */}
      <CaptionEditorModal
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onSave={handleCaptionSave}
        isProcessing={isProcessing}
      />

      <AiResearchModal
        isOpen={isAiResearchOpen}
        onClose={() => setIsAiResearchOpen(false)}
        onSubmit={handleAiResearchSubmit}
        isProcessing={isProcessing}
      />

      <AutopilotConfirmModal
        isOpen={isAutopilotModalOpen}
        onClose={() => setIsAutopilotModalOpen(false)}
        onConfirm={handleConfirmAutopilot}
        instagram={instagram}
        isProcessing={isProcessing}
      />

      <AgentIntegrationModal
        isOpen={isAgentGuideOpen}
        onClose={() => setIsAgentGuideOpen(false)}
        instagram={instagram}
        geminiConnected={geminiConnected}
      />

      {/* Minimal Editorial Footer */}
      <footer className="border-t border-[#1e1e1e] bg-[#0a0a0a] py-8 text-xs text-[#71717a] font-mono">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#c5a880] uppercase tracking-wider font-semibold">THE EDITORIAL INDEX</span>
            <span>·</span>
            <span>
              {tx(
                'Otonom Yüksek Moda Kürasyonu & Arşiv Yayıncılığı',
                'Autonomous High Fashion Curation & Archival Publishing'
              )}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>{tx('Mod', 'Mode')}: {formatMode(settings.mode)}</span>
            <span>·</span>
            <span>{tx('Saat Dilimi', 'Timezone')}: Europe/Istanbul</span>
            <span>·</span>
            <span>Meta Graph API v21.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
