import { useEffect, useState } from 'react';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import UserDashboard from './pages/user/UserDashboard';
import ModeratorDashboard from './pages/moderator/ModeratorDashboard';
import api from './api/client';

export default function App() {
  const searchParams = new URLSearchParams(window.location.search);
  const isResetMode = searchParams.get('mode') === 'reset-password';

  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(isResetMode ? 'reset-password' : 'login');
  const [resetData, setResetData] = useState({
    token: searchParams.get('token') || '',
    email: searchParams.get('email') || '',
  });
  const [loading, setLoading] = useState(true);

  const setAuthMode = (nextMode, payload = {}) => {
    setMode(nextMode);

    if (nextMode === 'reset-password') {
      const nextResetData = {
        token: payload.token || '',
        email: payload.email || '',
      };
      setResetData(nextResetData);

      const query = new URLSearchParams({
        mode: 'reset-password',
        token: nextResetData.token,
        email: nextResetData.email,
      });
      window.history.replaceState({}, '', `${window.location.pathname}?${query.toString()}`);
      return;
    }

    window.history.replaceState({}, '', window.location.pathname);
  };

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/me');
        setUser(data);
      } catch {
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setAuthMode('login');
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Загрузка...</div>;
  }

  if (!user) {
    if (mode === 'register') {
      return <RegisterPage onSwitch={() => setAuthMode('login')} />;
    }

    if (mode === 'forgot-password') {
      return <ForgotPasswordPage onBackToLogin={() => setAuthMode('login')} />;
    }

    if (mode === 'reset-password') {
      return (
        <ResetPasswordPage
          token={resetData.token}
          email={resetData.email}
          onBackToLogin={() => setAuthMode('login')}
        />
      );
    }

    return (
      <LoginPage
        onLogin={setUser}
        onSwitch={() => setAuthMode('register')}
        onForgotPassword={() => setAuthMode('forgot-password')}
      />
    );
  }

  return user.role === 'moderator'
    ? <ModeratorDashboard onLogout={handleLogout} />
    : <UserDashboard onLogout={handleLogout} />;
}
