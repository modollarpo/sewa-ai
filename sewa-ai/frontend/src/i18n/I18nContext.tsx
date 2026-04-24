// SEWA AI — frontend/src/i18n/I18nContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Language, TranslationKey } from './translations';
import { useAuthStore } from '../store/authStore';

interface I18nContextType {
  t: (key: TranslationKey) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuthStore();
  const [language, setLanguage] = useState<Language>((user?.language as Language) || 'en');

  // Sync language with user profile changes
  useEffect(() => {
    if (user?.language) {
      setLanguage(user.language as Language);
    }
  }, [user?.language]);

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within an I18nProvider');
  return context;
};
