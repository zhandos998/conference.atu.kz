import { useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { useI18n } from '../../i18n';

export default function ForgotPasswordPage({ onBackToLogin }) {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage(data.message || t('auth.forgot.sent'));
    } catch (err) {
      setError(err.response?.data?.message || t('auth.forgot.error'));
    }
  };

  return (
    <AppLayout variant="auth" title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')}>
      <form onSubmit={submit} className="auth-form">
        <div className="field">
          <label>{t('common.email')}</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        {message && <p>{message}</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="inline-actions">
          <button className="btn-primary" type="submit">{t('auth.forgot.submit')}</button>
          <button className="btn-secondary" type="button" onClick={onBackToLogin}>{t('auth.forgot.back')}</button>
        </div>
      </form>
    </AppLayout>
  );
}
