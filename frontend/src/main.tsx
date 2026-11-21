
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';

import './styles/globals.css';
import './styles/auth.css';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { NotificationProvider } from './context/NotificationContext';

createRoot(document.getElementById('root')!).render(
<StrictMode>
  <ThemeProvider>
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  </ThemeProvider>
</StrictMode>
);
