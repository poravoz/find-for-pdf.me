import type { Language } from '../constants/languages';

export interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}
