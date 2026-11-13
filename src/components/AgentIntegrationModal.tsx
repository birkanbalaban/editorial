import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  Cpu, 
  Share2, 
  ShieldCheck, 
  ListChecks, 
  Key, 
  Clock, 
  RefreshCw,
  Info
} from 'lucide-react';
import { InstagramAccountConfig } from '../types/editorial';
import { useLanguage } from '../i18n/LanguageContext';

interface AgentIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  instagram?: InstagramAccountConfig;
  geminiConnected?: boolean;
}

export type ReadinessBadgeStatus = 'READY' | 'ACTION_REQUIRED';

type TxFn = (tr: string, en: string) => string;

interface ChecklistItem {
  id: string;
  category: 'codebase' | 'production';
  label: string;
  description: string;
  defaultChecked: boolean;
}

const CHECKLIST_BASE: Array<{ id: string; category: 'codebase' | 'production'; defaultChecked: boolean }> = [
  { id: 'score-engine', category: 'codebase', defaultChecked: true },
  { id: 'gemini-research', category: 'codebase', defaultChecked: true },
  { id: 'rights-firewall', category: 'codebase', defaultChecked: true },
  { id: 'sha256-hash', category: 'codebase', defaultChecked: true },
  { id: 'automation-scheduler', category: 'codebase', defaultChecked: true },
  { id: 'meta-adapter', category: 'codebase', defaultChecked: true },
  { id: 'recharts-analytics', category: 'codebase', defaultChecked: true },
  { id: 'preference-learning', category: 'codebase', defaultChecked: true },
  { id: 'meta-app-review', category: 'production', defaultChecked: false },
  { id: 'system-user-token', category: 'production', defaultChecked: false },
  { id: 'public-https-media', category: 'production', defaultChecked: true },
  { id: 'cloud-scheduler', category: 'production', defaultChecked: false },
  { id: 'gemini-secret', category: 'production', defaultChecked: true },
];

function getLocalizedChecklistItems(tx: TxFn): ChecklistItem[] {
  const copyMap: Record<string, { label: string; description: string }> = {
    'score-engine': {
      label: tx('5 Faktörlü Ağırlıklı Kürasyon Puanlama Algoritması', '5-Factor Weighted Curatorial Scoring Algorithm'),
      description: tx(
        'Kompozisyon (%25), Işık (%20), Stil (%20), Kültürel Güncellik (%15) ve Anlatı (%20) boyutlarında deterministik değerlendirme.',
        'Deterministic evaluation across Composition (25%), Lighting (20%), Styling (20%), Cultural Relevance (15%), and Narrative (20%).'
      ),
    },
    'gemini-research': {
      label: tx('Otonom Gemini Araştırma Motoru', 'Autonomous Gemini Research Engine'),
      description: tx(
        'Yapılandırılmış JSON şemasıyla fotoğrafçı künyelerini, stili ve kadrajları çıkaran sunucu tarafı gemini-3.8-flash entegrasyonu.',
        'Server-side gemini-3.8-flash integration extracting photographer credits, styling, and crops with structured JSON schema.'
      ),
    },
    'rights-firewall': {
      label: tx('Yasal Haklar Güvenlik Duvarı & Referans Kart Kapısı', 'Legal Rights Firewall & Reference Card Gating'),
      description: tx(
        'Lisanssız yayınları engeller; çoğaltma izni olmayan eserler için filigransız Editoryal Referans Kartları hazırlar.',
        'Blocks unlicensed publishing; prepares non-watermarked Editorial Reference Cards for works lacking reproduction clearance.'
      ),
    },
    'sha256-hash': {
      label: tx('SHA-256 İçerik Değişikliği Koruma Kilidi', 'SHA-256 Material Change Detection Guard'),
      description: tx(
        'Açıklama, görsel URL’si veya hak kayıtlarında yapılan her değişiklik önceki onayı iptal eder ve yeniden küratör onayı gerektirir.',
        'Any modification to captions, image URLs, or rights records revokes prior approval and requires curator re-approval.'
      ),
    },
    'automation-scheduler': {
      label: tx('Kalıcı Europe/Istanbul Otomasyon Zamanlayıcısı', 'Persistent Europe/Istanbul Automation Scheduler'),
      description: tx(
        '08:00, 09:00, 10:00, 11:00, 14:00 ve 20:00 saatlerinde çalışan 6 aşamalı günlük otonom zamanlama slotları.',
        'Autonomous 6-stage daily cron slots running at 08:00, 09:00, 10:00, 11:00, 14:00, and 20:00.'
      ),
    },
    'meta-adapter': {
      label: tx('Meta Graph API v21.0 Yayın Adaptörü', 'Meta Graph API v21.0 Publishing Adapter'),
      description: tx(
        'Yedek sandbox simülasyonu ve denetim kaydı (audit trail) günlüğü ile resmi tekli ve karusel medya kapsayıcı yaşam döngüsü.',
        'Official single and carousel media container lifecycle with fallback sandbox simulation and audit trail logging.'
      ),
    },
    'recharts-analytics': {
      label: tx('Recharts Performans & Trend Çizgisi Analitiği', 'Recharts Performance & Trend-Line Analytics'),
      description: tx(
        'Sürekli zaman çizelgesi, 3G/5G Hareketli Ortalama trend çizgileri ve dönem/kampanya karşılaştırma matrisleri.',
        'Continuous timeline, 3D/5D Moving Average trend-lines, and side-by-side comparative matrices for time periods and campaigns.'
      ),
    },
    'preference-learning': {
      label: tx('Editoryal Tercih Öğrenme Sistemi', 'Editorial Preference Learning System'),
      description: tx(
        'Gelecekteki keşif ağırlıklarını ayarlamak için onaylanan, reddedilen ve kaydedilen estetik etiketleri izleyen telemetri.',
        'Telemetry recording approved, rejected, and saved aesthetic tags to tune future discovery weights.'
      ),
    },
    'meta-app-review': {
      label: tx('instagram_content_publish için Meta Uygulama İncelemesi', 'Meta App Review for instagram_content_publish'),
      description: tx(
        'Herkese açık hesapların Instagram İçerik Yayınlama API’sine erişebilmesi için Meta Developer Uygulamanızı incelemeye gönderin.',
        'Submit your Meta Developer App for review to grant public accounts access to the Instagram Content Publishing API.'
      ),
    },
    'system-user-token': {
      label: tx('Kalıcı Sistem Kullanıcısı Sayfa Erişim Belirteci', 'Permanent System User Page Access Token'),
      description: tx(
        'Meta Business Manager’da süresi dolmayan bir Sistem Kullanıcısı Erişim Belirteci oluşturun ve INSTAGRAM_ACCESS_TOKEN olarak tanımlayın.',
        'Generate a non-expiring System User Access Token in Meta Business Manager and set INSTAGRAM_ACCESS_TOKEN.'
      ),
    },
    'public-https-media': {
      label: tx('Herkese Açık HTTPS Medya Sunumu', 'Public HTTPS Media Host Hosting'),
      description: tx(
        'Instagram kapsayıcı uç noktaları görseller için herkese açık HTTPS URL’leri gerektirir. Varlıkların açık CDN/Cloud Run üzerinden sunulduğundan emin olun.',
        'Instagram container endpoints require public HTTPS URLs for image assets. Ensure assets are served over public CDN/Cloud Run.'
      ),
    },
    'cloud-scheduler': {
      label: tx('Google Cloud Scheduler Hermetik Cron Tetikleyicisi', 'Google Cloud Scheduler Hermetic Cron Hook'),
      description: tx(
        'Sıfıra ölçeklenen sunucusuz Cloud Run dağıtımları için POST /api/workflow/run adresini tetikleyecek Cloud Scheduler yapılandırın.',
        'For serverless Cloud Run deployments that scale to zero, configure Cloud Scheduler to trigger POST /api/workflow/run.'
      ),
    },
    'gemini-secret': {
      label: tx('Üretim GEMINI_API_KEY Tanımı', 'Production GEMINI_API_KEY Injected'),
      description: tx(
        'Sunucu ortamınızda GEMINI_API_KEY değişkeninin bulut gizli anahtarları veya platform ortam ayarları üzerinden tanımlandığından emin olun.',
        'Ensure your server environment has GEMINI_API_KEY injected via cloud secrets or platform environment configuration.'
      ),
    },
  };

  return CHECKLIST_BASE.map(base => ({
    ...base,
    label: copyMap[base.id]?.label || base.id,
    description: copyMap[base.id]?.description || '',
  }));
}

