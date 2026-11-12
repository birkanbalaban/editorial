import React from 'react';
import { OperationMode } from '../types/editorial';
import { AlertOctagon, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

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
  const tabs = [
    { id: 'daily-selection', label: 'Daily Selection' },
    { id: 'ai-search-engine', label: 'AI Search Engine' },
    { 
      id: 'approval-queue', 
      label: pendingApprovalsCount > 0 ? `Approval Queue (${pendingApprovalsCount})` : 'Approval Queue' 
    },
    { id: 'post-packages', label: 'Post Packages' },
    { id: 'automation-engine', label: 'Automation Engine' },
    { id: 'instagram-adapter', label: 'Instagram Adapter' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'editorial-learning', label: 'Learning Signals' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="border-b border-[#222222] bg-[#0d0d0d]/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      {/* Emergency Stop Strip if Active */}
      {emergencyStop && (
        <div className="bg-[#450a0a] border-b border-[#7f1d1d] px-6 py-2 flex items-center justify-between text-xs text-[#fca5a5]">
          <div className="flex items-center gap-2 font-medium">
            <AlertOctagon className="w-4 h-4 text-[#ef4444]" />
            <span>EMERGENCY STOP ACTIVE: All automated publishing, API connections, and queue jobs are halted.</span>
          </div>
          <button
            onClick={onToggleEmergencyStop}
            className="px-3 py-1 bg-[#ef4444] text-white rounded text-xs hover:bg-[#dc2626] transition font-medium"
          >
            Resume Operations
          </button>
        </div>
      )}

      {/* Top Bar 3-Zone Contract */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 overflow-hidden">
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
              Autonomous Fashion Publishing
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

        {/* Zone 3: Mode Status & Emergency Control */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mode Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 rounded bg-[#181818] border border-[#262626] text-xs">
            <span className="text-[10px] uppercase tracking-wider text-[#8e8d8a] hidden sm:inline">Mode</span>
            <span className="font-semibold text-xs tracking-wide text-[#f4f3ef]">
              {mode}
            </span>
            {mode === 'AUTOPILOT' && <Zap className="w-3 h-3 text-[#c5a880]" />}
            {mode === 'APPROVAL' && <CheckCircle2 className="w-3 h-3 text-[#a1a1aa]" />}
            {mode === 'MANUAL' && <ShieldCheck className="w-3 h-3 text-[#71717a]" />}
          </div>

          {/* Emergency Stop Switch */}
          <button
            onClick={onToggleEmergencyStop}
            title={emergencyStop ? 'Emergency stop active - click to reset' : 'Click to halt all publishing'}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
              emergencyStop
                ? 'bg-[#ef4444] text-white animate-pulse hover:bg-[#dc2626]'
                : 'bg-[#181818] border border-[#3f1f1f] text-[#ef4444] hover:bg-[#2a1212]'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{emergencyStop ? 'STOPPED' : 'EMERGENCY STOP'}</span>
            <span className="sm:hidden">{emergencyStop ? 'STOPPED' : 'STOP'}</span>
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
