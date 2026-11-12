import React from 'react';
import { InstagramAccountConfig } from '../types/editorial';
import { InstagramCredentialsCard } from './InstagramCredentialsCard';
import { 
  Instagram, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

interface InstagramAdapterViewProps {
  config: InstagramAccountConfig;
  onConnect: (params: { accessToken?: string; accountId?: string; mockConnected?: boolean }) => Promise<void>;
  onDisconnect: () => Promise<void>;
  isProcessing?: boolean;
}

export const InstagramAdapterView: React.FC<InstagramAdapterViewProps> = ({
  config,
  onConnect,
  onDisconnect,
  isProcessing,
}) => {
  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="border-b border-[#222222] pb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#c5a880] mb-1 font-mono">
          <span>Official Meta Graph API v21.0 Adapter</span>
          <span>·</span>
          <span>Professional Account Publishing</span>
        </div>
        <h1 className="font-editorial text-3xl md:text-4xl text-[#f4f3ef] font-normal tracking-tight">
          Instagram Publishing Adapter
        </h1>
        <p className="text-sm text-[#8e8d8a] mt-1 max-w-2xl font-sans">
          Direct integration via official Meta Graph API. Automated publishing requires an Instagram Business or Creator account connected to a Facebook Page with publishing permissions. Password entry is never required.
        </p>
      </div>

      {/* Reusable In-App Instagram Credentials & Account Card */}
      <InstagramCredentialsCard
        config={config}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        isProcessing={isProcessing}
      />

      {/* Permissions & Eligibility Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-mono block">
            Eligibility Status
          </span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${config.accountType === 'BUSINESS' || config.accountType === 'CREATOR' ? 'bg-[#7cd38b]' : 'bg-[#71717a]'}`} />
            <span className="text-sm font-semibold text-[#f4f3ef]">
              {config.accountType || 'NOT_CONNECTED'}
            </span>
          </div>
          <p className="text-xs text-[#8e8d8a] font-sans">
            Personal accounts cannot publish via Meta API; must be Business or Creator.
          </p>
        </div>

        <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-mono block">
            Verified Scopes
          </span>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex items-center gap-1.5 text-[#d4d4d8]">
              <CheckCircle2 className="w-3 h-3 text-[#7cd38b]" />
              <span>instagram_basic</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#d4d4d8]">
              <CheckCircle2 className="w-3 h-3 text-[#7cd38b]" />
              <span>instagram_content_publish</span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-[#121212] border border-[#222222] rounded space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-[#71717a] font-mono block">
            Token Lifespan
          </span>
          <div className="text-sm font-semibold text-[#f4f3ef] font-mono">
            {config.tokenExpiresAt ? '60-Day Long-Lived Token' : 'N/A'}
          </div>
          <p className="text-xs text-[#8e8d8a] font-sans">
            Refreshes automatically before expiration.
          </p>
        </div>
      </div>

      {/* Meta API Publishing Audit Trail */}
      <div className="space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[#71717a] font-mono">
          Meta Graph API Publishing Audit Trail
        </h2>

        {config.auditTrail.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8e8d8a] bg-[#121212] border border-[#222222] rounded">
            No publishing operations recorded yet.
          </div>
        ) : (
          <div className="bg-[#121212] border border-[#222222] rounded divide-y divide-[#1e1e1e]">
            {config.auditTrail.map((audit) => (
              <div key={audit.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[#f4f3ef] font-medium">{audit.editorialTitle}</span>
                    <span className="text-[#71717a]">·</span>
                    <span className="text-[#8e8d8a]">{new Date(audit.timestamp).toLocaleTimeString('en-GB')}</span>
                    <span className="text-[#71717a]">·</span>
                    <span className="text-[#c5a880] font-mono">{audit.mode} Mode</span>
                  </div>
                  <div className="text-[11px] text-[#71717a] font-mono mt-0.5">
                    Meta Container ID: {audit.metaMediaId}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[#7cd38b] font-mono text-[11px] uppercase">
                    Published
                  </span>
                  {audit.permalink && (
                    <a
                      href={audit.permalink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#8e8d8a] hover:text-[#f4f3ef] transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
