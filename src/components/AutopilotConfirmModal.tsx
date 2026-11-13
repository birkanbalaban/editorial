import React from 'react';
import { InstagramAccountConfig } from '../types/editorial';
import { X, Zap, AlertTriangle, Check } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface AutopilotConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  instagram: InstagramAccountConfig;
  isProcessing?: boolean;
}

export const AutopilotConfirmModal: React.FC<AutopilotConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  instagram,
  isProcessing,
}) => {
  const { tx } = useLanguage();

  if (!isOpen) return null;

  const isEligible = instagram.connected && (instagram.accountType === 'BUSINESS' || instagram.accountType === 'CREATOR');

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2e2e2e] rounded-lg w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#222222] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-[#c5a880]" />
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#c5a880] block">
                {tx('Otonom Mod Aktivasyonu', 'Autonomous Mode Activation')}
              </span>
              <h3 className="font-editorial text-2xl text-[#f4f3ef] font-normal">
                {tx('Mod C — Otopilotu Etkinleştir', 'Enable Mode C — Autopilot')}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8e8d8a] hover:text-[#f4f3ef] p-1.5 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs font-sans text-[#a1a1aa] leading-relaxed">
          <div className="p-4 bg-[#181818] rounded border border-[#262626] space-y-2">
            <div className="flex items-center gap-2 text-[#f4f3ef] font-semibold text-xs">
              <AlertTriangle className="w-4 h-4 text-[#c5a880]" />
              <span>{tx('Otonom Yayınlama Bildirimi', 'Autonomous Publishing Notice')}</span>
            </div>
            <p>
              {tx(
                'Otopilot modunda yapay zeka günlük moda editoryal adaylarını otonom olarak değerlendirir, yayın taslaklarını hazırlar ve uygun çalışmaları manuel onay tıklaması gerekmeden planlanan pencerelerde (14:00 & 20:00 Europe/Istanbul) yayınlar.',
                'In Autopilot mode, the AI autonomously evaluates daily fashion editorial candidates, prepares publishing drafts, and publishes eligible works at scheduled windows (14:00 & 20:00 Europe/Istanbul) without requiring manual click approval.'
              )}
            </p>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#222222]">
              <span>{tx('Instagram Profesyonel Hesap:', 'Instagram Professional Account:')}</span>
              <span className={isEligible ? 'text-[#a3e635]' : 'text-[#ef4444]'}>
                {isEligible
                  ? tx(`Bağlı (@${instagram.username})`, `Connected (@${instagram.username})`)
                  : tx('Bağlı Değil', 'Not Connected')}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#222222]">
              <span>{tx('Doğrulanmamış Hak Koruması:', 'Unverified Rights Prevention:')}</span>
              <span className="text-[#a3e635]">{tx('Etkin (%100 Garantili)', 'Enforced (100% Guaranteed)')}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#222222]">
              <span>{tx('Günlük Kota Değişmezi:', 'Daily Limit Invariant:')}</span>
              <span className="text-[#c5a880]">{tx('Maks 2 Gönderi / Gün', 'Max 2 Posts / Day')}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-[#161616] rounded border border-[#222222]">
              <span>{tx('Acil Durdurma Müdahalesi:', 'Emergency Stop Override:')}</span>
              <span className="text-[#f4f3ef]">{tx('Üst Başlıkta Mevcut', 'Available in Header')}</span>
            </div>
          </div>

          {!isEligible && (
            <div className="p-3 bg-[#2a1414] border border-[#522222] rounded text-xs text-[#fca5a5]">
              {tx(
                'Otopilot, doğrulanmış bir Instagram Profesyonel (İşletme veya İçerik Üreticisi) hesabı gerektirir. Otopilotu etkinleştirmeden önce Instagram Adaptörü veya Ayarlar sekmesinden hesabınızı bağlayın.',
                'Autopilot requires a verified Instagram Professional (Business or Creator) account. Please connect your account in the Instagram Adapter tab before activating Autopilot.'
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#222222] flex items-center justify-end gap-3 bg-[#0d0d0d]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#8e8d8a] hover:text-[#f4f3ef] transition cursor-pointer"
          >
            {tx('İptal', 'Cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={!isEligible || isProcessing}
            className="px-5 py-2 bg-[#f4f3ef] text-[#0a0a0a] disabled:opacity-40 text-xs font-semibold uppercase tracking-wider rounded hover:bg-white transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{tx('Onayla ve Otopilotu Etkinleştir', 'Confirm & Enable Autopilot')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

