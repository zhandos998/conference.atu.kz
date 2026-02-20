import { useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';

export default function LoginPage({ onLogin, onSwitch, infoMessage }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      onLogin(data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка входа');
    }
  };

  return (
    <AppLayout title="Вход" subtitle="Система регистрации участников научной конференции">
      <form onSubmit={submit} className="auth-form">
        {infoMessage && <p style={{ color: '#166534' }}>{infoMessage}</p>}

        <div className="field">
          <label>Email</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="field">
          <label>Пароль</label>
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="inline-actions">
          <button className="btn-primary" type="submit">Войти</button>
          <button className="btn-secondary" type="button" onClick={onSwitch}>Регистрация</button>
        </div>
      </form>
    </AppLayout>
  );
}
