import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
  } from 'react';
  
  import { DEFAULT_THEME, type Theme } from '../constants/themes';
  import type { ThemeContextType } from '../types/theme.types';
  
  const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
  
  export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
      const savedTheme = localStorage.getItem('theme');
  
      return savedTheme ? (savedTheme as Theme) : DEFAULT_THEME;
    });
  
    useEffect(() => {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    }, [theme]);
  
    return (
      <ThemeContext.Provider value={{ theme, setTheme }}>
        {children}
      </ThemeContext.Provider>
    );
  }
  
  export function useTheme() {
    const context = useContext(ThemeContext);
  
    if (!context) {
      throw new Error('useTheme must be used within ThemeProvider');
    }
  
    return context;
  }
  