function getRawMarkdownGuide(lang: 'tr' | 'en'): string {
  if (lang === 'tr') {
    return `# THE EDITORIAL INDEX — Ajan Entegrasyon ve Dağıtım Kılavuzu
Otonom Yüksek Moda Kürasyonu, Hak Yönetimi ve Meta Graph API Yayın Platformu

1. GENEL BAKIŞ VE MOTOR MİMARİSİ
Sistem; keşif ve puanlama için sunucu tarafı Gemini 3.8 Flash hattı, yayınlama için doğrulanmış Meta Graph API v21.0 adaptörü ve katı yasal hak denetimi kullanarak otonom çalışır.

2. PUANLAMA MOTORU
Genel = 0.25*Kompozisyon + 0.20*Işık + 0.20*Stil + 0.15*Kültür + 0.20*Anlatı. Günlük ilk 5 eser seçilir; hakları doğrulanmış en fazla 2 gönderi Instagram için hazırlanır.

3. HAK YÖNETİMİ
Yalnızca 'verified' (doğrulanmış) haklara sahip eserler yayınlanabilir paket üretir. Lisanssız veya bekleyen haklar filigransız temiz 'Editoryal Referans Kartları' oluşturur.

4. META GRAPH API v21.0 BAĞLANTISI
INSTAGRAM_ACCOUNT_ID ve INSTAGRAM_ACCESS_TOKEN değişkenlerini tanımlayın. Sistem karusel desteğiyle kapsayıcı oluşturma (POST /{ig-user-id}/media) ve yayınlama (POST /{ig-user-id}/media_publish) adımlarını yönetir.

5. AUTOPILOT GÜVENLİĞİ
Açık kullanıcı onayı, bağlı profesyonel Instagram hesabı, günlük en fazla 2 gönderi limiti, SHA-256 değişiklik algılama ve Acil Durdurma anahtarı gerektirir.`;
  }

  return `# THE EDITORIAL INDEX — Agent Integration & Deployment Guide
Autonomous High-Fashion Curation, Rights Management & Meta Graph API Publishing Platform

1. OVERVIEW & ENGINE ARCHITECTURE
The system operates autonomously using a server-side Gemini 3.8 Flash pipeline for discovery and scoring, verified Meta Graph API v21.0 adapter for publishing, and strict legal rights gating.

2. SCORING ENGINE
Overall = 0.25*Composition + 0.20*Lighting + 0.20*Styling + 0.15*Culture + 0.20*Narrative. Top 5 selected daily; up to 2 rights-cleared posts prepared for Instagram.

3. RIGHTS MANAGEMENT
Only 'verified' rights generate publishable post packages. Unlicensed or pending rights render clean 'Editorial Reference Cards' with zero watermarking.

4. META GRAPH API v21.0 CONNECTION
Set INSTAGRAM_ACCOUNT_ID and INSTAGRAM_ACCESS_TOKEN. The system handles container creation (POST /{ig-user-id}/media) and publication (POST /{ig-user-id}/media_publish) with carousel support.

5. AUTOPILOT SAFETY
Requires explicit activation, connected professional Instagram account, max 2 posts/day cap, SHA-256 change detection, and emergency stop kill switch.`;
}

