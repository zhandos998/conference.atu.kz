import { useEffect, useState } from 'react';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import UserDashboard from './pages/user/UserDashboard';
import ModeratorDashboard from './pages/moderator/ModeratorDashboard';
import api from './api/client';

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(true);
  const [loginInfo, setLoginInfo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === '1') {
      setMode('login');
      setLoginInfo('Email успешно подтвержден. Выполните вход.');
      params.delete('verified');
      const qs = params.toString();
      const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
    }
  }, []);

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
      setMode('login');
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Загрузка...</div>;
  }

  if (!user) {
    return mode === 'login'
      ? <LoginPage onLogin={setUser} onSwitch={() => setMode('register')} infoMessage={loginInfo} />
      : <RegisterPage onSwitch={() => setMode('login')} />;
  }

  return user.role === 'moderator'
    ? <ModeratorDashboard onLogout={handleLogout} />
    : <UserDashboard onLogout={handleLogout} />;
}
