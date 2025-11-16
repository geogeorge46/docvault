import { useContext } from 'react';
import { LanguageContext } from '../context/LanguageContext';

const get = (obj: any, path: string, fallback: string = path) => {
  const keys = path.split('.');
  // Use reduce to traverse the path, returning the fallback if a key is not found.
  const result = keys.reduce((acc, key) => (acc && typeof acc === 'object' && acc[key] !== undefined) ? acc[key] : undefined, obj);
  return result !== undefined ? result : fallback;
};


export const useTranslation = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }

  const { language, setLanguage, translations } = context;

  const t = (key: string, options?: { [key: string]: string | number }) => {
    let translation = get(translations, key);
    
    if (options && typeof translation === 'string') {
        Object.keys(options).forEach(optKey => {
            const regex = new RegExp(`{{${optKey}}}`, 'g');
            translation = translation.replace(regex, String(options[optKey]));
        });
    }

    return translation;
  };

  return { t, language, setLanguage };
};
