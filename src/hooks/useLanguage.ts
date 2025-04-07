import { useState, useEffect } from 'react';

type Language = 'en' | 'es' | 'fr' | 'de' | 'tr';

export const useLanguage = () => {
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language');
    return (savedLanguage as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    // Here you would typically update your i18n configuration
  }, [language]);

  return { language, setLanguage };
};