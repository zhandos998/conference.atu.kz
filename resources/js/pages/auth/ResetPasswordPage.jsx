import { useMemo, useState } from 'react';
import api from '../../api/client';
import AppLayout from '../../components/AppLayout';
import { useI18n } from '../../i18n';

export default function ResetPasswordPage({ token, email, onBackToLogin }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    email: email || '',
    password: '',
    password_confirmation: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const missingToken = useMemo(() => !token, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
      });

      setMessage(data.message || t('auth.reset.success'));
    } catch (err) {
      setError(err.response?.data?.message || t('auth.reset.error'));
    }
  };

  return (
    <AppLayout variant="auth" title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')}>
      {missingToken ? (
        <>
          <p className="error-text">{t('auth.reset.missingToken')}</p>
          <button className="btn-secondary" type="button" onClick={onBackToLogin}>{t('auth.reset.back')}</button>
        </>
      ) : (
        <form onSubmit={submit} className="auth-form">
          <div className="field">
            <label>{t('common.email')}</label>
            <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>

          <div className="field">
            <label>{t('auth.reset.newPassword')}</label>
            <input required minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>

          <div className="field">
            <label>{t('auth.reset.confirmPassword')}</label>
            <input required minLength={8} type="password" value={form.password_confirmation} onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })} />
          </div>

          {message && <p>{message}</p>}
          {error && <p className="error-text">{error}</p>}

          <div className="inline-actions">
            <button className="btn-primary" type="submit">{t('auth.reset.submit')}</button>
            <button className="btn-secondary" type="button" onClick={onBackToLogin}>{t('auth.reset.back')}</button>
          </div>
        </form>
      )}
    </AppLayout>
  );
}
