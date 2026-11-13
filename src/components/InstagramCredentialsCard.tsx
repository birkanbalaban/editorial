import React, { useState } from 'react';
import { InstagramAccountConfig } from '../types/editorial';
import { 
  Instagram, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Power, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface InstagramCredentialsCardProps {
  config: InstagramAccountConfig;
  onConnect: (params: { accessToken?: string; accountId?: string; mockConnected?: boolean }) => Promise<void>;
  onDisconnect: () => Promise<void>;
  isProcessing?: boolean;
  compact?: boolean;
}

export const InstagramCredentialsCard: React.FC<InstagramCredentialsCardProps> = ({
  config,
  onConnect,
  onDisconnect,
  isProcessing,
  compact = false,
}) => {
  const { tx } = useLanguage();
  const [showForm, setShowForm] = useState(!config.connected);
  const [tokenInput, setTokenInput] = useState('');
  const [accountIdInput, setAccountIdInput] = useState(config.accountId || '');
  const [showToken, setShowToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  const handleCustomConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!tokenInput.trim() || !accountIdInput.trim()) {
      setErrorMessage(
        tx(
          'Lütfen hem Instagram Hesap Kimliğini hem de System User Access Token bilgisini girin.',
          'Please enter both the Instagram Account ID and the System User Access Token.'
        )
      );
      return;
    }

    try {
      await onConnect({ 
        accessToken: tokenInput.trim(), 
        accountId: accountIdInput.trim() 
      });
      setSuccessNotice(tx('Hesap başarıyla doğrulandı ve bağlandı.', 'Account successfully verified and connected.'));
      setTokenInput('');
      setShowForm(false);
    } catch (err: any) {
      setErrorMessage(err?.message || tx('Bağlantı başarısız oldu. Token izinlerini doğrulayın.', 'Connection failed. Verify token permissions.'));
    }
  };

  const handleDemoConnect = async () => {
    setErrorMessage('');
    setSuccessNotice('');
    try {
      await onConnect({ mockConnected: true });
      setSuccessNotice(tx('Demo Sandbox hesabı başarıyla bağlandı.', 'Demo Sandbox account linked successfully.'));
      setShowForm(false);
    } catch (err: any) {
      setErrorMessage(err?.message || tx('Sandbox bağlantısı başarısız oldu.', 'Sandbox connection failed.'));
    }
  };

  return (
    <div className="p-6 bg-[#121212] border border-[#222222] rounded space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1e1e1e] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#181818] border border-[#262626] rounded-full text-[#c5a880]">
            <Instagram className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-editorial text-lg text-[#f4f3ef] font-normal">
                {config.connected ? `@${config.username}` : tx('Instagram Profesyonel Kimlik Bilgileri', 'Instagram Professional Credentials')}
              </h3>
              {config.connected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-[#122216] border border-[#1e4620] text-[#7cd38b]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7cd38b] animate-pulse" />
                  {tx('BAĞLI', 'CONNECTED')} ({config.accountType})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide bg-[#26180c] border border-[#523318] text-[#e09f58]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#e09f58]" />
                  {tx('İŞLEM GEREKLİ', 'ACTION REQUIRED')}
                </span>
              )}
            </div>
            <p className="text-xs text-[#8e8d8a] font-sans mt-0.5">
              {config.connected 
                ? `${tx('Hesap Kimliği', 'Account ID')}: ${config.accountId || 'ig_biz_verified'} · Meta Graph API v21.0 ${tx('Aktif', 'Active')}` 
                : tx(
                    'Kod veya ortam dosyalarına dokunmadan doğrudan arayüz içinden Instagram kimlik bilgilerini yönetin.',
                    'Manage Instagram credentials directly in the interface without touching code or environment files.'
                  )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {config.connected ? (
            <>
              <button
                type="button"
                onClick={() => setShowForm(!showForm)}
                className="px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222222] border border-[#333333] hover:border-[#c5a880] text-xs font-mono text-[#f4f3ef] rounded transition cursor-pointer"
              >
                {showForm ? tx('Formu Gizle', 'Hide Form') : tx('Hesabı Değiştir / Düzenle', 'Switch / Edit Credentials')}
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-[#241414] hover:bg-[#2f1919] border border-[#4d1f1f] text-[#ef4444] text-xs font-mono uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5"
                title={tx('Bu Instagram hesabının bağlantısını kes', 'Disconnect this Instagram account')}
              >
                <Power className="w-3.5 h-3.5" />
                <span>{tx('Bağlantıyı Kes', 'Disconnect')}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleDemoConnect}
              disabled={isProcessing}
              className="px-4 py-2 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 shadow"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#0a0a0a]" />
              <span>{tx('Demo Sandbox Bağla', 'Connect Demo Sandbox')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Connected Details Badges (when connected) */}
      {config.connected && !showForm && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#161616] border border-[#222222] rounded space-y-1">
            <span className="text-[10px] uppercase text-[#71717a] block">{tx('Hedef Hesap', 'Target Account')}</span>
            <div className="text-[#f4f3ef] font-semibold">@{config.username}</div>
            <div className="text-[11px] text-[#8e8d8a]">ID: {config.accountId}</div>
          </div>

          <div className="p-3 bg-[#161616] border border-[#222222] rounded space-y-1">
            <span className="text-[10px] uppercase text-[#71717a] block">{tx('Aktif İzinler', 'Active Permissions')}</span>
            <div className="flex flex-wrap gap-1 text-[10px] text-[#7cd38b]">
              <span>✓ instagram_basic</span>
              <span>·</span>
              <span>✓ instagram_content_publish</span>
            </div>
            <div className="text-[10px] text-[#8e8d8a]">Meta Graph API v21.0</div>
          </div>

          <div className="p-3 bg-[#161616] border border-[#222222] rounded space-y-1">
            <span className="text-[10px] uppercase text-[#71717a] block">{tx('Token Durumu', 'Token Status')}</span>
            <div className="text-[#7cd38b] font-semibold">{tx('Uzun Ömürlü Doğrulandı', 'Long-Lived Verified')}</div>
            <div className="text-[10px] text-[#8e8d8a]">{tx('Bitiş: 60 Gün Oto-Yenileme', 'Expires: 60-Day Auto-Renew')}</div>
          </div>
        </div>
      )}

      {/* Interactive In-App Credentials Form */}
      {showForm && (
        <div className="p-5 bg-[#0e0e0e] border border-[#262626] rounded space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#c5a880]" />
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#f4f3ef]">
                {config.connected ? tx('Instagram Hesabını Değiştir veya Token Güncelle', 'Switch Instagram Account or Update Token') : tx('Meta Graph API Kimlik Bilgilerini Girin', 'Enter Meta Graph API Credentials')}
              </h4>
            </div>
            <span className="text-[11px] font-mono text-[#8e8d8a]">
              {tx('Yerel veritabanına güvenle kaydedilir', 'Saved securely to local database')}
            </span>
          </div>

          <p className="text-xs text-[#8e8d8a] leading-relaxed">
            {tx(
              'instagram_content_publish kapsamına sahip Meta Developer App System User Token (Sayfa Erişim Tokeni) ve sayısal Instagram Business Hesap Kimliğini girin. Şifre veya kişisel bilgi gerekmez.',
              'Provide your Meta Developer App System User Token (Page Access Token) with instagram_content_publish scope and the numeric Instagram Business Account ID. No password or personal credentials required.'
            )}
          </p>

          {errorMessage && (
            <div className="p-3 bg-[#2a1212] border border-[#4d1f1f] rounded text-xs text-[#fca5a5] flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ef4444]" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3 bg-[#122216] border border-[#1e4620] rounded text-xs text-[#7cd38b] flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#7cd38b]" />
              <span>{successNotice}</span>
            </div>
          )}

          <form onSubmit={handleCustomConnect} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-[#71717a] uppercase mb-1">
                  {tx('Instagram Business Hesap Kimliği', 'Instagram Business Account ID')}
                </label>
                <input
                  type="text"
                  placeholder={tx('ör. 17841400000000000', 'e.g. 17841400000000000')}
                  value={accountIdInput}
                  onChange={(e) => setAccountIdInput(e.target.value)}
                  className="w-full bg-[#181818] border border-[#262626] rounded px-3 py-2 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                  required
                />
                <span className="text-[10px] font-mono text-[#71717a] mt-1 block">
                  {tx('Meta Business Suite > Hesaplar > Instagram hesapları yolundan bulunur.', 'Find in Meta Business Suite > Accounts > Instagram accounts.')}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-mono text-[#71717a] uppercase">
                    {tx('Meta Sistem Kullanıcısı Erişim Tokeni', 'Meta System User Access Token')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="text-[11px] font-mono text-[#8e8d8a] hover:text-[#f4f3ef] flex items-center gap-1 cursor-pointer"
                  >
                    {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showToken ? tx('Gizle', 'Hide') : tx('Göster', 'Reveal')}</span>
                  </button>
                </div>
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder={tx('ör. EAABw...', 'e.g. EAABw...')}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="w-full bg-[#181818] border border-[#262626] rounded px-3 py-2 text-xs text-[#f4f3ef] font-mono focus:outline-none focus:border-[#c5a880]"
                  required
                />
                <span className="text-[10px] font-mono text-[#71717a] mt-1 block">
                  {tx('instagram_content_publish kapsamlı süresiz token.', 'Never-expiring token with instagram_content_publish scope.')}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#f4f3ef] hover:bg-white text-[#0a0a0a] text-xs font-semibold uppercase tracking-wider rounded transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0a0a0a]" />
                  <span>{tx('Doğrula ve Canlı Hesabı Bağla', 'Verify & Connect Live Account')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDemoConnect}
                  disabled={isProcessing}
                  className="px-3.5 py-2 bg-[#1c1c1c] hover:bg-[#262626] border border-[#333333] hover:border-[#c5a880] text-xs font-mono text-[#c5a880] rounded transition cursor-pointer"
                >
                  {tx('Demo / Sandbox Kullan', 'Use Demo / Sandbox')}
                </button>
              </div>

              {config.connected && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-xs font-mono text-[#8e8d8a] hover:text-[#f4f3ef] cursor-pointer"
                >
                  {tx('İptal', 'Cancel')}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