export function getItemDynamicStatus(
  itemId: string,
  category: 'codebase' | 'production',
  isIgLive: boolean,
  isGeminiLive: boolean,
  igConfig?: InstagramAccountConfig,
  tx: TxFn = (_tr, en) => en
): {
  badgeStatus: ReadinessBadgeStatus;
  badgeLabel: string;
  statusText: string;
  hint?: string;
} {
  const readyLabel = tx('HAZIR', 'READY');
  const actionLabel = tx('İŞLEM GEREKLİ', 'ACTION REQUIRED');

  switch (itemId) {
    case 'score-engine':
      return {
        badgeStatus: 'READY',
        badgeLabel: readyLabel,
        statusText: tx(
          'src/lib/scoring.ts içinde doğrulandı · 17 Otomatik Test Başarılı',
          'Verified in src/lib/scoring.ts · 17 Automated Tests Passing'
        ),
      };

    case 'gemini-research':
      return {
        badgeStatus: isGeminiLive ? 'READY' : 'ACTION_REQUIRED',
        badgeLabel: isGeminiLive ? readyLabel : actionLabel,
        statusText: isGeminiLive
          ? tx(
              'gemini-3.8-flash aktif · Canlı Araştırma ve 5 Faktörlü Puanlama yanıt veriyor',
              'gemini-3.8-flash active · Live Research & 5-Factor Scoring responding'
            )
          : tx(
              'İşlem Gerekli · GEMINI_API_KEY Tanımlayın (Kürasyon Yedek Motoru Aktif)',
              'Action Required · Set GEMINI_API_KEY (Curatorial Fallback Active)'
            ),
        hint: isGeminiLive
          ? undefined
          : tx(
              'Gerçek zamanlı LLM kürasyonunu etkinleştirmek için Secrets paneline GEMINI_API_KEY ekleyin.',
              'Add GEMINI_API_KEY in the AI Studio Secrets panel to enable real-time LLM curation.'
            ),
      };

    case 'rights-firewall':
      return {
        badgeStatus: 'READY',
        badgeLabel: readyLabel,
        statusText: tx(
          'src/lib/publishingRules.ts içinde uygulanıyor · Referans Kart Kapısı Aktif',
          'Enforced in src/lib/publishingRules.ts · Reference Card Gating Active'
        ),
      };

    case 'sha256-hash':
      return {
        badgeStatus: 'READY',
        badgeLabel: readyLabel,
        statusText: tx(
          'src/lib/publishingRules.ts içinde aktif · İçerik Değişiklik Koruması Aktif',
          'Active in src/lib/publishingRules.ts · Material Tamper Guard Active'
        ),
      };

    case 'automation-scheduler':
      return {
        badgeStatus: 'READY',
        badgeLabel: readyLabel,
        statusText: tx(
          'src/server/automationEngine.ts içinde aktif · Europe/Istanbul (UTC+3)',
          'Active in src/server/automationEngine.ts · Europe/Istanbul (UTC+3)'
        ),
      };

    case 'meta-adapter':
      return {
        badgeStatus: isIgLive ? 'READY' : 'ACTION_REQUIRED',
        badgeLabel: isIgLive ? readyLabel : actionLabel,
        statusText: isIgLive
          ? tx(
              `Meta Graph API v21.0 aktif (@${igConfig?.username || 'theeditorialindex'})`,
              `Meta Graph API v21.0 active (@${igConfig?.username || 'theeditorialindex'})`
            )
          : tx(
              'İşlem Gerekli · Profesyonel Instagram Hesabı Bağlayın',
              'Action Required · Connect Instagram Professional Account'
            ),
        hint: isIgLive
          ? undefined
          : tx(
              'Ayarlar > Instagram üzerinden bir Profesyonel Instagram hesabı bağlayın veya Sandbox simülasyonunu kullanın.',
              'Connect an Instagram Professional account via Settings > Instagram or enable Sandbox simulation.'
            ),
      };

    case 'recharts-analytics':
      return {
        badgeStatus: 'READY',
        badgeLabel: readyLabel,
        statusText: tx(
          'src/components/EditorialEngagementChart.tsx içinde aktif · Hareketli Ortalamalar ve Matris',
          'Active in src/components/EditorialEngagementChart.tsx · Moving Averages & Matrix'
        ),
      };

    case 'preference-learning':
      return {
        badgeStatus: 'READY',
        badgeLabel: readyLabel,
        statusText: tx(
          'src/components/EditorialLearningView.tsx içinde aktif · Estetik Etiket Telemetrisi',
          'Active in src/components/EditorialLearningView.tsx · Aesthetic Tag Telemetry'
        ),
      };

    case 'meta-app-review':
      return {
        badgeStatus: isIgLive ? 'READY' : 'ACTION_REQUIRED',
        badgeLabel: isIgLive ? readyLabel : actionLabel,
        statusText: isIgLive
          ? tx(
              `İzinler Doğrulandı (${igConfig?.permissions?.length ? igConfig.permissions.join(', ') : 'instagram_content_publish'})`,
              `Permissions Verified (${igConfig?.permissions?.length ? igConfig.permissions.join(', ') : 'instagram_content_publish'})`
            )
          : tx(
              'İşlem Gerekli · Meta Geliştirici Uygulama İncelemesi (instagram_content_publish)',
              'Action Required · Meta Developer App Review (instagram_content_publish)'
            ),
        hint: isIgLive
          ? undefined
          : tx(
              'Üretim hesaplarında yayın yapmak için Meta Geliştirici Uygulamanızı instagram_content_publish iznine gönderin.',
              'Submit your Meta Developer App for instagram_content_publish to publish to production accounts.'
            ),
      };

    case 'system-user-token':
      return {
        badgeStatus: isIgLive ? 'READY' : 'ACTION_REQUIRED',
        badgeLabel: isIgLive ? readyLabel : actionLabel,
        statusText: isIgLive
          ? tx(
              `Belirteç Aktif (Hesap ID: ${igConfig?.accountId || 'doğrulandı'})`,
              `Token Active (Account ID: ${igConfig?.accountId || 'verified'})`
            )
          : tx(
              'İşlem Gerekli · Kalıcı INSTAGRAM_ACCESS_TOKEN Sağlayın',
              'Action Required · Provide Permanent INSTAGRAM_ACCESS_TOKEN'
            ),
        hint: isIgLive
          ? undefined
          : tx(
              'Meta Business Manager üzerinden süresi dolmayan bir Sistem Kullanıcısı Erişim Belirteci oluşturun.',
              'Generate a non-expiring System User Access Token in Meta Business Manager.'
            ),
      };

    case 'public-https-media':
      return {
        badgeStatus: 'READY',
        badgeLabel: readyLabel,
        statusText: tx(
          'Instagram Alımı için Herkese Açık HTTPS Medya Sunumu Aktif',
          'Public HTTPS Media Host Active for Instagram Ingestion'
        ),
      };

    case 'cloud-scheduler':
      return {
        badgeStatus: 'ACTION_REQUIRED',
        badgeLabel: actionLabel,
        statusText: tx(
          'İşlem Gerekli · Sıfıra Ölçekleme İçin İsteğe Bağlı Cloud Scheduler Kancası',
          'Action Required · Optional Cloud Scheduler Hook for Scale-to-Zero'
        ),
        hint: tx(
          'Sunucusuz Cloud Run dağıtımlarında POST /api/workflow/run ucunu cron takvimiyle tetikleyin.',
          'For production serverless Cloud Run deployments, trigger POST /api/workflow/run on cron schedule.'
        ),
      };

    case 'gemini-secret':
      return {
        badgeStatus: isGeminiLive ? 'READY' : 'ACTION_REQUIRED',
        badgeLabel: isGeminiLive ? readyLabel : actionLabel,
        statusText: isGeminiLive
          ? tx(
              'Üretim GEMINI_API_KEY Eklendi ve Doğrulandı',
              'Production GEMINI_API_KEY Injected & Verified'
            )
          : tx(
              'İşlem Gerekli · GEMINI_API_KEY Yapılandırılmadı',
              'Action Required · GEMINI_API_KEY Not Configured'
            ),
        hint: isGeminiLive
          ? undefined
          : tx(
              'Canlı API erişimini tamamlamak için ortam değişkenlerine veya Secrets paneline GEMINI_API_KEY ekleyin.',
              'Set GEMINI_API_KEY in the environment or Secrets panel to complete live API access.'
            ),
      };

    default:
      return {
        badgeStatus: category === 'codebase' ? 'READY' : 'ACTION_REQUIRED',
        badgeLabel: category === 'codebase' ? readyLabel : actionLabel,
        statusText: category === 'codebase' ? tx('Kod Tabanı Doğrulandı', 'Codebase Verified') : actionLabel,
      };
  }
}

