import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { OperationMode } from '../types/editorial';

export type UiLanguage = 'tr' | 'en';

const STORAGE_KEY = 'editorial_index_ui_lang';

interface LanguageContextValue {
  lang: UiLanguage;
  setLang: (lang: UiLanguage) => void;
  toggleLang: () => void;
  tx: (trText: string, enText: string) => string;
  formatMode: (mode: OperationMode | string) => string;
  formatPostStatus: (status: string) => string;
  formatRightsStatus: (status: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): UiLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'tr') {
      return saved;
    }
  } catch {
    // Ignore storage access failures
  }
  return 'tr';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<UiLanguage>(getInitialLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage access failures
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((next: UiLanguage) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'tr' ? 'en' : 'tr'));
  }, []);

  const tx = useCallback(
    (trText: string, enText: string) => (lang === 'tr' ? trText : enText),
    [lang]
  );

  const formatMode = useCallback(
    (mode: OperationMode | string) => {
      if (lang === 'en') return mode;
      switch (mode) {
        case 'AUTOPILOT':
          return 'OTOPİLOT';
        case 'APPROVAL':
          return 'ONAYLI';
        case 'MANUAL':
          return 'MANUEL';
        default:
          return mode;
      }
    },
    [lang]
  );

  const formatPostStatus = useCallback(
    (status: string) => {
      if (lang === 'en') {
        if (status === 'selected') return 'In Queue';
        return status;
      }
      switch (status) {
        case 'candidate':
          return 'Aday';
        case 'selected':
          return 'Kuyrukta';
        case 'approved':
          return 'Onaylandı';
        case 'scheduled':
          return 'Planlandı';
        case 'published':
          return 'Yayında';
        case 'saved':
          return 'Kaydedildi';
        case 'rejected':
          return 'Reddedildi';
        default:
          return status;
      }
    },
    [lang]
  );

  const formatRightsStatus = useCallback(
    (status: string) => {
      if (lang === 'en') return status.toUpperCase();
      switch (status) {
        case 'verified':
          return 'DOĞRULANMIŞ';
        case 'pending':
          return 'BEKLEMEDE';
        case 'unlicensed':
          return 'LİSANSSIZ';
        default:
          return status.toUpperCase();
      }
    },
    [lang]
  );

  return (
    <LanguageContext.Provider
      value={{ lang, setLang, toggleLang, tx, formatMode, formatPostStatus, formatRightsStatus }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
