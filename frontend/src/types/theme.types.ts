import type { Theme } from '../constants/themes';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}
