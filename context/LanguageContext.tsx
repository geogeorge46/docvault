import React, { createContext, useState, useEffect, ReactNode } from 'react';
import useLocalStorage from '../hooks/useLocalStorage';

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
  translations: any;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguage] = useLocalStorage<string>('language', 'en');
  const [translations, setTranslations] = useState({});

  useEffect(() => {
    fetch(`/i18n/${language}.json`)
      .then(response => {
          if (!response.ok) {
              throw new Error(`Could not load ${language}.json`);
          }
          return response.json();
      })
      .then(data => setTranslations(data))
      .catch(error => {
        console.error('Failed to load translations:', error);
        if (language !== 'en') {
            fetch(`/i18n/en.json`)
                .then(res => res.json())
                .then(data => setTranslations(data))
                .catch(err => console.error('Failed to load fallback English translations:', err));
        }
      });
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translations }}>
      {children}
    </LanguageContext.Provider>
  );
};
