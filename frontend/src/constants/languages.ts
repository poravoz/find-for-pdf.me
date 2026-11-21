export const LANGUAGES = [
    { code: 'uk', name: 'Українська' },
    { code: 'en', name: 'English' },
  ] as const;
  
  export type Language = (typeof LANGUAGES)[number]['code'];
  
  export const DEFAULT_LANGUAGE: Language = 'uk';
  