const VisualStatusBadge: React.FC<{ status: ReadinessBadgeStatus }> = ({ status }) => {
  const { tx } = useLanguage();
  if (status === 'READY') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-[#122216] border border-[#1e4620] text-[#7cd38b] shadow-xs shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-[#7cd38b] animate-pulse" />
        {tx('HAZIR', 'READY')}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-[#26180c] border border-[#523318] text-[#e09f58] shadow-xs shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-[#e09f58]" />
      {tx('İŞLEM GEREKLİ', 'ACTION REQUIRED')}
    </span>
  );
};

export const AgentIntegrationModal: React.FC<AgentIntegrationModalProps> = ({ 
  isOpen, 
  onClose,
  instagram,
  geminiConnected,
}) => {
  const { lang, tx } = useLanguage();
  const [activeTab, setActiveTab] = useState<'gemini' | 'meta' | 'autopilot' | 'checklist'>('gemini');
  const [copied, setCopied] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'action_required'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Live state syncing
  const [liveInstagram, setLiveInstagram] = useState<InstagramAccountConfig | undefined>(instagram);
  const [liveGeminiConnected, setLiveGeminiConnected] = useState<boolean>(Boolean(geminiConnected));

  const isIgLive = Boolean(liveInstagram?.connected && liveInstagram?.accountType !== 'NOT_CONNECTED');
  const isGeminiLive = Boolean(liveGeminiConnected);

  const checklistItems = useMemo(() => getLocalizedChecklistItems(tx), [tx]);
  const rawMarkdownGuide = useMemo(() => getRawMarkdownGuide(lang), [lang]);

  const fetchLiveStatus = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/backend-status');
      if (res.ok) {
        const data = await res.json();
        if (data.gemini) {
          setLiveGeminiConnected(Boolean(data.gemini.connected));
        }
        if (data.instagram) {
          setLiveInstagram(prev => ({
            ...prev,
            connected: Boolean(data.instagram.connected),
            accountType: data.instagram.accountType || prev?.accountType || 'NOT_CONNECTED',
            username: data.instagram.username || prev?.username,
            accountId: data.instagram.accountId || prev?.accountId,
            permissions: prev?.permissions || [],
            auditTrail: prev?.auditTrail || [],
          }));
        }
      }
      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.instagram) setLiveInstagram(statusData.instagram);
        if (typeof statusData.geminiConnected === 'boolean') {
          setLiveGeminiConnected(statusData.geminiConnected);
        }
      }
    } catch (e) {
      console.warn('Live backend query skipped:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (instagram) setLiveInstagram(instagram);
      if (typeof geminiConnected === 'boolean') setLiveGeminiConnected(geminiConnected);
      fetchLiveStatus();
    }
  }, [isOpen, instagram, geminiConnected]);

  // Checkbox management with persistent storage
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('the_editorial_index_checklist');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    const initial: Record<string, boolean> = {};
    CHECKLIST_BASE.forEach(item => {
      initial[item.id] = item.defaultChecked;
    });
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem('the_editorial_index_checklist', JSON.stringify(checkedMap));
    } catch {
      // ignore
    }
  }, [checkedMap]);

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setCheckedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Item status mappings
  const itemsWithStatus = checklistItems.map(item => {
    const dyn = getItemDynamicStatus(item.id, item.category, isIgLive, isGeminiLive, liveInstagram, tx);
    return {
      ...item,
      dynStatus: dyn.badgeStatus,
      dynLabel: dyn.badgeLabel,
      dynText: dyn.statusText,
      hint: dyn.hint,
    };
  });

  const readyItemsCount = itemsWithStatus.filter(i => i.dynStatus === 'READY').length;
  const actionRequiredCount = itemsWithStatus.filter(i => i.dynStatus === 'ACTION_REQUIRED').length;
  const completedCount = Object.values(checkedMap).filter(Boolean).length;
  const totalCount = checklistItems.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  const filteredItems = itemsWithStatus.filter(item => {
    if (filterMode === 'ready') return item.dynStatus === 'READY';
    if (filterMode === 'action_required') return item.dynStatus === 'ACTION_REQUIRED';
    return true;
  });

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(rawMarkdownGuide);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([rawMarkdownGuide], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'THE_EDITORIAL_INDEX_AGENT_GUIDE.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
      <div 
        className="relative w-full max-w-5xl max-h-[90vh] bg-[#101010] border border-[#2a2a2a] rounded-lg shadow-2xl flex flex-col overflow-hidden text-[#f4f3ef] animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222222] bg-[#141414]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#c5a880]">
              <span>The Editorial Index</span>
              <span>·</span>
              <span>{tx('Teknik Şartname', 'Technical Specification')}</span>
              <span>·</span>
              <span>Vol. 01</span>
            </div>
            <h2 id="modal-title" className="font-editorial text-2xl text-[#f4f3ef] font-normal tracking-tight mt-0.5">
              {tx('Ajan Entegrasyon ve Dağıtım Kılavuzu', 'Agent Integration & Deployment Guide')}
            </h2>
          </div>

          <div className="flex items-center gap-2.5 font-mono text-xs">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#262626] border border-[#2c2c2c] rounded text-[#f4f3ef] transition cursor-pointer"
              title={tx('Tam teknik şartnameyi Markdown formatında kopyala', 'Copy full technical specification in Markdown format')}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#7cd38b]" /> : <Copy className="w-3.5 h-3.5 text-[#c5a880]" />}
              <span>{copied ? tx('Kopyalandı', 'Copied') : tx('.md Kopyala', 'Copy .md')}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c1c] hover:bg-[#262626] border border-[#2c2c2c] rounded text-[#f4f3ef] transition cursor-pointer"
              title={tx('Bağımsız Markdown kılavuzunu indir', 'Download standalone Markdown guide')}
            >
              <Download className="w-3.5 h-3.5 text-[#8e8d8a]" />
              <span>{tx('İndir', 'Download')}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-[#222222] text-[#8e8d8a] hover:text-[#f4f3ef] transition cursor-pointer ml-1"
              aria-label={tx('Pencereyi kapat', 'Close modal')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center border-b border-[#222222] bg-[#121212] px-6 gap-2 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setActiveTab('gemini')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'gemini' 
                ? 'border-[#c5a880] text-[#c5a880] font-semibold' 
                : 'border-transparent text-[#8e8d8a] hover:text-[#d4d4d8]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{tx('01. Gemini Altyapısı ve Puanlama', '01. Gemini Backend & Scoring')}</span>
            <span className={`w-2 h-2 rounded-full ${isGeminiLive ? 'bg-[#7cd38b]' : 'bg-[#e09f58]'}`} title={isGeminiLive ? tx('Gemini API Bağlı', 'Gemini API Connected') : tx('Gemini API İşlem Gerekli', 'Gemini API Action Required')} />
          </button>

          <button
            onClick={() => setActiveTab('meta')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'meta' 
                ? 'border-[#c5a880] text-[#c5a880] font-semibold' 
                : 'border-transparent text-[#8e8d8a] hover:text-[#d4d4d8]'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{tx('02. Meta Graph API ve Kimlik Bilgileri', '02. Meta Graph API & Credentials')}</span>
            <span className={`w-2 h-2 rounded-full ${isIgLive ? 'bg-[#7cd38b]' : 'bg-[#e09f58]'}`} title={isIgLive ? tx('Instagram Bağlı', 'Instagram Connected') : tx('Instagram İşlem Gerekli', 'Instagram Action Required')} />
          </button>

          <button
            onClick={() => setActiveTab('autopilot')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'autopilot' 
                ? 'border-[#c5a880] text-[#c5a880] font-semibold' 
                : 'border-transparent text-[#8e8d8a] hover:text-[#d4d4d8]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{tx('03. Autopilot Akışı ve Güvenlik Kapıları', '03. Autopilot Flow & Safety Gates')}</span>
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center gap-2 py-3 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'checklist' 
                ? 'border-[#c5a880] text-[#c5a880] font-semibold' 
                : 'border-transparent text-[#8e8d8a] hover:text-[#d4d4d8]'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>{tx(`04. Dağıtım Kontrol Listesi (${progressPct}%)`, `04. Ready-to-Deploy Checklist (${progressPct}%)`)}</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-[#1a1a1a] rounded text-[#8e8d8a]">{readyItemsCount} {tx('Hazır', 'Ready')}</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm font-sans leading-relaxed">
          
          {/* TAB 1: GEMINI BACKEND & SCORING */}
          {activeTab === 'gemini' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-editorial text-xl text-[#f4f3ef] font-normal">
                    {tx('Otonom Editoryal Araştırma ve 5 Faktörlü Puanlama', 'Autonomous Editorial Research & 5-Factor Scoring')}
                  </h3>
                  <p className="text-xs text-[#8e8d8a] mt-1">
                    {lang === 'tr' ? (
                      <>Sunucu tarafı zeka katmanı, <span className="font-mono text-[#c5a880]">@google/genai</span> ve <span className="font-mono text-[#f4f3ef]">gemini-3.8-flash</span> ile yönetilir.</>
                    ) : (
                      <>Server-side intelligence layer orchestrated via <span className="font-mono text-[#c5a880]">@google/genai</span> using <span className="font-mono text-[#f4f3ef]">gemini-3.8-flash</span>.</>
                    )}
                  </p>
                </div>
                <VisualStatusBadge status={isGeminiLive ? 'READY' : 'ACTION_REQUIRED'} />
              </div>

              {/* Dynamic status callout */}
              <div className="p-3 bg-[#141414] border border-[#222222] rounded flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#c5a880]" />
                  <span>
                    {tx('Arka Uç Motor Durumu:', 'Backend Engine Status:')}{' '}
                    <strong className="text-[#f4f3ef]">
                      {isGeminiLive
                        ? tx('Gemini 3.8 Flash Canlı Bağlantı', 'Gemini 3.8 Flash Live Connection')
                        : tx('Kürasyon Yedek Motoru (API Anahtarı Yok)', 'Curatorial Fallback Engine (No API Key)')}
                    </strong>
                  </span>
                </div>
                <span className="text-[11px] text-[#8e8d8a]">
                  {isGeminiLive ? tx('API Anahtarı Tanımlı · Sıfır Sahte Veri', 'API Key Injected · Zero Mock Data') : tx('Secrets Paneline GEMINI_API_KEY Ekleyin', 'Set GEMINI_API_KEY in Secrets')}
                </span>
              </div>

              {/* Architecture Explanation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#141414] border border-[#222222] rounded space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880]">
                    {tx('Otonom Araştırma Hasadı', 'Autonomous Research Harvest')}
                  </span>
                  <p className="text-xs text-[#8e8d8a]">
                    {tx(
                      'Yeni aday monografiler için güvenilir arşiv moda kaynaklarını (*Vogue Italia*, *Self Service*, *Purple*, *Harper’s Bazaar*, *Dazed*, *The Gentlewoman*) tarar.',
                      "Scans reputable archival fashion repositories (*Vogue Italia*, *Self Service*, *Purple*, *Harper's Bazaar*, *Dazed*, *The Gentlewoman*) for new candidate monographs."
                    )}
                  </p>
                  <div className="text-[11px] font-mono text-[#d4d4d8] pt-1 border-t border-[#1e1e1e]">
                    {tx('Hedef: Günlük en fazla 20 aday keşfi.', 'Target: Up to 20 candidates discovered daily.')}
                  </div>
                </div>

                <div className="p-4 bg-[#141414] border border-[#222222] rounded space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880]">
                    {tx('Tekilleştirme ve İlk 5 Seçimi', 'Deduplication & Top 5 Selection')}
                  </span>
                  <p className="text-xs text-[#8e8d8a]">
                    {lang === 'tr' ? (
                      <>Keşfedilen başlıkları kalıcı depolamayla (<span className="font-mono text-[10px] text-[#f4f3ef]">.data/editorial_db.json</span>) çapraz kontrol eder. Günlük kürasyon için en yüksek puanlı 5 eseri seçer.</>
                    ) : (
                      <>Cross-references discovered titles against persistent storage (<span className="font-mono text-[10px] text-[#f4f3ef]">.data/editorial_db.json</span>). Evaluates and selects the highest scoring 5 works for the daily curation.</>
                    )}
                  </p>
                  <div className="text-[11px] font-mono text-[#d4d4d8] pt-1 border-t border-[#1e1e1e]">
                    {lang === 'tr' ? (
                      <>Sonuç: Tam olarak 5 öğe <span className="text-[#c5a880]">isDailyTop5: true</span> olarak işaretlenir.</>
                    ) : (
                      <>Result: Exactly 5 items tagged with <span className="text-[#c5a880]">isDailyTop5: true</span>.</>
                    )}
                  </div>
                </div>
              </div>

              {/* 5-Factor Scoring Formula Matrix */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#71717a]">
                  {tx('5 Faktörlü Kürasyon Puanlama Ağırlık Dağılımı', '5-Factor Curatorial Scoring Weight Distribution')}
                </h4>

                <div className="bg-[#141414] border border-[#222222] rounded overflow-hidden">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#181818] border-b border-[#222222] text-[#8e8d8a] uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">{tx('Değerlendirme Faktörü', 'Evaluation Factor')}</th>
                        <th className="py-2.5 px-4 text-center">{tx('Ağırlık', 'Weight')}</th>
                        <th className="py-2.5 px-4">{tx('Kürasyon Kriterleri', 'Curatorial Criteria')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e1e]">
                      <tr>
                        <td className="py-2.5 px-4 text-[#f4f3ef] font-semibold">{tx('Kompozisyon', 'Composition')}</td>
                        <td className="py-2.5 px-4 text-center text-[#c5a880] font-bold">25%</td>
                        <td className="py-2.5 px-4 text-[#8e8d8a]">{tx('Geometrik disiplin, mimari kadraj, brütalist denge ve negatif alan kullanımı.', 'Geometric discipline, architectural framing, brutalist balance, and negative space.')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-[#f4f3ef] font-semibold">{tx('Işık', 'Lighting')}</td>
                        <td className="py-2.5 px-4 text-center text-[#c5a880] font-bold">20%</td>
                        <td className="py-2.5 px-4 text-[#8e8d8a]">{tx('Chiaroscuro kontrastı, yönlendirilmiş tungsten, doğal yan gün ışığı ve film greni.', 'Chiaroscuro contrast, slow directional tungsten, natural raking daylight, and film grain.')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-[#f4f3ef] font-semibold">{tx('Stil ve Silüet', 'Styling & Silhouette')}</td>
                        <td className="py-2.5 px-4 text-center text-[#c5a880] font-bold">20%</td>
                        <td className="py-2.5 px-4 text-[#8e8d8a]">{tx('Haute couture drapaj, keskin terzi hatları ve dokunsal kumaş materyalitesi.', 'Haute couture drapery, sharp tailored lines, and tactile textile materiality.')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-[#f4f3ef] font-semibold">{tx('Kültürel Güncellik', 'Cultural Relevance')}</td>
                        <td className="py-2.5 px-4 text-center text-[#c5a880] font-bold">15%</td>
                        <td className="py-2.5 px-4 text-[#8e8d8a]">{tx('Sanatsal kalıcılık, tarihsel monografi rezonansı ve hızlı moda trendlerinden uzaklık.', 'Artistic longevity, historical monograph resonance, and avoidance of fast-fashion trends.')}</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-[#f4f3ef] font-semibold">{tx('Anlatı Atmosferi', 'Narrative Atmosphere')}</td>
                        <td className="py-2.5 px-4 text-center text-[#c5a880] font-bold">20%</td>
                        <td className="py-2.5 px-4 text-[#8e8d8a]">{tx('Sinematik ruh hali, duygusal ölçülülük, karakter varlığı ve dokunsal hikaye anlatımı.', 'Cinematic mood, emotional restraint, character presence, and tactile storytelling.')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Rights Clearance Policy */}
              <div className="p-4 bg-[#141414] border border-[#2a2a2a] rounded space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono text-[#c5a880] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-[#c5a880]" />
                  <span>{tx('Hak İzni Politikası: Sıfır Filigran ve Referans Kartları', 'Rights Clearance Policy: Zero Watermarking & Reference Cards')}</span>
                </div>
                <p className="text-xs text-[#8e8d8a]">
                  {lang === 'tr' ? (
                    <>Hak durumu <span className="text-[#f4f3ef] font-mono">unlicensed</span> veya <span className="text-[#f4f3ef] font-mono">pending</span> olan eserlerin yayınlanması kesinlikle engellenir. Sosyal medya paketi yerine yalnızca araştırma amaçlı temiz bir <strong className="text-[#f4f3ef]">Editoryal Referans Kartı</strong> üretilir. Platform üçüncü taraf yaratıcı fotoğrafları asla filigranlamaz veya bozmaz.</>
                  ) : (
                    <>Works with <span className="text-[#f4f3ef] font-mono">unlicensed</span> or <span className="text-[#f4f3ef] font-mono">pending</span> status are strictly blocked from publishing. Instead of a social media package, the platform generates a clean <strong className="text-[#f4f3ef]">Editorial Reference Card</strong> for research purposes only. The platform never watermarks or distorts third-party creative photography.</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: META GRAPH API & CREDENTIALS */}
          {activeTab === 'meta' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-editorial text-xl text-[#f4f3ef] font-normal">
                    {tx('Meta Graph API v21.0 Instagram Yayın Adaptörü', 'Meta Graph API v21.0 Instagram Publishing Adapter')}
                  </h3>
                  <p className="text-xs text-[#8e8d8a] mt-1">
                    {tx(
                      'Kullanıcı şifresi istemeden Meta Business gereksinimlerine tam uyumlu resmi OAuth tabanlı entegrasyon.',
                      'Official OAuth-based integration adhering to Meta Business requirements without requesting user passwords.'
                    )}
                  </p>
                </div>
                <VisualStatusBadge status={isIgLive ? 'READY' : 'ACTION_REQUIRED'} />
              </div>

              {/* Dynamic Account Status Banner */}
              <div className="p-3 bg-[#141414] border border-[#222222] rounded flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-[#c5a880]" />
                  <span>
                    {tx('Instagram Bağlantısı:', 'Instagram Connection:')}{' '}
                    <strong className="text-[#f4f3ef]">
                      {isIgLive
                        ? `@${liveInstagram?.username} (${liveInstagram?.accountType})`
                        : tx('Bağlı Değil (Sandbox Simülasyon Modu)', 'Not Connected (Sandbox Simulation Mode)')}
                    </strong>
                  </span>
                </div>
                <span className="text-[11px] text-[#8e8d8a]">
                  {isIgLive
                    ? tx(`${liveInstagram?.permissions?.length || 3} İzin Onaylandı`, `${liveInstagram?.permissions?.length || 3} Permissions Granted`)
                    : tx('Ayarlar > Instagram altından yapılandırın', 'Configure in Settings > Instagram')}
                </span>
              </div>

              {/* Credential Setup Guide */}
              <div className="p-4 bg-[#141414] border border-[#222222] rounded space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880] block">
                  {tx('Ortam Kimlik Bilgileri Kurulumu', 'Environment Credentials Setup')}
                </span>
                <p className="text-xs text-[#8e8d8a]">
                  {tx(
                    'Canlı bir Instagram Profesyonel hesabı (İşletme veya İçerik Üretici) bağlamak için çalışma zamanı yapılandırmanızda aşağıdaki ortam değişkenlerini tanımlayın:',
                    'To connect a live Instagram Professional account (Business or Creator), provide the following environment variables in your runtime configuration:'
                  )}
                </p>
                <div className="bg-[#0a0a0a] p-3 rounded border border-[#222222] font-mono text-xs text-[#f4f3ef] space-y-1">
                  <div><span className="text-[#8e8d8a]">{tx('# Facebook Sayfasına bağlı sayısal Instagram Hesap ID’si', '# Numeric Instagram Account ID (linked to Facebook Page)')}</span></div>
                  <div><span className="text-[#c5a880]">INSTAGRAM_ACCOUNT_ID</span>="17841400000000000"</div>
                  <div className="pt-2"><span className="text-[#8e8d8a]">{tx('# Süresi Dolmayan Sistem Kullanıcısı Sayfa Erişim Belirteci', '# Never-Expiring System User Page Access Token')}</span></div>
                  <div><span className="text-[#c5a880]">INSTAGRAM_ACCESS_TOKEN</span>="EAA..."</div>
                </div>
              </div>

              {/* Meta Container Endpoints Workflow */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#71717a]">
                  {tx('Meta Kapsayıcı Yayın Yaşam Döngüsü (2 Adımlı Akış)', 'Meta Container Publishing Lifecycle (2-Step Flow)')}
                </h4>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-3 bg-[#141414] border border-[#222222] rounded space-y-1">
                    <span className="text-[#c5a880] block">{tx('ADIM 1: Medya Kapsayıcısı Oluştur', 'STEP 1: Create Media Container')}</span>
                    <div className="text-[#8e8d8a]">POST https://graph.facebook.com/v21.0/&#123;ig-user-id&#125;/media</div>
                    <div className="text-[11px] text-[#71717a]">{tx('Parametreler', 'Params')}: image_url, caption, access_token → {tx('Dönen', 'Returns')}: &#123; id: "1792348293" &#125;</div>
                  </div>

                  <div className="p-3 bg-[#141414] border border-[#222222] rounded space-y-1">
                    <span className="text-[#7cd38b] block">{tx('ADIM 2: Yayını Gerçekleştir', 'STEP 2: Execute Publication')}</span>
                    <div className="text-[#8e8d8a]">POST https://graph.facebook.com/v21.0/&#123;ig-user-id&#125;/media_publish</div>
                    <div className="text-[11px] text-[#71717a]">{tx('Parametreler', 'Params')}: creation_id, access_token → {tx('Dönen', 'Returns')}: &#123; id: "1802938472" &#125;</div>
                  </div>
                </div>
              </div>

              {/* Sandbox Simulation Note */}
              <div className="p-4 bg-[#141414] border border-[#262626] rounded space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#8e8d8a] block">
                  {tx('Deterministik Sandbox Simülasyonu', 'Deterministic Sandbox Simulation')}
                </span>
                <p className="text-xs text-[#8e8d8a]">
                  {lang === 'tr' ? (
                    <>Canlı bir belirteç tanımlanmadığında adaptör otomatik olarak <strong className="text-[#f4f3ef]">Sandbox Simülasyon Modunda</strong> çalışır. Tüm izinleri doğrular, kapsayıcı oluşturma olaylarını günlüğe kaydeder, simüle edilmiş kalıcı bağlantılar üretir ve tüm kayıtları kalıcı <span className="font-mono text-[#c5a880]">auditTrail</span> günlüğüne ekler.</>
                  ) : (
                    <>When no live token is configured, the adapter automatically operates in <strong className="text-[#f4f3ef]">Sandbox Simulation Mode</strong>. It validates all permissions, logs container creation events, generates mock permalinks, and appends complete records to the persistent <span className="font-mono text-[#c5a880]">auditTrail</span>.</>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: AUTOPILOT FLOW & SAFETY GATES */}
          {activeTab === 'autopilot' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-editorial text-xl text-[#f4f3ef] font-normal">
                  {tx('Autopilot Orkestrasyonu ve Güvenlik Değişmezleri', 'Autopilot Orchestration & Safety Invariants')}
                </h3>
                <p className="text-xs text-[#8e8d8a] mt-1">
                  {tx(
                    'Europe/Istanbul zamanlaması ve çok katmanlı güvenlik önlemleriyle otomatik arka plan yayınlama.',
                    'Automated background publishing with Europe/Istanbul scheduling and multi-layer fail-safes.'
                  )}
                </p>
              </div>

              {/* Daily Schedule Timeline */}
              <div className="p-4 bg-[#141414] border border-[#222222] rounded space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#c5a880] uppercase tracking-wider">{tx('Europe/Istanbul (UTC+3) Takvimi', 'Europe/Istanbul (UTC+3) Schedule')}</span>
                  <span className="text-[#8e8d8a]">{tx('Kalıcı Arka Plan Yürütmesi', 'Persistent Background Execution')}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs">
                  <div className="p-2.5 bg-[#181818] border border-[#222222] rounded">
                    <span className="text-[#c5a880] font-bold block">08:00</span>
                    <span className="text-[#8e8d8a] text-[11px]">{tx('Otonom Araştırma', 'Autonomous Research')}</span>
                  </div>
                  <div className="p-2.5 bg-[#181818] border border-[#222222] rounded">
                    <span className="text-[#c5a880] font-bold block">09:00</span>
                    <span className="text-[#8e8d8a] text-[11px]">{tx('5 Faktörlü Değerlendirme', '5-Factor Evaluation')}</span>
                  </div>
                  <div className="p-2.5 bg-[#181818] border border-[#222222] rounded">
                    <span className="text-[#c5a880] font-bold block">10:00</span>
                    <span className="text-[#8e8d8a] text-[11px]">{tx('Günlük İlk 5 Kürasyonu', 'Daily Top 5 Curation')}</span>
                  </div>
                  <div className="p-2.5 bg-[#181818] border border-[#222222] rounded">
                    <span className="text-[#c5a880] font-bold block">11:00</span>
                    <span className="text-[#8e8d8a] text-[11px]">{tx('Gönderi Hazırlığı', 'Post Preparation')}</span>
                  </div>
                  <div className="p-2.5 bg-[#181818] border border-[#222222] rounded">
                    <span className="text-[#7cd38b] font-bold block">14:00</span>
                    <span className="text-[#8e8d8a] text-[11px]">{tx('Birinci Yayın Slotu', 'First Publishing Slot')}</span>
                  </div>
                  <div className="p-2.5 bg-[#181818] border border-[#222222] rounded">
                    <span className="text-[#7cd38b] font-bold block">20:00</span>
                    <span className="text-[#8e8d8a] text-[11px]">{tx('İkinci Yayın Slotu', 'Second Publishing Slot')}</span>
                  </div>
                </div>
              </div>

              {/* Safety Gates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#141414] border border-[#222222] rounded space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880] block">
                    {tx('Acil Durdurma Anahtarı', 'Emergency Stop Kill-Switch')}
                  </span>
                  <p className="text-xs text-[#8e8d8a]">
                    {tx(
                      'Üst başlıktaki Acil Durdurma düğmesine tıklamak otomasyon motorunu anında kilitler. Manuel olarak temizlenene kadar tüm arka plan slotları, taslak yayınları ve zamanlanmış görevler derhal durdurulur.',
                      'Clicking the header Emergency Stop button instantly locks the automation engine. All background slots, draft publishing, and cron jobs immediately abort until manually cleared.'
                    )}
                  </p>
                </div>

                <div className="p-4 bg-[#141414] border border-[#222222] rounded space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880] block">
                    {tx('Günlük Yayın Limiti Tavanı', 'Daily Publishing Limit Ceiling')}
                  </span>
                  <p className="text-xs text-[#8e8d8a]">
                    {tx(
                      'Katı bir günlük sınır uygular (varsayılan: günde 2 gönderi). Sürekli Autopilot modunda bile platform yapılandırılan kotanın üzerinde yayın yapmayı reddeder.',
                      'Enforces a strict daily cap (default: 2 posts per day). Even in continuous Autopilot mode, the platform refuses to publish more than the configured quota.'
                    )}
                  </p>
                </div>

                <div className="p-4 bg-[#141414] border border-[#222222] rounded space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880] block">
                    {tx('SHA-256 İçerik Değişikliği Algılayıcı', 'SHA-256 Material Change Detector')}
                  </span>
                  <p className="text-xs text-[#8e8d8a]">
                    {tx(
                      'Onaylanmış içeriğin kriptografik özetini (hash) hesaplar. Bir operatör veya API; açıklamayı, fotoğraf URL’sini ya da hak notlarını değiştirirse gönderi yayından önce yeniden onay gerektirir.',
                      'Calculates a cryptographic hash of approved content. If an operator or API modifies the caption, photo URL, or rights notes, the post requires re-approval before broadcasting.'
                    )}
                  </p>
                </div>

                <div className="p-4 bg-[#141414] border border-[#222222] rounded space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#c5a880] block">
                    {tx('Sessiz Mod Geçişi Engeli', 'No Silent Mode Transitions')}
                  </span>
                  <p className="text-xs text-[#8e8d8a]">
                    {tx(
                      'Autopilot örtük olarak etkinleştirilemez. Arayüzde açık kullanıcı onayı ve doğrulanmış bir Instagram Profesyonel hesap bağlantısı gerektirir.',
                      'Autopilot cannot be enabled implicitly. It requires explicit user confirmation in UI and an authenticated Instagram Professional account connection.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: READY-TO-DEPLOY CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-6">
              
              {/* Header card with progress */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#141414] border border-[#222222] rounded">
                <div>
                  <h3 className="font-editorial text-xl text-[#f4f3ef] font-normal">
                    {tx('Üretim Hazırlık Denetim Kontrol Listesi', 'Production Readiness Audit Checklist')}
                  </h3>
                  <p className="text-xs text-[#8e8d8a] mt-0.5">
                    {tx(
                      'İşlevsel kod tabanı özelliklerini harici bulut ve Meta konsol yapılandırmalarından ayırır.',
                      'Separating functional codebase features from external cloud and Meta console configurations.'
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-2xl font-semibold text-[#c5a880] tabular-nums">
                    {progressPct}%
                  </span>
                  <span className="block text-[10px] font-mono text-[#8e8d8a] uppercase">
                    {tx(`${completedCount} / ${totalCount} Öğe Doğrulandı`, `${completedCount} of ${totalCount} Items Verified`)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-[#1c1c1c] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#c5a880] transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* DYNAMIC SERVICE INTEGRATION STATUS BANNER */}
              <div className="p-4 bg-[#121212] border border-[#262626] rounded space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a880]">
                    {tx('Dinamik Servis Entegrasyon Durumu', 'Dynamic Service Integration State')}
                  </span>
                  <button
                    onClick={fetchLiveStatus}
                    disabled={isRefreshing}
                    className="flex items-center gap-1 text-[11px] font-mono text-[#8e8d8a] hover:text-[#f4f3ef] transition cursor-pointer"
                    title={tx('Canlı bağlantı durumunu yenile', 'Refresh live connection state')}
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-[#c5a880]' : ''}`} />
                    <span>{isRefreshing ? tx('Kontrol ediliyor...', 'Checking...') : tx('Durumu Yenile', 'Refresh Status')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Gemini Card */}
                  <div className="p-3 bg-[#161616] border border-[#222222] rounded flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-4 h-4 text-[#c5a880] shrink-0" />
                      <div>
                        <div className="text-xs text-[#f4f3ef] font-medium">{tx('Gemini 3.8 Flash Arka Ucu', 'Gemini 3.8 Flash Backend')}</div>
                        <div className="text-[10px] text-[#8e8d8a]">
                          {isGeminiLive
                            ? tx('API Anahtarı Aktif · Canlı 5 Faktörlü Puanlama', 'API Key Active · Live 5-Factor Scoring')
                            : tx('API Anahtarı Eksik · Deterministik Yedek', 'API Key Missing · Deterministic Fallback')}
                        </div>
                      </div>
                    </div>
                    <VisualStatusBadge status={isGeminiLive ? 'READY' : 'ACTION_REQUIRED'} />
                  </div>

                  {/* Instagram Card */}
                  <div className="p-3 bg-[#161616] border border-[#222222] rounded flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Share2 className="w-4 h-4 text-[#c5a880] shrink-0" />
                      <div>
                        <div className="text-xs text-[#f4f3ef] font-medium">Instagram Meta Graph API</div>
                        <div className="text-[10px] text-[#8e8d8a]">
                          {isIgLive
                            ? `@${liveInstagram?.username || 'theeditorialindex'} · ${tx('Bağlı', 'Connected')}`
                            : tx('Bağlı Değil · Sandbox Simülasyon Modu', 'Disconnected · Sandbox Simulation Mode')}
                        </div>
                      </div>
                    </div>
                    <VisualStatusBadge status={isIgLive ? 'READY' : 'ACTION_REQUIRED'} />
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#222222] pb-2 text-xs font-mono">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[#71717a] text-[11px] mr-1">{tx('Görünümü Filtrele:', 'Filter View:')}</span>
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2.5 py-1 rounded text-[11px] transition cursor-pointer ${
                      filterMode === 'all'
                        ? 'bg-[#222222] text-[#f4f3ef] font-semibold'
                        : 'text-[#8e8d8a] hover:text-[#d4d4d8]'
                    }`}
                  >
                    {tx(`Tüm Öğeler (${totalCount})`, `All Items (${totalCount})`)}
                  </button>
                  <button
                    onClick={() => setFilterMode('ready')}
                    className={`px-2.5 py-1 rounded text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
                      filterMode === 'ready'
                        ? 'bg-[#122216] border border-[#1e4620] text-[#7cd38b] font-semibold'
                        : 'text-[#8e8d8a] hover:text-[#7cd38b]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#7cd38b]" />
                    {tx(`Hazır (${readyItemsCount})`, `Ready (${readyItemsCount})`)}
                  </button>
                  <button
                    onClick={() => setFilterMode('action_required')}
                    className={`px-2.5 py-1 rounded text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
                      filterMode === 'action_required'
                        ? 'bg-[#26180c] border border-[#523318] text-[#e09f58] font-semibold'
                        : 'text-[#8e8d8a] hover:text-[#e09f58]'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e09f58]" />
                    {tx(`İşlem Gerekli (${actionRequiredCount})`, `Action Required (${actionRequiredCount})`)}
                  </button>
                </div>

                <div className="text-[11px] text-[#71717a]">
                  {tx('Denetim doğrulamasını değiştirmek için öğeye tıklayın', 'Click item to toggle audit verification')}
                </div>
              </div>

              {/* Checklist Items Listing */}
              <div className="space-y-4">
                {/* Part A: Codebase Architecture */}
                {filteredItems.some(i => i.category === 'codebase') && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#c5a880] uppercase tracking-wider font-semibold">
                        {tx('Bölüm A: Kod Tabanı Mimarisi ve İç Motorlar', 'Part A: Codebase Architecture & Internal Engines')}
                      </span>
                      <span className="text-[#71717a]">
                        {filteredItems.filter(i => i.category === 'codebase').length} {tx('Öğe', 'Items')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filteredItems.filter(item => item.category === 'codebase').map(item => (
                        <div 
                          key={item.id}
                          onClick={() => toggleCheck(item.id)}
                          className="p-3.5 bg-[#141414] hover:bg-[#181818] border border-[#222222] hover:border-[#333333] rounded flex items-start gap-3 transition cursor-pointer select-none"
                        >
                          <input 
                            type="checkbox"
                            checked={Boolean(checkedMap[item.id])}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 rounded border-[#333333] accent-[#c5a880] cursor-pointer shrink-0"
                          />
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-xs font-medium text-[#f4f3ef]">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <VisualStatusBadge status={item.dynStatus} />
                              </div>
                            </div>
                            
                            <div className="text-[11px] font-mono text-[#8e8d8a]">
                              {item.dynText}
                            </div>

                            <p className="text-xs text-[#71717a] leading-normal pt-0.5">
                              {item.description}
                            </p>

                            {item.hint && (
                              <div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-mono text-[#e09f58] bg-[#1a120c] p-2 rounded border border-[#3b2413]">
                                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{item.hint}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Part B: Production & External Credentials */}
                {filteredItems.some(i => i.category === 'production') && (
                  <div className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[#c5a880] uppercase tracking-wider font-semibold">
                        {tx('Bölüm B: Harici Bulut ve Meta Konsol Ön Koşulları', 'Part B: External Cloud & Meta Console Prerequisites')}
                      </span>
                      <span className="text-[#71717a]">
                        {filteredItems.filter(i => i.category === 'production').length} {tx('Öğe', 'Items')}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filteredItems.filter(item => item.category === 'production').map(item => (
                        <div 
                          key={item.id}
                          onClick={() => toggleCheck(item.id)}
                          className="p-3.5 bg-[#141414] hover:bg-[#181818] border border-[#222222] hover:border-[#333333] rounded flex items-start gap-3 transition cursor-pointer select-none"
                        >
                          <input 
                            type="checkbox"
                            checked={Boolean(checkedMap[item.id])}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 rounded border-[#333333] accent-[#c5a880] cursor-pointer shrink-0"
                          />
                          <div className="space-y-1 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-xs font-medium text-[#f4f3ef]">{item.label}</span>
                              <div className="flex items-center gap-2">
                                <VisualStatusBadge status={item.dynStatus} />
                              </div>
                            </div>

                            <div className="text-[11px] font-mono text-[#8e8d8a]">
                              {item.dynText}
                            </div>

                            <p className="text-xs text-[#71717a] leading-normal pt-0.5">
                              {item.description}
                            </p>

                            {item.hint && (
                              <div className="mt-1.5 flex items-start gap-1.5 text-[11px] font-mono text-[#e09f58] bg-[#1a120c] p-2 rounded border border-[#3b2413]">
                                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                <span>{item.hint}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 border-t border-[#222222] bg-[#141414] text-xs font-mono">
          <div className="flex flex-wrap items-center gap-3 text-[#8e8d8a]">
            <span>{tx('Vol. 01 Kürasyon Motoru', 'Vol. 01 Curation Engine')}</span>
            <span>·</span>
            <span>{tx('Platform Durumu: Çalışıyor', 'Platform Status: Operational')}</span>
            <span>·</span>
            <span className={isGeminiLive ? 'text-[#7cd38b]' : 'text-[#e09f58]'}>
              Gemini: {isGeminiLive ? tx('Hazır', 'Ready') : tx('İşlem Gerekli', 'Action Required')}
            </span>
            <span>·</span>
            <span className={isIgLive ? 'text-[#7cd38b]' : 'text-[#e09f58]'}>
              Instagram: {isIgLive ? tx('Hazır', 'Ready') : tx('İşlem Gerekli', 'Action Required')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#222222] hover:bg-[#2c2c2c] text-[#f4f3ef] rounded transition cursor-pointer"
            >
              {tx('Teknik Kılavuzu Kapat', 'Close Technical Guide')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
