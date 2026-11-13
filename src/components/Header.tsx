import React from 'react';
import { OperationMode } from '../types/editorial';
import { AlertOctagon, CheckCircle2, Globe, ShieldCheck, Zap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface HeaderProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  mode: OperationMode;
  emergencyStop: boolean;
  onToggleEmergencyStop: () => void;
  pendingApprovalsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  mode,
  emergencyStop,
  onToggleEmergencyStop,
  pendingApprovalsCount,
}) => {
  const { lang, setLang, tx, formatMode } = useLanguage();

  const tabs = [
    { id: 'daily-selection', label: tx('Günlük Seçim', 'Daily Selection') },
    { id: 'ai-search-engine', label: tx('AI Arama', 'AI Search Engine') },
    {
      id: 'approval-queue',
      label:
        pendingApprovalsCount > 0
          ? `${tx('Onay Kuyruğu', 'Approval Queue')} (${pendingApprovalsCount})`
          : tx('Onay Kuyruğu', 'Approval Queue'),
    },
    { id: 'post-packages', label: tx('Post Paketleri', 'Post Packages') },
    { id: 'automation-engine', label: tx('Otomasyon', 'Automation Engine') },
    { id: 'instagram-adapter', label: tx('Instagram', 'Instagram Adapter') },
    { id: 'analytics', label: tx('Analitik', 'Analytics') },
    { id: 'editorial-learning', label: tx('Öğrenme', 'Learning Signals') },
    { id: 'settings', label: tx('Ayarlar', 'Settings') },
  ];

  return (
    <header className="border-b border-[#222222] bg-[#0d0d0d]/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      {/* Emergency Stop Strip if Active */}
      {emergencyStop && (
        <div className="bg-[#450a0a] border-b border-[#7f1d1d] px-6 py-2 flex items-center justify-between gap-4 text-xs text-[#fca5a5]">
          <div className="flex items-center gap-2 font-medium">
            <AlertOctagon className="w-4 h-4 text-[#ef4444] shrink-0" />
            <span>
              {tx(
                'ACİL DURDURMA AKTİF: Tüm otomatik yayınlar, API bağlantıları ve kuyruk işleri durduruldu.',
                'EMERGENCY STOP ACTIVE: All automated publishing, API connections, and queue jobs are halted.'
              )}
            </span>
          </div>
          <button
            onClick={onToggleEmergencyStop}
            className="px-3 py-1 bg-[#ef4444] text-white rounded text-xs hover:bg-[#dc2626] transition font-medium whitespace-nowrap shrink-0 cursor-pointer"
          >
            {tx('İşlemleri Sürdür', 'Resume Operations')}
          </button>
        </div>
      )}

      {/* Top Bar 3-Zone Contract */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 overflow-hidden">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onTabChange('daily-selection')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="font-editorial text-lg sm:text-xl font-semibold tracking-wider text-[#f4f3ef] uppercase group-hover:text-white transition-colors">
              THE EDITORIAL INDEX
            </span>
            <span className="block text-[9px] sm:text-[10px] tracking-widest uppercase text-[#8e8d8a] -mt-1 font-sans">
              {tx('Otonom Moda Yayıncılığı', 'Autonomous Fashion Publishing')}
            </span>
          </button>
        </div>

        {/* Zone 2: Clean single-line nav links for desktop */}
        <nav className="hidden xl:flex items-center gap-3.5 text-[11px] tracking-wider uppercase font-medium overflow-x-auto no-scrollbar min-w-0">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`transition-colors whitespace-nowrap cursor-pointer pb-1 border-b shrink-0 ${
                  isActive
                    ? 'text-[#f4f3ef] border-[#c5a880]'
                    : 'text-[#8e8d8a] border-transparent hover:text-[#d4d4d8]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Mode Status, 1-Click TR/EN Switcher & Emergency Control */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Mode Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#181818] border border-[#262626] text-xs whitespace-nowrap shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-[#8e8d8a] hidden sm:inline">
              {tx('Mod', 'Mode')}
            </span>
            <span className="font-semibold text-[11px] tracking-wide text-[#f4f3ef]">
              {formatMode(mode)}
            </span>
            {mode === 'AUTOPILOT' && <Zap className="w-3 h-3 text-[#c5a880]" />}
            {mode === 'APPROVAL' && <CheckCircle2 className="w-3 h-3 text-[#a1a1aa]" />}
            {mode === 'MANUAL' && <ShieldCheck className="w-3 h-3 text-[#71717a]" />}
          </div>

          {/* 1-Click TR / EN Language Toggle */}
          <div
            role="group"
            aria-label={tx('Arayüz Dili', 'Interface Language')}
            className="flex items-center p-0.5 rounded bg-[#181818] border border-[#262626] text-[11px] font-mono shrink-0"
          >
            <Globe className="w-3 h-3 text-[#8e8d8a] ml-1.5 mr-1 hidden sm:inline shrink-0" />
            <button
              type="button"
              onClick={() => setLang('tr')}
              aria-pressed={lang === 'tr'}
              title={tx('Türkçe arayüzü seç', 'Switch interface to Turkish')}
              className={`px-2 py-1 rounded transition cursor-pointer whitespace-nowrap shrink-0 ${
                lang === 'tr'
                  ? 'bg-[#c5a880] text-[#0a0a0a] font-bold'
                  : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
              }`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              aria-pressed={lang === 'en'}
              title={tx('İngilizce arayüze geç', 'Switch interface to English')}
              className={`px-2 py-1 rounded transition cursor-pointer whitespace-nowrap shrink-0 ${
                lang === 'en'
                  ? 'bg-[#c5a880] text-[#0a0a0a] font-bold'
                  : 'text-[#8e8d8a] hover:text-[#f4f3ef]'
              }`}
            >
              EN
            </button>
          </div>

          {/* Emergency Stop Switch */}
          <button
            onClick={onToggleEmergencyStop}
            title={
              emergencyStop
                ? tx('Acil durdurma aktif - sıfırlamak için tıklayın', 'Emergency stop active - click to reset')
                : tx('Tüm yayınları anında durdurmak için tıklayın', 'Click to halt all publishing')
            }
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              emergencyStop
                ? 'bg-[#ef4444] text-white animate-pulse hover:bg-[#dc2626]'
                : 'bg-[#181818] border border-[#3f1f1f] text-[#ef4444] hover:bg-[#2a1212]'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">
              {emergencyStop ? tx('DURDURULDU', 'STOPPED') : tx('ACİL DURDUR', 'EMERGENCY STOP')}
            </span>
            <span className="sm:hidden">
              {emergencyStop ? tx('DURDU', 'STOPPED') : tx('DURDUR', 'STOP')}
            </span>
          </button>
        </div>
      </div>

      {/* Responsive horizontal scrollable nav bar for tablet / mobile */}
      <div className="xl:hidden flex items-center overflow-x-auto px-4 sm:px-6 py-2 border-t border-[#1e1e1e] gap-4 text-xs uppercase tracking-wider no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap pb-1 cursor-pointer transition ${
              currentTab === tab.id ? 'text-white border-b border-[#c5a880]' : 'text-[#8e8d8a]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </header>
  );
};
