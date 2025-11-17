import React, { createContext, ReactNode } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';
import enTranslations from '../i18n/en.json';
import mlTranslations from '../i18n/ml.json';

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
  translations: any;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

const allTranslations = {
    en: enTranslations,
    ml: mlTranslations,
};

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<string>('language', 'en');

  const translations = allTranslations[language as keyof typeof allTranslations] || allTranslations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};