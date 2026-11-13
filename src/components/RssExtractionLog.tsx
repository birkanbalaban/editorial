import React, { useState } from 'react';
import {
  Terminal,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export interface RssLogEntry {
  timestamp: string;
  message: string;
}

interface RssExtractionLogProps {
  entries: RssLogEntry[];
  lastEventSummary: string;
  lastEventTimestamp?: string | null;
  status: 'idle' | 'running' | 'success' | 'failed';
  onClear: () => void;
}

export const RssExtractionLog: React.FC<RssExtractionLogProps> = ({
  entries,
  lastEventSummary,
  lastEventTimestamp,
  status,
  onClear,
}) => {
  const { tx } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entries.length === 0) return;
    const text = entries
      .map((entry) => `[${entry.timestamp}] ${entry.message}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback unavailable
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear();
  };

  const statusColorClass =
    status === 'running'
      ? 'text-[#c5a880]'
      : status === 'failed'
      ? 'text-[#ef4444]'
      : status === 'success'
      ? 'text-[#a3e635]'
      : 'text-[#8e8d8a]';

  const statusLabel =
    status === 'running'
      ? tx('Taranıyor', 'Scanning')
      : status === 'failed'
      ? tx('Hata', 'Error')
      : status === 'success'
      ? tx('Son Olay', 'Last Event')
      : tx('Beklemede', 'Idle');

  return (
    <div className="bg-[#0e0e0e] border border-[#222222] rounded overflow-hidden">
      {/* Default Collapsed Summary Row */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-[#141414] transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c5a880]"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1 text-[11px] font-mono">
          {status === 'running' ? (
            <Loader2 className="w-3.5 h-3.5 text-[#c5a880] animate-spin shrink-0" />
          ) : status === 'failed' ? (
            <AlertCircle className="w-3.5 h-3.5 text-[#ef4444] shrink-0" />
          ) : (
            <Terminal className="w-3.5 h-3.5 text-[#c5a880] shrink-0" />
          )}

          <span className={`uppercase tracking-wider font-semibold shrink-0 ${statusColorClass}`}>
            {statusLabel}
          </span>
          <span className="text-[#3f3f46] shrink-0" aria-hidden="true">·</span>

          <span className="text-[#d4d4d8] truncate">
            {lastEventSummary}
          </span>

          {lastEventTimestamp && (
            <>
              <span className="text-[#3f3f46] hidden sm:inline shrink-0" aria-hidden="true">·</span>
              <span className="text-[#71717a] tabular-nums hidden sm:inline shrink-0">
                {lastEventTimestamp}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8e8d8a] whitespace-nowrap shrink-0">
          <span>{isExpanded ? tx('Günlüğü Gizle', 'Hide Log') : tx('Günlüğü Gör', 'View Log')}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </div>
      </button>

      {/* Expanded Terminal View */}
      {isExpanded && (
        <div className="border-t border-[#222222]">
          {/* Terminal Toolbar */}
          <div className="px-3.5 py-2 bg-[#121212] border-b border-[#1e1e1e] flex items-center justify-between gap-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8e8d8a] tabular-nums">
              {tx('Canlı RSS & Makale Çıkarma Günlüğü', 'Live RSS & Article Extraction Log')} · {entries.length} {tx('adım', 'step(s)')}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopy}
                disabled={entries.length === 0}
                className="px-2.5 py-1 bg-[#181818] hover:bg-[#222222] disabled:opacity-40 border border-[#2a2a2a] rounded text-[11px] font-mono text-[#d4d4d8] hover:text-[#c5a880] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-[#a3e635]" />
                    <span className="text-[#a3e635]">{tx('Kopyalandı', 'Copied')}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{tx('Kopyala', 'Copy')}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClear}
                disabled={entries.length === 0 && status === 'idle'}
                className="px-2.5 py-1 bg-[#181818] hover:bg-[#222222] disabled:opacity-40 border border-[#2a2a2a] rounded text-[11px] font-mono text-[#8e8d8a] hover:text-[#ef4444] transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span>{tx('Temizle', 'Clear')}</span>
              </button>
            </div>
          </div>

          {/* Terminal Output Lines */}
          <div className="p-3.5 bg-[#0a0a0a] max-h-64 overflow-y-auto">
            {entries.length === 0 ? (
              <div className="py-3 text-center text-[11px] font-mono text-[#71717a]">
                {tx(
                  'Gösterilecek çıkarım satırı yok. Canlı RSS adımlarını kaydetmek için bir arama veya hızlı çekme başlatın.',
                  'No extraction log lines to display. Trigger a search or quick pull to record live RSS steps.'
                )}
              </div>
            ) : (
              <ul className="space-y-1.5 text-[11px] font-mono">
                {entries.map((entry, idx) => (
                  <li key={`${entry.timestamp}-${idx}`} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-[#71717a] tabular-nums shrink-0 select-none">
                      [{entry.timestamp}]
                    </span>
                    <span className="text-[#c5a880] shrink-0 select-none">›</span>
                    <span className="text-[#d4d4d8] break-words">{entry.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
