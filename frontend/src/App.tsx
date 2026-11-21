
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import SignInPage from './pages/auth/SignInPage';
import SignUpPage from './pages/auth/SignUpPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import HomePage from './pages/home/HomePage';
import SettingsPage from './pages/settings/SettingsPage';

import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import NotificationContainer from './components/notifications/NotificationContainer';

function App() {
  return (
    <BrowserRouter>
      <NotificationContainer />
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route
            path="/forgot-password"
            element={<ForgotPasswordPage />}
          />
        </Route>

        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route path="/settings" element={<SettingsPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
