import { useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { useI18n } from '../../i18n';

export default function LoginPage({ onLogin, onSwitch, onForgotPassword }) {
  const { t } = useI18n();
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
      setError(err.response?.data?.message || t('auth.login.error'));
    }
  };

  return (
    <AppLayout variant="auth" title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <form onSubmit={submit} className="auth-form">
        <div className="field">
          <label>{t('common.email')}</label>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="field">
          <label>{t('common.password')}</label>
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-link" type="button" onClick={onForgotPassword}>{t('auth.login.forgot')}</button>

        {error && <p className="error-text">{error}</p>}

        <div className="inline-actions">
          <button className="btn-primary" type="submit">{t('auth.login.submit')}</button>
          <button className="btn-secondary" type="button" onClick={onSwitch}>{t('auth.login.register')}</button>
        </div>
      </form>
    </AppLayout>
  );
}
