import { useState, useEffect } from 'react';

type Language = 'en' | 'es' | 'fr' | 'de' | 'tr';

export const useLanguage = () => {
  // Initialize language from localStorage or default to English
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language');
    return (savedLanguage as Language) || 'en';
  });

  // Persist language preference to localStorage
  useEffect(() => {
    localStorage.setItem('language', language);
    // Note: Would typically update i18n configuration here
  }, [language]);

  return { language, setLanguage };
};