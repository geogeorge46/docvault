
import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

const Header: React.FC = () => {
  const { t, language, setLanguage } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ml' : 'en');
  };

  return (
    <header className="bg-white/50 backdrop-blur-sm shadow-md sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">{t('header.title')}</h1>
        </div>
        <div className="flex items-center space-x-4">
          <p className="text-sm text-slate-500 hidden sm:block">{t('header.subtitle')}</p>
          <button
            onClick={toggleLanguage}
            className="px-3 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
          >
            {t('language.toggle')}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;