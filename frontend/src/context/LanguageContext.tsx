import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
  } from 'react';
  
  import { DEFAULT_LANGUAGE, type Language } from '../constants/languages';
  import type { LanguageContextType } from '../types/language.types';
  
  const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
  
  export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(() => {
      const savedLanguage = localStorage.getItem('language');
  
      return savedLanguage === 'uk' || savedLanguage === 'en'
        ? savedLanguage
        : DEFAULT_LANGUAGE;
    });
  
    useEffect(() => {
      document.documentElement.lang = language;
      localStorage.setItem('language', language);
    }, [language]);
  
    return (
      <LanguageContext.Provider value={{ language, setLanguage }}>
        {children}
      </LanguageContext.Provider>
    );
  }
  
  export function useLanguage() {
    const context = useContext(LanguageContext);
  
    if (!context) {
      throw new Error('useLanguage must be used within LanguageProvider');
    }
  
    return context;
  }
  