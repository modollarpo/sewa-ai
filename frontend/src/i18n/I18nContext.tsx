// SEWA XAI — frontend/src/i18n/I18nContext.tsx
import React, { createContext, useContext, useEffect } from 'react';
import { translations, Language, TranslationKey } from './translations';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';

interface I18nContextType {
  t: (key: TranslationKey) => string;
  language: Language;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Languages supported by our translation dictionary
const SUPPORTED_LANGS = new Set<string>(['en', 'fr', 'yo', 'sw', 'ar', 'hi']);
// Right-to-left languages
const RTL_LANGS = new Set<string>(['ar']);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const { lang, setLang } = useSettingsStore();

  // On first load, sync settingsStore with user's saved language preference
  useEffect(() => {
    if (user?.language && SUPPORTED_LANGS.has(user.language)) {
      setLang(user.language);
    }
  }, [user?.language]);

  // Resolve to a supported language — graceful fallback to 'en' for DE/ES/PT etc.
  const resolvedLang: Language = SUPPORTED_LANGS.has(lang) ? (lang as Language) : 'en';
  const isRTL = RTL_LANGS.has(resolvedLang);

  // Apply RTL/LTR direction and lang attribute to <html> for correct font + layout rendering
  useEffect(() => {
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', resolvedLang);
  }, [resolvedLang, isRTL]);

  const t = (key: TranslationKey): string => {
    return translations[resolvedLang]?.[key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ t, language: resolvedLang, isRTL }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within an I18nProvider');
  return context;
};
